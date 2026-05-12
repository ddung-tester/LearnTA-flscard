const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const deckRoutes = require("./routes/deckRoutes");
const cardRoutes = require("./routes/cardRoutes");
const studyRoutes = require("./routes/studyRoutes");
const progressRoutes = require("./routes/progressRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
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

app.use("/api/decks", deckRoutes);
app.use("/api", cardRoutes);
app.use("/api", studyRoutes);
app.use("/api", progressRoutes);

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
