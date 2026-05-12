const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const cardController = require("../controllers/cardController");

const router = express.Router();

router.get("/decks/:deckId/cards", asyncHandler(cardController.listCardsByDeck));
router.post("/decks/:deckId/cards", asyncHandler(cardController.createCard));
router.post(
  "/decks/:deckId/cards/import",
  asyncHandler(cardController.importCards)
);
router.put("/cards/:cardId", asyncHandler(cardController.updateCard));
router.patch(
  "/cards/:cardId/favorite",
  asyncHandler(cardController.toggleFavorite)
);
router.delete("/cards/:cardId", asyncHandler(cardController.deleteCard));

module.exports = router;
