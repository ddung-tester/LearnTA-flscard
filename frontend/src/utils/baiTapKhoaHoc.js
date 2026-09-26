/**
 * baiTapKhoaHoc.js — Hàm thuần cho bài tập của khoá học riêng.
 * Cách chấm giống backend (utils/khoaHoc.js) để phản hồi đúng/sai hiện ngay, không chờ server.
 */

/**
 * Chuẩn hoá câu trả lời gõ tay: không phân biệt hoa thường, bỏ khoảng trắng thừa
 * và dấu câu cuối câu, nháy cong (’) coi như nháy thẳng (').
 */
export function chuanHoaTraLoi(text) {
  return String(text ?? "")
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "")
    .trim();
}

/** traLoi: chữ cái lựa chọn (trắc nghiệm) hoặc câu đã gõ (điền từ) */
export function laTraLoiDung(cauHoi, traLoi) {
  if (cauHoi.type === "multiple_choice") {
    return String(traLoi ?? "").trim().toUpperCase() === cauHoi.answer_key;
  }
  const daChuanHoa = chuanHoaTraLoi(traLoi);
  return (
    Boolean(daChuanHoa) &&
    (cauHoi.accepted_answers || []).some((dapAn) => chuanHoaTraLoi(dapAn) === daChuanHoa)
  );
}

/** Đáp án đúng để hiển thị: "wasn’t" hoặc "did not pay / didn’t pay" */
export function layDapAnHienThi(cauHoi) {
  if (cauHoi.type === "multiple_choice") {
    return (cauHoi.options || []).find((luaChon) => luaChon.key === cauHoi.answer_key)?.text || "";
  }
  return (cauHoi.accepted_answers || []).join(" / ");
}

const TEN_NGUON = { lesson: "Bài tập trong bài", exam: "Bài thi", extra: "Bài tập thêm" };
const TEN_PHAN = {
  practice: "Practice",
  fill_verbs: "Điền dạng đúng của động từ",
  picture_answers: "Trả lời theo tranh",
  multiple_choice: "Trắc nghiệm",
};

/** "Bài tập trong bài · Quiz 1", "Bài thi · Trả lời theo tranh" */
export function tenPhanBaiTap(cauHoi) {
  const quiz = /^quiz_(\d+)$/.exec(cauHoi.section || "");
  const phan = quiz ? `Quiz ${quiz[1]}` : TEN_PHAN[cauHoi.section] || String(cauHoi.section || "").replace(/_/g, " ");
  const nguon = TEN_NGUON[cauHoi.source];
  return nguon ? `${nguon} · ${phan}` : phan;
}

const TEN_LOAI_TU = {
  noun: "danh từ",
  verb: "động từ",
  adjective: "tính từ",
  adverb: "trạng từ",
  pronoun: "đại từ",
  determiner: "từ hạn định",
  preposition: "giới từ",
  conjunction: "liên từ",
  phrase: "cụm từ",
};

export function tenLoaiTu(loaiTu) {
  return TEN_LOAI_TU[loaiTu] || loaiTu || "";
}

/**
 * Tách "**đậm**" trong lời giải thích AI thành các đoạn { text, dam } để render an toàn.
 * "*nghiêng*" (AI đôi khi vẫn dùng) chỉ bỏ dấu sao.
 */
export function tachChuDam(text) {
  return String(text || "")
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((doan) =>
      doan.startsWith("**") && doan.endsWith("**") && doan.length > 4
        ? { text: doan.slice(2, -2), dam: true }
        : { text: doan.replace(/\*([^*\n]+)\*/g, "$1"), dam: false }
    );
}
