// Đọc thư mục nội dung khoá học riêng: database/private-content/khoa-hoc-48-ngay/bai-XX/
// (đã .gitignore, KHÔNG commit). Dùng chung cho nhap-khoa-hoc.js và sinh-bai-luyen-them.js.
const fs = require("fs");
const path = require("path");

const THU_MUC = path.join(__dirname, "../database/private-content/khoa-hoc-48-ngay");

function docThamSo(ten) {
  const thamSo = process.argv.find((arg) => arg.startsWith(`--${ten}=`));
  return thamSo ? thamSo.slice(ten.length + 3).trim() : "";
}

function docJson(duongDan) {
  return JSON.parse(fs.readFileSync(duongDan, "utf8").replace(/^﻿/, ""));
}

/** Các thư mục bai-XX theo số bài; chiBai: chỉ lấy một bài */
function timCacBai(chiBai) {
  if (!fs.existsSync(THU_MUC)) return [];
  return fs
    .readdirSync(THU_MUC, { withFileTypes: true })
    .filter((muc) => muc.isDirectory() && /^bai-\d+$/.test(muc.name))
    .map((muc) => ({ soBai: Number(muc.name.slice(4)), thuMuc: path.join(THU_MUC, muc.name) }))
    .filter((bai) => !chiBai || bai.soBai === chiBai)
    .sort((a, b) => a.soBai - b.soBai);
}

/** 3 file bắt buộc của một bài + extra.json (bài luyện thêm, không bắt buộc) */
function docFileBai(thuMuc) {
  const duongDanExtra = path.join(thuMuc, "extra.json");
  return {
    files: {
      lesson: docJson(path.join(thuMuc, "lesson.json")),
      exercises: docJson(path.join(thuMuc, "exercises.json")),
      answers: docJson(path.join(thuMuc, "answers.json")),
    },
    extra: fs.existsSync(duongDanExtra) ? docJson(duongDanExtra) : null,
    duongDanExtra,
  };
}

module.exports = { THU_MUC, docThamSo, docJson, timCacBai, docFileBai };
