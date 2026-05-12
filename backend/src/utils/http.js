function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parsePositiveInt(value, fieldName = "id") {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw createHttpError(400, `${fieldName} khong hop le`);
  }

  return number;
}

function parseOptionalUserId(value) {
  if (value === undefined || value === null || value === "") return null;
  return parsePositiveInt(value, "user_id");
}

function cleanText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function cleanNullableText(value) {
  const text = cleanText(value);
  return text || null;
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return Boolean(value);
}

module.exports = {
  createHttpError,
  parsePositiveInt,
  parseOptionalUserId,
  cleanText,
  cleanNullableText,
  parseBoolean,
};
