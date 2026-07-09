const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const mistakeController = require("../controllers/mistakeController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/mistakes", requireAuth, asyncHandler(mistakeController.listMistakes));
router.post("/mistakes", requireAuth, asyncHandler(mistakeController.createMistake));
router.post(
  "/mistakes/bulk",
  requireAuth,
  asyncHandler(mistakeController.bulkUpsertMistakes)
);
router.patch(
  "/mistakes/:mistakeId",
  requireAuth,
  asyncHandler(mistakeController.updateMistake)
);
router.delete(
  "/mistakes/:mistakeId",
  requireAuth,
  asyncHandler(mistakeController.deleteMistake)
);
router.delete("/mistakes", requireAuth, asyncHandler(mistakeController.clearMistakes));

module.exports = router;
