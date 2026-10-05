const pool = require("../config/db");
const { cleanText, createHttpError, parseBoolean } = require("../utils/http");
const { currentUserId } = require("./deckController");

// Cài đặt theo tài khoản (giao diện, âm thanh, cài đặt học) — đủ rộng cho mọi chế độ, chặn gửi rác cỡ lớn
const PREFERENCES_MAX_BYTES = 16 * 1024;

/**
 * GET /api/user/stats
 * Trả về thống kê streak + xp của user đang đăng nhập.
 */
async function getUserStats(req, res) {
  const userId = currentUserId(req);
  if (!userId) throw createHttpError(401, "Cần đăng nhập");

  const [rows] = await pool.query(
    `SELECT current_streak, longest_streak, last_study_date, total_xp
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );

  const user = rows[0];
  if (!user) throw createHttpError(404, "Người dùng không tồn tại");

  res.json({
    current_streak: user.current_streak || 0,
    longest_streak: user.longest_streak || 0,
    last_study_date: user.last_study_date || null,
    total_xp: user.total_xp || 0,
  });
}

/**
 * GET /api/user/settings
 * Trả về settings của user (bao gồm email_reminders).
 */
async function getUserSettings(req, res) {
  const userId = currentUserId(req);
  if (!userId) throw createHttpError(401, "Cần đăng nhập");

  const [rows] = await pool.query(
    `SELECT default_direction, only_favorite, random_order,
            reward_enabled, reward_trigger_count, email_reminders, preferences
     FROM user_settings WHERE user_id = ? LIMIT 1`,
    [userId]
  );

  // Trả về defaults nếu chưa có row
  const settings = rows[0] ?? {};
  res.json({
    default_direction: settings.default_direction ?? "vi-en",
    only_favorite: Boolean(settings.only_favorite ?? false),
    random_order: Boolean(settings.random_order ?? false),
    reward_enabled: Boolean(settings.reward_enabled ?? false),
    reward_trigger_count: settings.reward_trigger_count ?? 10,
    email_reminders: settings.email_reminders !== undefined
      ? Boolean(settings.email_reminders)
      : true, // default bật
    preferences: settings.preferences ?? null,
  });
}

/**
 * PATCH /api/user/settings
 * Cập nhật một hoặc nhiều trường settings, bao gồm email_reminders.
 */
async function updateUserSettings(req, res) {
  const userId = currentUserId(req);
  if (!userId) throw createHttpError(401, "Cần đăng nhập");

  const updates = {};

  if (req.body.default_direction !== undefined) {
    const direction = cleanText(req.body.default_direction);
    if (!new Set(["en-vi", "vi-en"]).has(direction)) {
      throw createHttpError(400, "default_direction khong hop le");
    }
    updates.default_direction = direction;
  }

  for (const key of [
    "only_favorite",
    "random_order",
    "reward_enabled",
    "email_reminders",
  ]) {
    if (req.body[key] !== undefined) {
      updates[key] = parseBoolean(req.body[key]);
    }
  }

  if (req.body.reward_trigger_count !== undefined) {
    const triggerCount = Number(req.body.reward_trigger_count);
    if (!Number.isInteger(triggerCount) || triggerCount < 1 || triggerCount > 1000) {
      throw createHttpError(400, "reward_trigger_count phai tu 1 den 1000");
    }
    updates.reward_trigger_count = triggerCount;
  }

  // preferences: chỉ gửi phần đổi, server gộp vào bản đã lưu (khoá gửi null sẽ bị xoá)
  let preferencesJson = null;
  if (req.body.preferences !== undefined) {
    const preferences = req.body.preferences;
    if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) {
      throw createHttpError(400, "preferences phai la object");
    }
    preferencesJson = JSON.stringify(preferences);
    if (Buffer.byteLength(preferencesJson) > PREFERENCES_MAX_BYTES) {
      throw createHttpError(400, "preferences qua lon");
    }
  }

  if (Object.keys(updates).length === 0 && preferencesJson === null) {
    return res.status(400).json({ message: "Không có trường nào để cập nhật" });
  }

  const columns = Object.keys(updates);
  const placeholders = columns.map(() => "?");
  const setClauses = columns.map((key) => `${key} = ?`);
  const values = Object.values(updates);
  if (preferencesJson !== null) {
    columns.push("preferences");
    placeholders.push("CAST(? AS JSON)");
    setClauses.push("preferences = JSON_MERGE_PATCH(COALESCE(preferences, JSON_OBJECT()), CAST(? AS JSON))");
    values.push(preferencesJson);
  }

  await pool.execute(
    `INSERT INTO user_settings (user_id, ${columns.join(", ")})
     VALUES (?, ${placeholders.join(", ")})
     ON DUPLICATE KEY UPDATE ${setClauses.join(", ")}`,
    [userId, ...values, ...values]
  );

  // Trả lại settings mới
  await getUserSettings(req, res);
}

module.exports = { getUserStats, getUserSettings, updateUserSettings };
