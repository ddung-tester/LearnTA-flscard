const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const roadmapController = require("../controllers/roadmapController");
const { optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", optionalAuth, asyncHandler(roadmapController.listRoadmaps));
router.get("/:slug", optionalAuth, asyncHandler(roadmapController.getRoadmap));

module.exports = router;
