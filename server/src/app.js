const express = require("express");
const cors = require("cors");
const ketNoi = require("./config/db");

const ungDung = express();

// Middleware
ungDung.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
ungDung.use(express.json());

// Health check
ungDung.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Kiem tra ket noi database
ungDung.get("/api/db-test", async (req, res) => {
  try {
    const [ketQua] = await ketNoi.query("SELECT 1 AS result");
    res.json({ status: "ok", database: "connected", result: ketQua[0].result });
  } catch (loi) {
    console.error("Database connection error:", loi.message);
    res.status(500).json({ status: "error", message: "Cannot connect to database" });
  }
});

module.exports = ungDung;
