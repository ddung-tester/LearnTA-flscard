const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { createHttpError } = require("../utils/http");

const FALLBACK_JWT_SECRET = "dev_secret_change_later";

function getJwtSecret() {
  return process.env.JWT_SECRET || FALLBACK_JWT_SECRET;
}

function normalizeAuthUser(row) {
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

function readBearerToken(req) {
  const authorization = req.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw createHttpError(401, "Token khong hop le");
  }

  return token;
}

async function loadUserFromToken(token) {
  let payload;

  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch (error) {
    throw createHttpError(401, "Token khong hop le hoac da het han");
  }

  const userId = Number(payload.id || payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw createHttpError(401, "Token khong hop le");
  }

  const [rows] = await pool.query(
    `SELECT id, username, email, avatar_url, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  const user = normalizeAuthUser(rows[0]);
  if (!user) {
    throw createHttpError(401, "Nguoi dung khong ton tai");
  }

  return user;
}

function requireAuth(req, res, next) {
  Promise.resolve()
    .then(async () => {
      const token = readBearerToken(req);
      if (!token) {
        throw createHttpError(401, "Can dang nhap");
      }

      req.user = await loadUserFromToken(token);
      next();
    })
    .catch(next);
}

function optionalAuth(req, res, next) {
  Promise.resolve()
    .then(async () => {
      const token = readBearerToken(req);
      req.user = token ? await loadUserFromToken(token) : null;
      next();
    })
    .catch(next);
}

module.exports = {
  requireAuth,
  optionalAuth,
  normalizeAuthUser,
};
