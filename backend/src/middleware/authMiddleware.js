const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { getJwtSecret, jwtExpiresIn } = require("../config/env");
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

  return { user, payload };
}

// Gia hạn trượt: token còn dưới 3 ngày thì gửi token mới qua header X-Token-Moi
// (frontend thay token lặng lẽ) — người học dùng đều không bị đăng xuất giữa bài sau 7 ngày.
const GIA_HAN_KHI_CON_GIAY = 3 * 24 * 3600;

function giaHanNeuSapHet(res, { user, payload }) {
  const conLai = Number(payload.exp) - Math.floor(Date.now() / 1000);
  if (!Number.isFinite(conLai) || conLai > GIA_HAN_KHI_CON_GIAY) return;
  const tokenMoi = jwt.sign(
    { id: user.id, fullname: user.fullname, email: user.email },
    getJwtSecret(),
    { expiresIn: jwtExpiresIn }
  );
  res.set("X-Token-Moi", tokenMoi);
}

function requireAuth(req, res, next) {
  Promise.resolve()
    .then(async () => {
      const token = readBearerToken(req);
      if (!token) {
        throw createHttpError(401, "Cần đăng nhập");
      }

      const xacThuc = await loadUserFromToken(token);
      req.user = xacThuc.user;
      giaHanNeuSapHet(res, xacThuc);
      next();
    })
    .catch(next);
}

function optionalAuth(req, res, next) {
  Promise.resolve()
    .then(async () => {
      const token = readBearerToken(req);
      const xacThuc = token ? await loadUserFromToken(token) : null;
      req.user = xacThuc?.user ?? null;
      if (xacThuc) giaHanNeuSapHet(res, xacThuc);
      next();
    })
    .catch(next);
}

module.exports = {
  requireAuth,
  optionalAuth,
  normalizeAuthUser,
};
