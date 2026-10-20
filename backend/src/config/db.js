// Pool PostgreSQL (Supabase) giữ cách gọi kiểu mysql2 mà controller đang dùng:
// query/execute(sql với dấu ?, params) → [rows] (SELECT, RETURNING) hoặc [{ affectedRows, insertId }].
const { Pool, types } = require("pg");
const { db } = require("./env");

// mysql2 trả COUNT/SUM/BIGINT là số và BOOLEAN là 1/0; giữ y như vậy để code + frontend không đổi
types.setTypeParser(types.builtins.INT8, (value) => Number(value));
types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));
types.setTypeParser(types.builtins.BOOL, (value) => (value === "t" ? 1 : 0));
// DATE giữ nguyên chuỗi 'YYYY-MM-DD': đổi sang Date theo giờ máy chủ sẽ lệch ngày khi máy không chạy UTC
types.setTypeParser(types.builtins.DATE, (value) => value);

// Mã lỗi Postgres → mã mysql2 mà app.js và controller đang bắt
const MA_LOI = {
  23505: "ER_DUP_ENTRY",
  22001: "ER_DATA_TOO_LONG",
};

/**
 * Đổi `?` thành `$1, $2…` (bỏ qua chuỗi '…', "…" và chú thích), mảng thành danh sách cho `IN (?)`.
 * Mảng rỗng thành NULL để `IN (NULL)` không khớp dòng nào.
 */
function chuyenSql(sql, params = []) {
  const giaTri = [];
  let viTri = 0;
  let ketQua = "";

  for (let i = 0; i < sql.length; i += 1) {
    const kyTu = sql[i];

    if (kyTu === "'" || kyTu === '"') {
      const ketThuc = sql.indexOf(kyTu, i + 1);
      const den = ketThuc === -1 ? sql.length : ketThuc + 1;
      ketQua += sql.slice(i, den);
      i = den - 1;
    } else if (kyTu === "-" && sql[i + 1] === "-") {
      const ketThuc = sql.indexOf("\n", i);
      const den = ketThuc === -1 ? sql.length : ketThuc;
      ketQua += sql.slice(i, den);
      i = den - 1;
    } else if (kyTu === "?") {
      if (viTri >= params.length) {
        throw new Error("Thieu tham so cho cau SQL");
      }
      const thamSo = params[viTri];
      viTri += 1;
      if (Array.isArray(thamSo)) {
        if (thamSo.length === 0) {
          ketQua += "NULL";
        } else {
          ketQua += thamSo.map((phanTu) => `$${giaTri.push(phanTu)}`).join(", ");
        }
      } else {
        ketQua += `$${giaTri.push(thamSo === undefined ? null : thamSo)}`;
      }
    } else {
      ketQua += kyTu;
    }
  }

  return { text: ketQua, values: giaTri };
}

function ketQuaKieuMysql(result) {
  if (result.command === "SELECT") {
    return [result.rows, result.fields];
  }
  return [{ affectedRows: result.rowCount ?? 0, insertId: result.rows?.[0]?.id ?? 0, rows: result.rows }];
}

async function chay(client, sql, params) {
  const { text, values } = chuyenSql(sql, params);
  try {
    return ketQuaKieuMysql(await client.query(text, values));
  } catch (error) {
    if (MA_LOI[error.code]) {
      error.pgCode = error.code;
      error.code = MA_LOI[error.code];
    }
    throw error;
  }
}

const pgPool = new Pool({
  connectionString: db.url,
  host: db.url ? undefined : db.host,
  port: db.url ? undefined : db.port,
  user: db.url ? undefined : db.user,
  password: db.url ? undefined : db.password,
  database: db.url ? undefined : db.database,
  ssl: db.ssl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
});

// Pool rảnh bị DB/pooler cắt kết nối: không để lỗi này làm sập tiến trình
pgPool.on("error", (error) => {
  console.error("[db] Ket noi rảnh bị lỗi:", error.message);
});

function boc(client) {
  return {
    query: (sql, params) => chay(client, sql, params),
    execute: (sql, params) => chay(client, sql, params),
  };
}

const pool = {
  ...boc(pgPool),
  async getConnection() {
    const client = await pgPool.connect();
    return {
      ...boc(client),
      beginTransaction: () => client.query("BEGIN"),
      commit: () => client.query("COMMIT"),
      rollback: () => client.query("ROLLBACK"),
      release: () => client.release(),
    };
  },
  end: () => pgPool.end(),
  chuyenSql,
};

module.exports = pool;
