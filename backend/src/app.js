const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const { corsOrigins } = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const deckRoutes = require("./routes/deckRoutes");
const cardRoutes = require("./routes/cardRoutes");
const studyRoutes = require("./routes/studyRoutes");
const progressRoutes = require("./routes/progressRoutes");
const mistakeRoutes = require("./routes/mistakeRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const userRoutes = require("./routes/userRoutes");
const cronRoutes = require("./routes/cronRoutes");

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
app.use((req, res, next) => {
  if (
    !req.path.startsWith("/api/cron/") &&
    ["POST", "PUT", "PATCH"].includes(req.method) &&
    (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
  ) {
    return res.status(400).json({ message: "Request body phai la JSON object" });
  }

  next();
});

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
app.use("/api", mistakeRoutes);
app.use("/api", reviewRoutes);
app.use("/api/user", userRoutes);
app.use("/api/cron", cronRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  let statusCode = err.statusCode || err.status || 500;
  if (err.code === "ER_DUP_ENTRY") statusCode = 409;
  if (err.code === "ER_DATA_TOO_LONG" || err.code === "WARN_DATA_TRUNCATED") {
    statusCode = 400;
  }

  const safeClientMessage =
    err.code === "ER_DUP_ENTRY"
      ? "Du lieu da ton tai"
      : err.code === "ER_DATA_TOO_LONG" || err.code === "WARN_DATA_TRUNCATED"
        ? "Du lieu vuot qua gioi han cho phep"
        : err.message;

  res.status(statusCode).json({
    message: statusCode >= 500 ? "Internal server error" : safeClientMessage,
  });
});

module.exports = app;
