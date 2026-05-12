const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const progressController = require("../controllers/progressController");

const router = express.Router();

router.get("/cards/:cardId/progress", asyncHandler(progressController.getCardProgress));
router.patch(
  "/cards/:cardId/progress",
  asyncHandler(progressController.updateCardProgress)
);
router.get(
  "/decks/:deckId/progress-summary",
  asyncHandler(progressController.getDeckProgressSummary)
);

module.exports = router;
