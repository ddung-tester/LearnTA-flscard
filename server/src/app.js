const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Database connection test
app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS result");
    res.json({ status: "ok", database: "connected", result: rows[0].result });
  } catch (err) {
    console.error("Database connection error:", err.message);
    res.status(500).json({ status: "error", message: "Cannot connect to database" });
  }
});

module.exports = app;
