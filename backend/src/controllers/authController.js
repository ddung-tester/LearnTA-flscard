const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { cleanText, createHttpError } = require("../utils/http");

const SALT_ROUNDS = 10;
const FALLBACK_JWT_SECRET = "dev_secret_change_later";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u;

function getJwtSecret() {
  return process.env.JWT_SECRET || FALLBACK_JWT_SECRET;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || "7d";
}

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
    { expiresIn: getJwtExpiresIn() }
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

module.exports = {
  register,
  login,
  me,
  findUserById,
  normalizeUser,
};
