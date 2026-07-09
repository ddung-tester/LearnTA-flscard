const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const reviewController = require("../controllers/reviewController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/reviews/due", requireAuth, asyncHandler(reviewController.listDueReviews));
router.get("/reviews", requireAuth, asyncHandler(reviewController.listReviews));
router.post("/reviews", requireAuth, asyncHandler(reviewController.createReview));
router.post(
  "/reviews/bulk",
  requireAuth,
  asyncHandler(reviewController.bulkUpsertReviews)
);
router.patch(
  "/reviews/:reviewId/result",
  requireAuth,
  asyncHandler(reviewController.updateReviewResult)
);
router.patch(
  "/reviews/by-card/:cardId/result",
  requireAuth,
  asyncHandler(reviewController.updateReviewResultByCard)
);

module.exports = router;
