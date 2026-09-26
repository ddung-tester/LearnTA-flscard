const express = require("express");
const { rateLimit } = require("express-rate-limit");
const asyncHandler = require("../utils/asyncHandler");
const cardController = require("../controllers/cardController");
const { optionalAuth, requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Mỗi lần tạo từ bằng AI tốn một lượt gọi Gemini
const aiWordsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Bạn đã tạo từ bằng AI nhiều lần, thử lại sau ít phút nhé" },
});

router.get(
  "/decks/:deckId/cards",
  optionalAuth,
  asyncHandler(cardController.listCardsByDeck)
);
router.post(
  "/decks/:deckId/cards",
  requireAuth,
  asyncHandler(cardController.createCard)
);
router.post(
  "/decks/:deckId/cards/import",
  requireAuth,
  asyncHandler(cardController.importCards)
);
router.patch(
  "/decks/:deckId/cards/reorder",
  requireAuth,
  asyncHandler(cardController.reorderCards)
);
router.put("/cards/:cardId", requireAuth, asyncHandler(cardController.updateCard));
router.patch(
  "/cards/:cardId/favorite",
  requireAuth,
  asyncHandler(cardController.toggleFavorite)
);
router.delete(
  "/cards/:cardId",
  requireAuth,
  asyncHandler(cardController.deleteCard)
);
router.post(
  "/cards/generate-examples",
  requireAuth,
  asyncHandler(cardController.generateCardExamples)
);
router.post(
  "/cards/generate-words",
  requireAuth,
  aiWordsLimiter,
  asyncHandler(cardController.generateVocabularyCards)
);

module.exports = router;
