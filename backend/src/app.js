const express = require("express");
const cors = require("cors");
const compression = require("compression");
const { logRequestCham } = require("./middleware/logRequestCham");
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
const chatRoutes = require("./routes/chatRoutes");
const roadmapRoutes = require("./routes/roadmapRoutes");
const courseRoutes = require("./routes/courseRoutes");
const clientErrorRoutes = require("./routes/clientErrorRoutes");

const app = express();
// Cloud Run đứng sau 1 proxy — cần để rate limit đọc đúng IP client
app.set("trust proxy", 1);
app.use(logRequestCham);
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
    // Trình duyệt nhớ kết quả preflight: request có token không phải hỏi OPTIONS lại mỗi lần
    // (mỗi preflight là thêm một vòng mạng, rất chậm trên điện thoại). Chrome tối đa 2 giờ.
    maxAge: 7200,
  })
);
// Nén JSON (danh sách thẻ/tiến độ ~90 KB/trang). Luồng giải thích AI đặt no-transform,
// audio không thuộc loại nén được → bộ lọc mặc định tự bỏ qua, vẫn gửi dần như cũ.
app.use(compression());
app.use(express.json());
app.use((req, res, next) => {
  // POST không gửi body (vd. /course-questions/:id/prepare) coi như {} — trước đây bị trả 400 nên
  // app chưa bao giờ soạn trước được lời giải thích AI. Body JSON không phải object vẫn bị từ chối.
  const khongCoBody = !Number(req.headers["content-length"]) && !req.headers["transfer-encoding"];
  if (req.body === undefined && khongCoBody) req.body = {};
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
app.use("/api/chat", chatRoutes);
app.use("/api/roadmaps", roadmapRoutes);
app.use("/api", courseRoutes);
app.use("/api/client-errors", clientErrorRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent || res.destroyed) return next(err);

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
