// Audio bài nghe của khoá học riêng nằm trên Supabase Storage (bucket private, không public).
// Backend đọc object bằng khoá bí mật của project (chỉ ở server) rồi trả cho chủ khoá.
const { Readable } = require("node:stream");

const BUCKET = process.env.COURSE_AUDIO_BUCKET || "course-audio";

function cauHinh() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    throw new Error("Thieu SUPABASE_URL hoac SUPABASE_SECRET_KEY de doc audio");
  }
  return { url, key };
}

// Khoá service_role cũ là JWT (gửi kèm Authorization); khoá sb_secret_ mới chỉ gửi qua apikey
function headerXacThuc(key) {
  return key.startsWith("eyJ") ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}

function duongDanObject(objectName) {
  return objectName.split("/").map(encodeURIComponent).join("/");
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
  const { url, key } = cauHinh();
  const response = await fetch(
    `${url}/storage/v1/object/authenticated/${BUCKET}/${duongDanObject(objectName)}`,
    { headers: headerXacThuc(key) }
  );
  if (!response.ok) {
    const noiDung = await response.text();
    // Supabase Storage báo thiếu object bằng 400 kèm "not_found" (bản mới trả 404)
    if (response.status === 404 || /not.?found/i.test(noiDung)) return null;
    throw new Error(`Supabase Storage trả ${response.status} khi đọc ${objectName}`);
  }
  const size = Number(response.headers.get("content-length")) || null;
  return {
    stream: Readable.fromWeb(response.body),
    contentType: response.headers.get("content-type") || "audio/mpeg",
    size,
  };
}

module.exports = { BUCKET, cauHinh, headerXacThuc, duongDanObject, moAudio, tenObjectAudio };
