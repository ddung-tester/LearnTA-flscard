const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { z } = require("zod");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pool = require("../config/db");
const { optionalAuth } = require("../middleware/authMiddleware");
const { buildChatContext } = require("../services/chatContextService");
const { THINKING_TOI_THIEU } = require("../services/aiService");
const { ghiNhanLoi, xepTheoLuot } = require("../services/luotGemini");

const router = express.Router();

const MAX_HISTORY_MESSAGES = 20;

// Model quá tải (503), hết lượt (429) hoặc chậm quá THOI_HAN_CHAT_MS thì chuyển model kế tiếp;
// mỗi model có hạn mức miễn phí riêng. Đo 2026-09-29: flash-lite ~1.3s ổn định, còn các bản flash
// ở gói miễn phí lúc 1.5s lúc 26s → flash-lite trước, flash (thinking "minimal") làm dự phòng.
const TOKEN_CHAT_TOI_DA = 600;
const CHAT_MODELS = [
  { model: "gemini-flash-lite-latest" },
  { model: "gemini-3.6-flash", generationConfig: THINKING_TOI_THIEU },
  { model: "gemini-3.5-flash", generationConfig: THINKING_TOI_THIEU },
  { model: "gemini-3.1-flash-lite" },
];
const THOI_HAN_CHAT_MS = 10000;
const LOI_TAM_THOI = new Set([429, 500, 503]);

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Bạn gửi quá nhanh, thử lại sau ít phút nhé" },
});

const messageSchema = z.object({
  role: z.enum(["user", "model"]),
  parts: z.array(z.object({ text: z.string().min(1).max(2000) })).length(1),
});

const idSchema = z.coerce.number().int().positive().nullish();

const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  context: z.object({ deckId: idSchema, cardId: idSchema }).optional(),
});

/**
 * Giữ MAX_HISTORY_MESSAGES tin gần nhất và bỏ các tin "model" ở đầu
 * (Gemini yêu cầu history bắt đầu bằng "user", widget luôn gửi lời chào trước).
 */
function trimHistory(messages) {
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  const firstUserIndex = recent.findIndex((msg) => msg.role === "user");
  return recent.slice(firstUserIndex);
}

const SYSTEM_INSTRUCTION = `You are LearnBot, a friendly English learning assistant for Vietnamese learners.
Your role:
- Answer questions about English grammar, vocabulary, pronunciation, and usage
- Give clear, simple explanations with examples
- Respond in Vietnamese when the user writes in Vietnamese, in English when they write in English
- Keep answers concise (max 200 words) unless a detailed explanation is explicitly needed
- Use emoji occasionally to be friendly 😊
- If asked about unrelated topics, politely redirect to English learning`;

async function traLoiChat(genAI, { systemInstruction, history, text }) {
  let loiCuoi;
  for (const mucModel of xepTheoLuot(CHAT_MODELS)) {
    try {
      const model = genAI.getGenerativeModel(
        {
          model: mucModel.model,
          generationConfig: { maxOutputTokens: TOKEN_CHAT_TOI_DA, ...mucModel.generationConfig },
          systemInstruction,
        },
        { timeout: THOI_HAN_CHAT_MS }
      );
      const result = await model.startChat({ history }).sendMessage(text);
      return result.response.text();
    } catch (error) {
      ghiNhanLoi(mucModel, error);
      loiCuoi = error;
    }
  }
  throw loiCuoi;
}

/**
 * POST /api/chat
 * Body: { messages: [{ role: "user"|"model", parts: [{ text }] }], context?: { deckId?, cardId? } }
 * Không yêu cầu auth — open endpoint, giới hạn bằng chatLimiter.
 * Có token → thêm các từ hay sai của user vào ngữ cảnh.
 */
router.post("/", chatLimiter, optionalAuth, async (req, res, next) => {
  try {
    const parsed = chatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "messages không hợp lệ" });
    }

    const { messages: allMessages, context = {} } = parsed.data;
    if (allMessages[allMessages.length - 1].role !== "user") {
      return res.status(400).json({ message: "Tin nhắn cuối phải là của user" });
    }
    const messages = trimHistory(allMessages);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "AI service chưa được cấu hình" });
    }

    const learnerContext = await buildChatContext(pool, {
      userId: req.user?.id ?? null,
      deckId: context.deckId,
      cardId: context.cardId,
    });

    // Tách tin nhắn cuối (user) và lịch sử trước đó
    const history = messages.slice(0, -1);
    const lastMessage = messages[messages.length - 1];

    let reply;
    try {
      reply = await traLoiChat(new GoogleGenerativeAI(apiKey), {
        systemInstruction: SYSTEM_INSTRUCTION + learnerContext,
        history,
        text: lastMessage.parts[0].text,
      });
    } catch (error) {
      // Mọi model đều quá tải: báo rõ để người dùng thử lại, không phải lỗi 500 chung chung
      if (LOI_TAM_THOI.has(error.status)) {
        return res.status(503).json({ message: "LearnBot đang bận một chút, bạn thử lại sau vài giây nhé." });
      }
      throw error;
    }

    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.traLoiChat = traLoiChat;
module.exports.CHAT_MODELS = CHAT_MODELS;
