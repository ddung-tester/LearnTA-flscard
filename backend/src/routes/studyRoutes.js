const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const studyController = require("../controllers/studyController");
const { optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/study-sessions",
  optionalAuth,
  asyncHandler(studyController.createStudySession)
);
router.patch(
  "/study-sessions/:sessionId/finish",
  optionalAuth,
  asyncHandler(studyController.finishStudySession)
);
router.post(
  "/study-sessions/:sessionId/answers",
  optionalAuth,
  asyncHandler(studyController.addStudyAnswers)
);
router.post(
  "/quiz-results",
  optionalAuth,
  asyncHandler(studyController.createQuizResult)
);
router.get(
  "/decks/:deckId/quiz-results/latest",
  optionalAuth,
  asyncHandler(studyController.getLatestQuizResult)
);

module.exports = router;
