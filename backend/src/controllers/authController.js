const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { cleanText, createHttpError } = require("../utils/http");

const SALT_ROUNDS = 10;
const FALLBACK_JWT_SECRET = "dev_secret_change_later";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,50}$/;

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
    username: row.username,
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
      username: user.username,
      email: user.email,
    },
    getJwtSecret(),
    { expiresIn: getJwtExpiresIn() }
  );
}

function validateUsername(value) {
  const username = cleanText(value);
  if (!USERNAME_PATTERN.test(username)) {
    throw createHttpError(
      400,
      "username can 3-50 ky tu, chi gom chu cai, so va dau gach duoi"
    );
  }

  return username;
}

function validateEmail(value) {
  const email = cleanText(value).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, "email khong hop le");
  }

  return email;
}

function validatePassword(value) {
  const password = typeof value === "string" ? value : "";
  if (password.length < 6) {
    throw createHttpError(400, "password can it nhat 6 ky tu");
  }

  return password;
}

async function findUserById(userId) {
  const [rows] = await pool.query(
    `SELECT id, username, email, avatar_url, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  return normalizeUser(rows[0]);
}

async function register(req, res) {
  const username = validateUsername(req.body.username);
  const email = validateEmail(req.body.email);
  const password = validatePassword(req.body.password);

  const [duplicates] = await pool.query(
    `SELECT username, email
     FROM users
     WHERE username = ? OR email = ?
     LIMIT 1`,
    [username, email]
  );

  const duplicate = duplicates[0];
  if (duplicate?.email === email) {
    throw createHttpError(409, "Email da duoc su dung");
  }

  if (duplicate?.username === username) {
    throw createHttpError(409, "Username da duoc su dung");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.execute(
    `INSERT INTO users (username, email, password_hash)
     VALUES (?, ?, ?)`,
    [username, email, passwordHash]
  );

  const user = await findUserById(result.insertId);
  res.status(201).json({
    user,
    token: signToken(user),
  });
}

async function login(req, res) {
  const email = validateEmail(req.body.email);
  const password = typeof req.body.password === "string" ? req.body.password : "";

  const [rows] = await pool.query(
    `SELECT id, username, email, password_hash, avatar_url, created_at, updated_at
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  const row = rows[0];
  if (!row) {
    throw createHttpError(401, "Email hoac mat khau khong dung");
  }

  const isPasswordValid = await bcrypt.compare(password, row.password_hash);
  if (!isPasswordValid) {
    throw createHttpError(401, "Email hoac mat khau khong dung");
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
    throw createHttpError(401, "Nguoi dung khong ton tai");
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
