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

router.get("/courses", requireAuth, asyncHandler(courseController.listCourses));
router.get(
  "/courses/:courseId/lessons/:lessonNumber",
  requireAuth,
  asyncHandler(courseController.getLesson)
);
router.post(
  "/course-questions/:questionId/explain",
  requireAuth,
  aiExplainLimiter,
  asyncHandler(courseController.explainQuestion)
);

module.exports = router;
