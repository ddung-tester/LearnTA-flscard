const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const cardController = require("../controllers/cardController");
const { optionalAuth, requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

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

module.exports = router;
