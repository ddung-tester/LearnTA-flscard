/**
 * tai-audio-supabase.js — Tải file nghe khoá học (bai-XX/audio/*.mp3) lên bucket private của Supabase Storage.
 * Tên object: khoa-hoc-48-ngay/bai-XX/audio/<file> (khớp courseController.getQuestionAudio).
 * Cần SUPABASE_URL + SUPABASE_SECRET_KEY trong backend/.env. Chạy lại an toàn (ghi đè cùng tên).
 *
 * Xem trước:  node scripts/tai-audio-supabase.js
 * Tải lên:    node scripts/tai-audio-supabase.js --apply   (thêm --bai=21 để chỉ một bài)
 */
require("dotenv/config");
const fs = require("fs");
const path = require("path");
const { BUCKET, cauHinh, headerXacThuc, duongDanObject } = require("../src/services/audioStorage");
const { THU_MUC, docThamSo, timCacBai } = require("./thuMucKhoaHoc");

const APPLY = process.argv.includes("--apply");
const SLUG_KHOA = path.basename(THU_MUC);

async function taoBucketNeuChuaCo(url, key) {
  const response = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headerXacThuc(key), "content-type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  });
  const noiDung = await response.text();
  if (!response.ok && !/already exists|Duplicate/i.test(noiDung)) {
    throw new Error(`Không tạo được bucket ${BUCKET}: ${response.status} ${noiDung}`);
  }
}

async function main() {
  const chiBai = Number(docThamSo("bai")) || null;
  const cacFile = timCacBai(chiBai).flatMap(({ thuMuc }) => {
    const thuMucAudio = path.join(thuMuc, "audio");
    if (!fs.existsSync(thuMucAudio)) return [];
    return fs
      .readdirSync(thuMucAudio)
      .filter((ten) => ten.toLowerCase().endsWith(".mp3"))
      .map((ten) => path.join(thuMucAudio, ten));
  });
  const tongMb = cacFile.reduce((tong, file) => tong + fs.statSync(file).size, 0) / 1024 / 1024;
  console.log(`${cacFile.length} file nghe, ${tongMb.toFixed(1)} MB → bucket "${BUCKET}"`);
  if (!APPLY) {
    console.log("Xem trước xong. Thêm --apply để tải lên.");
    return;
  }

  const { url, key } = cauHinh();
  await taoBucketNeuChuaCo(url, key);

  let xong = 0;
  for (const file of cacFile) {
    const tenObject = [SLUG_KHOA, ...path.relative(THU_MUC, file).split(path.sep)].join("/");
    const response = await fetch(`${url}/storage/v1/object/${BUCKET}/${duongDanObject(tenObject)}`, {
      method: "POST",
      headers: { ...headerXacThuc(key), "content-type": "audio/mpeg", "x-upsert": "true" },
      body: fs.readFileSync(file),
    });
    if (!response.ok) {
      throw new Error(`Tải ${tenObject} lỗi: ${response.status} ${await response.text()}`);
    }
    xong += 1;
    if (xong % 20 === 0 || xong === cacFile.length) console.log(`  ${xong}/${cacFile.length}`);
  }
  console.log(`✅ Đã tải ${xong} file lên Supabase Storage.`);
}

main().catch((error) => {
  console.error("❌", error.message);
  process.exitCode = 1;
});
