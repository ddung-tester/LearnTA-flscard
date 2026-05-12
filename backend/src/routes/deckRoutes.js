const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const deckController = require("../controllers/deckController");

const router = express.Router();

router.get("/", asyncHandler(deckController.listDecks));
router.get("/:deckId", asyncHandler(deckController.getDeck));
router.post("/", asyncHandler(deckController.createDeck));
router.put("/:deckId", asyncHandler(deckController.updateDeck));
router.delete("/:deckId", asyncHandler(deckController.deleteDeck));

module.exports = router;
