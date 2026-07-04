/**
 * cronRoutes.js — HTTP endpoints để Google Cloud Scheduler gọi.
 *
 * Bảo mật bằng CRON_SECRET (header X-Cron-Secret).
 *
 * POST /api/cron/daily-reminders — 23:00 VN — nhắc user CHƯA học
 * POST /api/cron/praise          — 18:00 VN — khen user ĐÃ học
 */

const express = require("express");
const { sendDailyReminders, sendPraiseEmails } = require("../services/reminderService");

const router = express.Router();

function verifyCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[cronRoutes] CRON_SECRET chưa cấu hình — endpoint không được bảo vệ!");
    return next();
  }
  const provided = req.headers["x-cron-secret"];
  if (!provided || provided !== secret) {
    console.warn("[cronRoutes] Unauthorized cron request — sai secret.");
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/**
 * POST /api/cron/daily-reminders
 * Cloud Scheduler gọi lúc 23:00 VN (16:00 UTC) — nhắc user CHƯA học hôm nay.
 */
router.post("/daily-reminders", verifyCronSecret, async (req, res) => {
  console.info("[cronRoutes] Daily reminder triggered.");
  try {
    const result = await sendDailyReminders();
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cronRoutes] Reminder error:", err?.message);
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

/**
 * POST /api/cron/praise
 * Cloud Scheduler gọi lúc 18:00 VN (11:00 UTC) — khen/động viên user ĐÃ học hôm nay.
 */
router.post("/praise", verifyCronSecret, async (req, res) => {
  console.info("[cronRoutes] Praise email triggered.");
  try {
    const result = await sendPraiseEmails();
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cronRoutes] Praise error:", err?.message);
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

module.exports = router;
