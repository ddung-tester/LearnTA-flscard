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
  multiple_choice: "Trắc nghiệm",
  ngu_phap: "Ngữ pháp",
  tu_vung: "Từ vựng",
};

/**
 * Câu của tài liệu (bỏ câu luyện thêm do AI sinh, source "extra"): dùng cho "Tất cả", "Còn lại"
 * và tiến độ buổi. Buổi chỉ có câu luyện thêm thì giữ nguyên.
 */
export function layCauBaiChinh(cauHoi) {
  const cauChinh = cauHoi.filter((cau) => cau.source !== "extra");
  return cauChinh.length > 0 ? cauChinh : cauHoi;
}

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

/**
 * Tiến độ một buổi (một phần tử lessons của GET /courses): từ đã học + câu đang đúng trên tổng.
 * Buổi "xong" khi đã học hết từ và câu nào cũng đúng ở lần trả lời gần nhất.
 */
export function tienDoBuoiHoc(bai) {
  const tongTu = bai.word_count || 0;
  const tongCau = bai.question_count || 0;
  const tuDaHoc = Math.min(bai.learned_count || 0, tongTu);
  const cauDung = Math.min(bai.correct_count || 0, tongCau);
  const tong = tongTu + tongCau;
  return {
    tongTu,
    tuDaHoc,
    tongCau,
    cauDung,
    phanTram: tong > 0 ? Math.round(((tuDaHoc + cauDung) / tong) * 100) : 0,
    daBatDau: (bai.learned_count || 0) + (bai.answered_count || 0) > 0,
    xong: tong > 0 && tuDaHoc + cauDung === tong,
  };
}

/** Tổng hợp tiến độ cả khoá (trang Thống kê, Dashboard): cộng dồn tiến độ các buổi đã có nội dung */
export function tongHopKhoaHoc(khoa) {
  const tong = { soBuoi: 0, soBuoiXong: 0, tuDaHoc: 0, tongTu: 0, tuDaThuoc: 0, cauDung: 0, tongCau: 0, cauCanOn: 0 };
  for (const bai of khoa.lessons || []) {
    const tienDo = tienDoBuoiHoc(bai);
    tong.soBuoi += 1;
    tong.soBuoiXong += tienDo.xong ? 1 : 0;
    tong.tuDaHoc += tienDo.tuDaHoc;
    tong.tongTu += tienDo.tongTu;
    tong.tuDaThuoc += Math.min(bai.mastered_count || 0, tienDo.tongTu);
    tong.cauDung += tienDo.cauDung;
    tong.tongCau += tienDo.tongCau;
    tong.cauCanOn += bai.due_count || 0;
  }
  return tong;
}

/**
 * Buổi nên học tiếp: buổi gần nhất đã bắt đầu nếu chưa xong, không thì buổi kế sau nó;
 * chưa học buổi nào thì buổi đầu tiên. null khi đã xong mọi buổi hiện có.
 */
export function timBuoiTiepTheo(lessons) {
  const theoSo = [...lessons].sort((a, b) => a.lesson_number - b.lesson_number);
  const ganNhat = theoSo.filter((bai) => tienDoBuoiHoc(bai).daBatDau).at(-1);
  if (!ganNhat) return theoSo[0] ?? null;
  if (!tienDoBuoiHoc(ganNhat).xong) return ganNhat;
  return theoSo.find((bai) => bai.lesson_number > ganNhat.lesson_number) ?? null;
}

/** Tổng số buổi đọc từ tên khoá ("Khoá 48 ngày ..." → 48); không có số thì lấy số buổi lớn nhất đang có */
export function tongSoBuoiKhoaHoc(tenKhoa, soBuoiLonNhat) {
  const khop = /(\d+)\s*(ngày|buổi|bài)/i.exec(tenKhoa || "");
  return Math.max(khop ? Number(khop[1]) : 0, soBuoiLonNhat || 0);
}

/**
 * Chia các buổi 1..tongBuoi thành dòng: buổi có nội dung là một dòng riêng,
 * các buổi trống liền nhau gộp một dòng ("Buổi 1–10") để không đẩy buổi đang học xuống quá xa.
 */
export function chiaDongBuoi(theoSo, tongBuoi) {
  const dong = [];
  for (let so = 1; so <= tongBuoi; so += 1) {
    const bai = theoSo.get(so);
    const truoc = dong.at(-1);
    if (bai?.deck_id) dong.push({ bai, tu: so, den: so });
    else if (truoc && !truoc.bai) truoc.den = so;
    else dong.push({ bai: null, tu: so, den: so });
  }
  return dong;
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
  number: "số",
  letter: "chữ cái",
  "phrasal verb": "cụm động từ",
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
