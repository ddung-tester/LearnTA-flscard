const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { z } = require("zod");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

const MAX_HISTORY_MESSAGES = 20;

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

const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
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

/**
 * POST /api/chat
 * Body: { messages: [{ role: "user"|"model", parts: [{ text }] }] }
 * Không yêu cầu auth — open endpoint, giới hạn bằng chatLimiter.
 */
router.post("/", chatLimiter, async (req, res, next) => {
  try {
    const parsed = chatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "messages không hợp lệ" });
    }

    const { messages: allMessages } = parsed.data;
    if (allMessages[allMessages.length - 1].role !== "user") {
      return res.status(400).json({ message: "Tin nhắn cuối phải là của user" });
    }
    const messages = trimHistory(allMessages);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "AI service chưa được cấu hình" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Tách tin nhắn cuối (user) và lịch sử trước đó
    const history = messages.slice(0, -1);
    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
