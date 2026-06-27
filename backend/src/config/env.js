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

const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME?.trim();
const explicitDbSocketPath = process.env.DB_SOCKET_PATH?.trim();
const dbSocketPath =
  explicitDbSocketPath ||
  (instanceConnectionName ? `/cloudsql/${instanceConnectionName}` : "");

module.exports = {
  port: parseNumber(process.env.PORT, 8080),
  db: {
    host: dbSocketPath ? undefined : requiredEnv("DB_HOST"),
    port: parseNumber(process.env.DB_PORT, 3306),
    socketPath: dbSocketPath || undefined,
    user: requiredEnv("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: requiredEnv("DB_NAME"),
  },
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  getJwtSecret,
  getGoogleClientId,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
