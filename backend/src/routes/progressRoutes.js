const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const progressController = require("../controllers/progressController");
const { optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/cards/:cardId/progress",
  optionalAuth,
  asyncHandler(progressController.getCardProgress)
);
router.patch(
  "/cards/:cardId/progress",
  optionalAuth,
  asyncHandler(progressController.updateCardProgress)
);
router.get(
  "/decks/:deckId/progress-summary",
  optionalAuth,
  asyncHandler(progressController.getDeckProgressSummary)
);

module.exports = router;
