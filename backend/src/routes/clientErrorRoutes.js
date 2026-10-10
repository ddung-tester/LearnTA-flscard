/**
 * clientErrorRoutes.js — nhận lỗi xảy ra trên máy người dùng (lỗi JS, trang trắng, API 5xx)
 * và ghi vào log Cloud Run (structured logging, severity ERROR). Không lưu DB.
 * Xem: gcloud logging read 'jsonPayload.message="client_error"' --limit 50
 */
const express = require("express");
const { rateLimit } = require("express-rate-limit");

const router = express.Router();

const SO_LOI_TOI_DA = 10;

const gioiHan = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

function cat(value, doDai) {
  return typeof value === "string" ? value.slice(0, doDai) : undefined;
}

router.post("/", gioiHan, (req, res) => {
  const ds = Array.isArray(req.body?.errors) ? req.body.errors.slice(0, SO_LOI_TOI_DA) : [];
  for (const loi of ds) {
    if (!loi || typeof loi !== "object") continue;
    console.error(
      JSON.stringify({
        severity: "ERROR",
        message: "client_error",
        kieu: cat(loi.kieu, 40),
        noiDung: cat(loi.noiDung, 500),
        stack: cat(loi.stack, 2000),
        // Chỉ đường dẫn, bỏ query (có thể chứa nội dung tìm kiếm)
        trang: cat(loi.trang, 200)?.split("?")[0],
        banBuild: cat(loi.banBuild, 40),
        trinhDuyet: cat(req.get("user-agent"), 200),
      })
    );
  }
  res.status(204).end();
});

module.exports = router;
