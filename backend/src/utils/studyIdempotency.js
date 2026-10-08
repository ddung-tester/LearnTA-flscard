const { createHash } = require("node:crypto");
const { createHttpError } = require("./http");

function parseClientRequestId(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(value)) {
    throw createHttpError(400, "Mã yêu cầu lưu kết quả không hợp lệ.");
  }
  return value;
}

function requestFingerprint(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

// table comes only from the two fixed controller call sites, never from a request.
async function insertOnce(connection, table, userId, requestId, fingerprint, insert) {
  try {
    const [result] = await insert();
    return { id: result.insertId, replayed: false };
  } catch (error) {
    if (!requestId || error.code !== "ER_DUP_ENTRY") throw error;
    const [rows] = await connection.query(
      `SELECT id, request_hash FROM ${table} WHERE user_id = ? AND client_request_id = ?`,
      [userId, requestId]
    );
    if (!rows[0]) throw error;
    if (rows[0].request_hash !== fingerprint) {
      throw createHttpError(409, "Mã lưu kết quả đã được dùng cho nội dung khác.");
    }
    return { id: rows[0].id, replayed: true };
  }
}

module.exports = { parseClientRequestId, requestFingerprint, insertOnce };
