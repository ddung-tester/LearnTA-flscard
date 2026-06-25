const mysql = require("mysql2/promise");
const { db } = require("./env");

const pool = mysql.createPool({
  user: db.user,
  password: db.password,
  database: db.database,
  socketPath: db.socketPath,
  host: db.socketPath ? undefined : db.host,
  port: db.socketPath ? undefined : db.port,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  enableKeepAlive: true,
  queueLimit: 0,
});

module.exports = pool;
