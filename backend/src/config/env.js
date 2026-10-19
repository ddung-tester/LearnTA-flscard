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

function getGoogleClientId() {
  return requiredEnv("GOOGLE_CLIENT_ID");
}

// Production: DATABASE_URL (chuỗi kết nối Supabase). Máy dev có thể dùng DB_HOST/DB_USER/DB_NAME.
const databaseUrl = process.env.DATABASE_URL?.trim();

module.exports = {
  port: parseNumber(process.env.PORT, 8080),
  db: {
    url: databaseUrl || undefined,
    host: databaseUrl ? undefined : requiredEnv("DB_HOST"),
    port: parseNumber(process.env.DB_PORT, 5432),
    user: databaseUrl ? undefined : requiredEnv("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: databaseUrl ? undefined : requiredEnv("DB_NAME"),
    ssl: process.env.DB_SSL === "true",
  },
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  getJwtSecret,
  getGoogleClientId,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
