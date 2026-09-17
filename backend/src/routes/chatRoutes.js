const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

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
 * Không yêu cầu auth — open endpoint.
 */
router.post("/", async (req, res, next) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "AI service chưa được cấu hình" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
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
