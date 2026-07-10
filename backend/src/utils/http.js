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

function cleanTextWithLimit(value, maxLength, fieldName = "value") {
  const text = cleanText(value);
  if ([...text].length > maxLength) {
    throw createHttpError(400, `${fieldName} vuot qua ${maxLength} ky tu`);
  }
  return text;
}

function cleanNullableTextWithLimit(value, maxLength, fieldName = "value") {
  const text = cleanTextWithLimit(value, maxLength, fieldName);
  return text || null;
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  throw createHttpError(400, "Gia tri boolean khong hop le");
}

module.exports = {
  createHttpError,
  parsePositiveInt,
  parseOptionalUserId,
  cleanText,
  cleanNullableText,
  cleanTextWithLimit,
  cleanNullableTextWithLimit,
  parseBoolean,
};
