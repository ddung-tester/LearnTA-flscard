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

const TEN_NGUON = { lesson: "Trong bài", exam: "Bài thi", extra: "Luyện thêm" };
const TEN_PHAN = {
  practice: "Practice",
  fill_verbs: "Điền động từ",
  picture_answers: "Theo tranh",
  multiple_choice: "Trắc nghiệm",
};

/** Phần bài tập của một câu: { khoa, nguon: "Trong bài" | "Bài thi" | ..., phan: "Quiz 1" } */
export function phanBaiTap(cauHoi) {
  const section = String(cauHoi.section || "");
  const quiz = /^quiz_(\d+)$/.exec(section);
  return {
    khoa: `${cauHoi.source}/${section}`,
    nguon: TEN_NGUON[cauHoi.source] || "Khác",
    phan: quiz ? `Quiz ${quiz[1]}` : TEN_PHAN[section] || section.replace(/_/g, " "),
  };
}

/** Các phần theo thứ tự xuất hiện, nhóm theo nguồn: [{ nguon, cacPhan: [{ khoa, phan, soCau }] }] */
export function nhomPhanBaiTap(danhSachCau) {
  const nhom = new Map();
  for (const cau of danhSachCau) {
    const { khoa, nguon, phan } = phanBaiTap(cau);
    if (!nhom.has(nguon)) nhom.set(nguon, new Map());
    const cacPhan = nhom.get(nguon);
    if (!cacPhan.has(khoa)) cacPhan.set(khoa, { khoa, phan, soCau: 0 });
    cacPhan.get(khoa).soCau += 1;
  }
  return [...nhom].map(([nguon, cacPhan]) => ({ nguon, cacPhan: [...cacPhan.values()] }));
}

/** Tổng số buổi đọc từ tên khoá ("Khoá 48 ngày ..." → 48); không có số thì lấy số buổi lớn nhất đang có */
export function tongSoBuoiKhoaHoc(tenKhoa, soBuoiLonNhat) {
  const khop = /(\d+)\s*(ngày|buổi|bài)/i.exec(tenKhoa || "");
  return Math.max(khop ? Number(khop[1]) : 0, soBuoiLonNhat || 0);
}

// Chỗ trống trong công thức: S, O, V, N, V2, V-ing, "V nguyên mẫu", Adj, Adv, "..."
const LA_CHO_TRONG = /^(?:[SOVN](?:[\s\d/-]|$)|adj\b|adv\b|\.{2,}|…)/i;

/**
 * Tách công thức "S + was/were + not + ..." thành các khối ghép câu.
 * laCho = true với chỗ người học tự điền (chủ ngữ, động từ...), false với từ cố định.
 */
export function tachCongThuc(congThuc) {
  return String(congThuc || "")
    .split(/\s\+\s/)
    .map((khoi) => khoi.trim())
    .filter(Boolean)
    .map((khoi) => ({ text: khoi, laCho: LA_CHO_TRONG.test(khoi) }));
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
