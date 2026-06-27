const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  getUserStats,
  getUserSettings,
  updateUserSettings,
} = require("../controllers/userController");

const router = express.Router();

router.get("/stats", requireAuth, asyncHandler(getUserStats));
router.get("/settings", requireAuth, asyncHandler(getUserSettings));
router.patch("/settings", requireAuth, asyncHandler(updateUserSettings));

module.exports = router;
