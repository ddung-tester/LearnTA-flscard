const express = require("express");
const { rateLimit } = require("express-rate-limit");
const asyncHandler = require("../utils/asyncHandler");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Thử quá nhiều lần, vui lòng đợi 15 phút" },
});

router.post("/register", authLimiter, asyncHandler(authController.register));
router.post("/login", authLimiter, asyncHandler(authController.login));
router.post("/google", authLimiter, asyncHandler(authController.googleAuth));
router.get("/me", requireAuth, asyncHandler(authController.me));

module.exports = router;
