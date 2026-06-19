const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../config/db");
const { getJwtSecret, jwtExpiresIn } = require("../config/env");
const { cleanText, createHttpError } = require("../utils/http");

const SALT_ROUNDS = 10;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
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

async function googleLogin(req, res) {
  const { idToken } = req.body;
  if (!idToken) throw createHttpError(400, "Thiếu idToken");
  if (!GOOGLE_CLIENT_ID) throw createHttpError(500, "Server chưa cấu hình GOOGLE_CLIENT_ID");

  // 1. Verify id_token với Google
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
  } catch {
    throw createHttpError(401, "Google token không hợp lệ hoặc đã hết hạn");
  }

  const payload = ticket.getPayload();
  const googleId = payload.sub;
  const email = payload.email?.toLowerCase();
  const name = payload.name || email;
  const picture = payload.picture || null;

  if (!email) throw createHttpError(400, "Tài khoản Google không có email");

  // 2. Tìm user theo google_id trước
  let [rows] = await pool.query(
    `SELECT id, fullname, email, google_id, auth_provider, avatar_url, created_at, updated_at
     FROM users WHERE google_id = ? LIMIT 1`,
    [googleId]
  );
  let userRow = rows[0];

  if (!userRow) {
    // 3a. Thử tìm theo email (merge với tài khoản local cũ)
    [rows] = await pool.query(
      `SELECT id, fullname, email, google_id, auth_provider, avatar_url, created_at, updated_at
       FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    userRow = rows[0];

    if (userRow) {
      // Merge: gắn google_id vào tài khoản email đã có
      await pool.execute(
        `UPDATE users SET google_id = ?, auth_provider = 'google', avatar_url = COALESCE(avatar_url, ?) WHERE id = ?`,
        [googleId, picture, userRow.id]
      );
      userRow.google_id = googleId;
      userRow.auth_provider = "google";
    } else {
      // 3b. Tạo user mới hoàn toàn
      const [result] = await pool.execute(
        `INSERT INTO users (fullname, email, google_id, auth_provider, avatar_url)
         VALUES (?, ?, ?, 'google', ?)`,
        [name, email, googleId, picture]
      );
      userRow = await findUserRowById(result.insertId);
    }
  } else {
    // 4. User đã có — cập nhật avatar nếu thay đổi
    if (picture && userRow.avatar_url !== picture) {
      await pool.execute(
        `UPDATE users SET avatar_url = ? WHERE id = ?`,
        [picture, userRow.id]
      );
      userRow.avatar_url = picture;
    }
  }

  const user = normalizeUser(userRow);
  res.json({
    user,
    token: signToken(user),
  });
}

// Helper nội bộ: lấy raw row theo id (không qua SELECT tối giản)
async function findUserRowById(userId) {
  const [rows] = await pool.query(
    `SELECT id, fullname, email, google_id, auth_provider, avatar_url, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

module.exports = {
  register,
  login,
  me,
  googleLogin,
  findUserById,
  normalizeUser,
};
