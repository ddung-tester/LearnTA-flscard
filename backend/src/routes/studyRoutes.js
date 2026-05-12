const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const studyController = require("../controllers/studyController");

const router = express.Router();

router.post("/study-sessions", asyncHandler(studyController.createStudySession));
router.patch(
  "/study-sessions/:sessionId/finish",
  asyncHandler(studyController.finishStudySession)
);
router.post(
  "/study-sessions/:sessionId/answers",
  asyncHandler(studyController.addStudyAnswers)
);
router.post("/quiz-results", asyncHandler(studyController.createQuizResult));
router.get(
  "/decks/:deckId/quiz-results/latest",
  asyncHandler(studyController.getLatestQuizResult)
);

module.exports = router;
