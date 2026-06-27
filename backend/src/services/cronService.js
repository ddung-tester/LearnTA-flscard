/**
 * cronService.js — Cron job gửi email nhắc học hàng ngày.
 *
 * Chạy lúc 20:00 giờ Việt Nam (UTC+7) = 13:00 UTC
 * Cron expression: "0 13 * * *"
 */
const cron = require("node-cron");
const { sendDailyReminders } = require("./reminderService");

let cronTask = null;

function startCron() {
  if (cronTask) return; // Đã chạy rồi

  // 13:00 UTC = 20:00 Vietnam (UTC+7)
  cronTask = cron.schedule("0 13 * * *", async () => {
    console.info("[cron] Running daily reminder job...");
    try {
      const result = await sendDailyReminders();
      console.info(`[cron] Reminder job done:`, result);
    } catch (err) {
      console.error("[cron] Reminder job failed:", err?.message);
    }
  });

  console.info("[cron] Daily reminder scheduled at 20:00 Vietnam time (13:00 UTC)");
}

function stopCron() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
}

module.exports = { startCron, stopCron };
