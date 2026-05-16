function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseCorsOrigins(value) {
  return (value || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function getJwtSecret() {
  return requiredEnv("JWT_SECRET");
}

module.exports = {
  port: parseNumber(process.env.PORT, 3000),
  db: {
    host: requiredEnv("DB_HOST"),
    port: parseNumber(requiredEnv("DB_PORT"), 3306),
    user: requiredEnv("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: requiredEnv("DB_NAME"),
  },
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  getJwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
