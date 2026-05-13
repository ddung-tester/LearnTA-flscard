const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const deckController = require("../controllers/deckController");
const { optionalAuth, requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(deckController.listDecks));
router.get("/:deckId", optionalAuth, asyncHandler(deckController.getDeck));
router.post("/", requireAuth, asyncHandler(deckController.createDeck));
router.put("/:deckId", requireAuth, asyncHandler(deckController.updateDeck));
router.delete("/:deckId", requireAuth, asyncHandler(deckController.deleteDeck));

module.exports = router;
