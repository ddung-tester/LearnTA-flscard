const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { getJwtSecret } = require("../config/env");
const { createHttpError } = require("../utils/http");

function normalizeAuthUser(row) {
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

function readBearerToken(req) {
  const authorization = req.get("authorization");
  if (!authorization) return null;

  const parts = authorization.trim().split(/\s+/);
  const [scheme, token] = parts;
  if (parts.length !== 2 || scheme.toLowerCase() !== "bearer" || !token) {
    throw createHttpError(401, "Token không hợp lệ");
  }

  return token;
}

async function loadUserFromToken(token) {
  let payload;

  try {
    payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
  } catch (error) {
    throw createHttpError(401, "Token không hợp lệ hoặc đã hết hạn");
  }

  const userId = Number(payload.id || payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw createHttpError(401, "Token không hợp lệ");
  }

  const [rows] = await pool.query(
    `SELECT id, fullname, email, avatar_url, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  const user = normalizeAuthUser(rows[0]);
  if (!user) {
    throw createHttpError(401, "Người dùng không tồn tại");
  }

  return user;
}

function requireAuth(req, res, next) {
  Promise.resolve()
    .then(async () => {
      const token = readBearerToken(req);
      if (!token) {
        throw createHttpError(401, "Cần đăng nhập");
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
