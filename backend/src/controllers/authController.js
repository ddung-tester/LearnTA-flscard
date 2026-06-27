const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../config/db");
const { getJwtSecret, getGoogleClientId, jwtExpiresIn } = require("../config/env");
const { cleanText, createHttpError } = require("../utils/http");
const { sendWelcomeEmail } = require("../services/emailService");


const SALT_ROUNDS = 10;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u;

function normalizeUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    fullname: row.fullname,
    email: row.email,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
    },
    getJwtSecret(),
    { expiresIn: jwtExpiresIn }
  );
}

function validateDisplayName(value) {
  const displayName = cleanText(value).replace(/\s+/g, " ");
  if (
    displayName.length < 2 ||
    displayName.length > 50 ||
    !DISPLAY_NAME_PATTERN.test(displayName)
  ) {
    throw createHttpError(
      400,
      "Họ và tên cần 2-50 ký tự, chỉ gồm chữ cái, khoảng trắng và dấu tên hợp lệ"
    );
  }

  return displayName;
}

function validateEmail(value) {
  const email = cleanText(value).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, "Email không hợp lệ");
  }

  return email;
}

function validatePassword(value) {
  const password = typeof value === "string" ? value : "";
  if (password.length < 6) {
    throw createHttpError(400, "Mật khẩu cần ít nhất 6 ký tự");
  }

  return password;
}

async function findUserById(userId) {
  const [rows] = await pool.query(
    `SELECT id, fullname, email, avatar_url, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  return normalizeUser(rows[0]);
}

async function register(req, res) {
  const fullname = validateDisplayName(req.body.fullname);
  const email = validateEmail(req.body.email);
  const password = validatePassword(req.body.password);

  const [duplicates] = await pool.query(
    `SELECT email
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  const duplicate = duplicates[0];
  if (duplicate?.email === email) {
    throw createHttpError(409, "Email đã được sử dụng");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.execute(
    `INSERT INTO users (fullname, email, password_hash)
     VALUES (?, ?, ?)`,
    [fullname, email, passwordHash]
  );

  const user = await findUserById(result.insertId);
  res.status(201).json({
    user,
    token: signToken(user),
  });
}

async function login(req, res) {
  const email = validateEmail(req.body.email);
  const password = validatePassword(req.body.password);

  const [rows] = await pool.query(
    `SELECT id, fullname, email, password_hash, avatar_url, created_at, updated_at
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  const row = rows[0];
  if (!row) {
    throw createHttpError(401, "Email hoặc mật khẩu không đúng");
  }

  const isPasswordValid = await bcrypt.compare(password, row.password_hash);
  if (!isPasswordValid) {
    throw createHttpError(401, "Email hoặc mật khẩu không đúng");
  }

  const user = normalizeUser(row);
  res.json({
    user,
    token: signToken(user),
  });
}

async function me(req, res) {
  const user = await findUserById(req.user.id);
  if (!user) {
    throw createHttpError(401, "Người dùng không tồn tại");
  }

  res.json({ user });
}


async function googleAuth(req, res) {
  const { id_token } = req.body;
  if (!id_token || typeof id_token !== "string") {
    throw createHttpError(400, "Thiếu id_token từ Google");
  }

  // Verify token với Google
  const client = new OAuth2Client(getGoogleClientId());
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: getGoogleClientId(),
    });
    payload = ticket.getPayload();
  } catch {
    throw createHttpError(401, "Token Google không hợp lệ hoặc đã hết hạn");
  }

  const { sub: googleId, email, name, picture } = payload;

  if (!email) {
    throw createHttpError(400, "Tài khoản Google không có email");
  }

  // Tìm user theo google_id trước
  let [rows] = await pool.query(
    `SELECT id, fullname, email, avatar_url, created_at, updated_at
     FROM users
     WHERE google_id = ?
     LIMIT 1`,
    [googleId]
  );

  // Nếu chưa có → tìm theo email (auto-link với tài khoản password)
  if (!rows[0]) {
    [rows] = await pool.query(
      `SELECT id, fullname, email, avatar_url, created_at, updated_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (rows[0]) {
      // Link google_id vào tài khoản hiện có
      await pool.execute(
        `UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?`,
        [googleId, picture ?? null, rows[0].id]
      );
    }
  }

  let user;
  if (rows[0]) {
    user = normalizeUser(rows[0]);
  } else {
    // Tạo user mới (không có password_hash — chỉ dùng Google)
    const fullname = name
      ? cleanText(name).replace(/\s+/g, " ").slice(0, 50) || "Người dùng"
      : "Người dùng";

    const [result] = await pool.execute(
      `INSERT INTO users (fullname, email, google_id, avatar_url) VALUES (?, ?, ?, ?)`,
      [fullname, email, googleId, picture ?? null]
    );
    user = await findUserById(result.insertId);

    // Gửi email chào mừng (không block response)
    sendWelcomeEmail({ to: email, displayName: user.fullname }).catch(() => {});
  }

  res.json({ user, token: signToken(user) });
}

module.exports = {
  register,
  login,
  me,
  googleAuth,
  findUserById,
  normalizeUser,
};
