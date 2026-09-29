const express = require("express");
const { rateLimit } = require("express-rate-limit");
const asyncHandler = require("../utils/asyncHandler");
const courseController = require("../controllers/courseController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Lời giải thích đã có trong cache không gọi Gemini, nhưng vẫn giới hạn để tránh bấm liên tục
const aiExplainLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Bạn hỏi AI hơi nhiều, thử lại sau ít phút nhé" },
});

// Soạn trước: tối đa ~2 câu/lượt hiện câu hỏi; câu đã soạn đủ không gọi AI
const aiPrepareLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Soạn trước quá nhiều, thử lại sau ít phút" },
});

router.get("/courses", requireAuth, asyncHandler(courseController.listCourses));
router.get(
  "/courses/:courseId/lessons/:lessonNumber",
  requireAuth,
  asyncHandler(courseController.getLesson)
);
router.get("/course-questions/due", requireAuth, asyncHandler(courseController.listDueQuestions));
router.get(
  "/course-questions/:questionId/audio",
  requireAuth,
  asyncHandler(courseController.getQuestionAudio)
);
router.post(
  "/course-questions/:questionId/answer",
  requireAuth,
  asyncHandler(courseController.answerQuestion)
);
// Soạn trước lời giải thích khi câu hỏi vừa hiện (câu hiện tại + câu kế tiếp)
router.post(
  "/course-questions/:questionId/prepare",
  requireAuth,
  aiPrepareLimiter,
  asyncHandler(courseController.prepareQuestion)
);
router.post(
  "/course-questions/:questionId/explain",
  requireAuth,
  aiExplainLimiter,
  asyncHandler(courseController.explainQuestion)
);

module.exports = router;
