// Audio bài nghe của khoá học riêng nằm trên Cloud Storage (bucket private, không public).
// Backend tự đọc object bằng tài khoản dịch vụ (ADC: Cloud Run / gcloud ở máy dev) rồi trả cho chủ khoá.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { GoogleAuth } = require("google-auth-library");

const BUCKET = process.env.COURSE_AUDIO_BUCKET || "flash-card-499907-course-audio";

let auth;

// Máy dev: dùng thẳng file ADC của gcloud (tự dò có thể treo khi thử metadata server).
// Cloud Run không có file này nên dùng tài khoản dịch vụ qua metadata server như bình thường.
function fileAdcGcloud() {
  const thuMuc = process.env.APPDATA
    ? path.join(process.env.APPDATA, "gcloud")
    : path.join(os.homedir(), ".config", "gcloud");
  const duongDan = path.join(thuMuc, "application_default_credentials.json");
  return !process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(duongDan) ? duongDan : undefined;
}

function layAuth() {
  if (!auth) {
    auth = new GoogleAuth({
      keyFile: fileAdcGcloud(),
      scopes: ["https://www.googleapis.com/auth/devstorage.read_only"],
    });
  }
  return auth;
}

/** Tên object của một câu: <slug khoá>/<audio_path>, vd khoa-hoc-48-ngay/bai-29/audio/mp31.mp3 */
function tenObjectAudio(courseSlug, audioPath) {
  return `${courseSlug}/${audioPath}`;
}

/**
 * Mở luồng đọc một file audio. Trả null khi object không tồn tại.
 * @returns {Promise<{ stream: Readable, contentType: string, size: number | null } | null>}
 */
async function moAudio(objectName) {
  const token = await layAuth().getAccessToken();
  const url = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(objectName)}?alt=media`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Cloud Storage trả ${response.status} khi đọc ${objectName}`);
  }
  const size = Number(response.headers.get("content-length")) || null;
  return {
    stream: Readable.fromWeb(response.body),
    contentType: response.headers.get("content-type") || "audio/mpeg",
    size,
  };
}

module.exports = { BUCKET, moAudio, tenObjectAudio };
