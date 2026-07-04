const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const { corsOrigins } = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const deckRoutes = require("./routes/deckRoutes");
const cardRoutes = require("./routes/cardRoutes");
const studyRoutes = require("./routes/studyRoutes");
const progressRoutes = require("./routes/progressRoutes");
const userRoutes = require("./routes/userRoutes");
const cronRoutes = require("./routes/cronRoutes");
const { startCron } = require("./services/cronService");

const app = express();
const allowedCorsOrigins = new Set(corsOrigins);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (allowedCorsOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/db-test", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS result");

    res.json({
      status: "ok",
      database: "connected",
      result: rows[0].result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/decks", deckRoutes);
app.use("/api", cardRoutes);
app.use("/api", studyRoutes);
app.use("/api", progressRoutes);
app.use("/api/user", userRoutes);
app.use("/api/cron", cronRoutes);

// Khởi động cron job nhắc học (backup — primary trigger là Cloud Scheduler HTTP)
startCron();

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : err.message,
  });
});

module.exports = app;
