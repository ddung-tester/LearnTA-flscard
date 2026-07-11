require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");
const { startCron } = require("./services/cronService");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";

async function startServer() {
  try {
    await pool.query("SELECT 1");

    app.listen(PORT, HOST, () => {
      console.log(`Server running on port ${PORT}`);

      // Cloud Scheduler is the production default. Internal cron is opt-in so
      // multiple Cloud Run instances cannot send duplicate reminder batches.
      if (process.env.ENABLE_INTERNAL_CRON === "true") {
        startCron();
      }
    });
  } catch (error) {
    console.error("Failed to connect to database:", error.message);
    process.exit(1);
  }
}

startServer();
