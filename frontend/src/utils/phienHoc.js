/**
 * phienHoc.js — Hàm thuần dùng chung cho mọi chế độ học theo phiên
 * (Trắc nghiệm, Tự luận và các chế độ sau này).
 */

export const SO_TU_MOI_TIEN_TRINH = 10;

export function taoSoTuSeed(seed) {
  let hash = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  // Trộn cuối (fmix32 của MurmurHash3): FNV-1a gần như giữ nguyên thứ tự khi chuỗi chỉ khác
  // ký tự cuối (id thẻ liên tiếp), làm "ngẫu nhiên" ra từng cụm id liền nhau.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;

  return hash >>> 0;
}

/**
 * Xáo trộn ổn định: cùng seed luôn cho cùng thứ tự.
 */
export function tronMangOnDinh(danhSach, seed, layKhoa = (item, index) => `${index}-${item}`) {
  return [...danhSach]
    .map((item, index) => ({
      item,
      thuTu: taoSoTuSeed(`${seed}-${layKhoa(item, index)}`),
    }))
    .sort((a, b) => a.thuTu - b.thuTu)
    .map(({ item }) => item);
}

/**
 * Seed ngẫu nhiên cho mỗi lần mở trang học, để "ngẫu nhiên" ra thứ tự khác nhau giữa các lần.
 */
export function taoHatGiong() {
  return Math.floor(Math.random() * 2 ** 31);
}

/**
 * Chọn thẻ cho một phiên: xáo trộn ổn định (nếu bật) rồi lấy tối đa soLuong thẻ (0 = tất cả).
 * Xáo trước rồi mới cắt, để "20 từ ngẫu nhiên" là 20 từ bất kỳ trong danh sách.
 */
export function chonTheChoPhien(danhSach, { ngauNhien = false, seed = "", soLuong = 0 } = {}) {
  const daXep = ngauNhien
    ? tronMangOnDinh(danhSach, seed, (the, index) => the?.id ?? `${index}-${the?.term_en}`)
    : danhSach;
  return soLuong > 0 ? daXep.slice(0, soLuong) : daXep;
}

/**
 * Gắn khóa phiên và chỉ số đoạn tiến trình (mỗi đoạn 10 câu) cho từng câu.
 */
export function ganTienTrinh(danhSach, kichThuocTienTrinh = SO_TU_MOI_TIEN_TRINH) {
  return danhSach.map((item, index) => ({
    ...item,
    __sessionKey: `${item?.id ?? "item"}-${index}`,
    __segmentIndex: Math.floor(index / kichThuocTienTrinh),
  }));
}

export function taoDanhSachTienTrinh(tongSoCau, kichThuocTienTrinh = SO_TU_MOI_TIEN_TRINH) {
  const tongSoTienTrinh = Math.ceil(tongSoCau / kichThuocTienTrinh);

  return Array.from({ length: tongSoTienTrinh }, (_, index) => ({
    index,
    totalValue: Math.min(
      kichThuocTienTrinh,
      Math.max(0, tongSoCau - index * kichThuocTienTrinh)
    ),
  }));
}

/**
 * Lấp đầy các đoạn tiến trình tuyến tính theo số câu đúng.
 */
export function tinhTienTrinh(danhSachTienTrinh, soCauDung) {
  let daTichLuy = 0;
  const cacThanh = danhSachTienTrinh.map((tienTrinh) => {
    const totalValue = tienTrinh.totalValue || 1;
    const currentValue = Math.min(totalValue, Math.max(0, soCauDung - daTichLuy));
    daTichLuy += totalValue;
    return {
      index: tienTrinh.index,
      currentValue,
      totalValue,
      progressPercent: (currentValue / totalValue) * 100,
    };
  });

  const chiSoChuaXong = cacThanh.findIndex((thanh) => thanh.currentValue < thanh.totalValue);
  const chiSoDangHoatDong =
    chiSoChuaXong === -1 ? Math.max(0, cacThanh.length - 1) : chiSoChuaXong;

  return {
    cacThanh,
    chiSoDangHoatDong,
    tienDoDoanHienTai: cacThanh[chiSoDangHoatDong]?.progressPercent ?? 0,
    soHoanThanh: cacThanh.filter((thanh) => thanh.currentValue >= thanh.totalValue).length,
    payload: cacThanh.map((thanh) => ({
      segment_index: thanh.index,
      current: thanh.currentValue,
      total: thanh.totalValue,
      is_completed: thanh.currentValue >= thanh.totalValue,
    })),
  };
}

/**
 * Tách câu mẫu thành các đoạn, đánh dấu chỗ có từ đang học
 * (khớp từ đầu một từ, không phân biệt hoa thường; "run" khớp cả "runs").
 */
/**
 * So sánh đáp án gõ tay: bỏ khoảng trắng thừa, không phân biệt hoa thường.
 */
export function chuanHoaDapAn(text) {
  return String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Đáp án gõ tay đúng khi khớp cả chuỗi hoặc một nghĩa trong danh sách
 * ("anh trai, em trai" nhận cả "anh trai"; tách theo dấu phẩy, chấm phẩy, gạch chéo).
 */
export function khopDapAn(cauTraLoi, dapAn) {
  const traLoi = chuanHoaDapAn(cauTraLoi);
  if (!traLoi) return false;
  if (traLoi === chuanHoaDapAn(dapAn)) return true;
  return String(dapAn || "")
    .split(/[,;/]/)
    .some((nghia) => chuanHoaDapAn(nghia) === traLoi);
}

/**
 * Gợi ý khi gõ: hiện 40% số ký tự đầu (không tính khoảng trắng, tối thiểu 1), còn lại là "_".
 */
export function taoGoiY(dapAn) {
  const text = String(dapAn || "").trim();
  if (!text) return "";

  const soKyTuGoiY = Math.max(1, Math.ceil(text.replace(/\s/g, "").length * 0.4));
  let soKyTuDaHien = 0;
  let ketQua = "";

  for (const kyTu of text) {
    if (/\s/.test(kyTu)) {
      ketQua += kyTu;
    } else if (soKyTuDaHien < soKyTuGoiY) {
      ketQua += kyTu;
      soKyTuDaHien += 1;
    } else {
      ketQua += "_";
    }
  }

  return ketQua;
}

function thoatRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function tachCauMau(cau, tu) {
  const tuSach = String(tu || "").trim();
  if (!tuSach) return [{ text: cau, laTu: false }];

  const mau = new RegExp(`\\b(${thoatRegex(tuSach)})`, "gi");
  return cau
    .split(mau)
    .filter(Boolean)
    .map((text) => ({ text, laTu: text.toLowerCase() === tuSach.toLowerCase() }));
}

/**
 * Chia danh sách thành các vòng tối đa `toiDa` phần tử, kích thước chênh nhau tối đa 1
 * (11 thẻ, tối đa 5 → 4/4/3), tránh vòng cuối chỉ có 1 cặp.
 */
export function chiaVong(danhSach, toiDa) {
  if (danhSach.length === 0) return [];

  const soVong = Math.ceil(danhSach.length / toiDa);
  const coBan = Math.floor(danhSach.length / soVong);
  const du = danhSach.length % soVong;
  const cacVong = [];
  let viTri = 0;

  for (let i = 0; i < soVong; i += 1) {
    const kichThuoc = coBan + (i < du ? 1 : 0);
    cacVong.push(danhSach.slice(viTri, viTri + kichThuoc));
    viTri += kichThuoc;
  }

  return cacVong;
}

function chuanHoaSoSanh(text) {
  return String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Nối từ: ô tiếng Anh (thẻ trái) và ô tiếng Việt (thẻ phải) có phải một cặp đúng không.
 * Chấp nhận cả thẻ khác nhưng trùng nghĩa hoặc trùng từ (bộ từ có từ trùng lặp).
 */
export function laCapNoiDung(theTrai, thePhai) {
  return (
    theTrai.id === thePhai.id ||
    chuanHoaSoSanh(theTrai.meaning_vi) === chuanHoaSoSanh(thePhai.meaning_vi) ||
    chuanHoaSoSanh(theTrai.term_en) === chuanHoaSoSanh(thePhai.term_en)
  );
}

export const O_TRONG = "_____";

/**
 * Che từ đang học trong câu ví dụ (cả dạng biến đổi: "run" che luôn "runs").
 * Trả về null nếu câu không chứa từ đó.
 */
export function cheTuTrongCau(cau, tu) {
  const tuSach = String(tu || "").trim();
  if (!cau || !tuSach) return null;

  const mau = new RegExp(`\\b${thoatRegex(tuSach)}\\w*`, "gi");
  const daChe = cau.replace(mau, O_TRONG);
  return daChe === cau ? null : daChe;
}

/**
 * Tách các thẻ CÓ TRONG PHIÊN thành đúng / sai (mỗi thẻ một lần).
 * Thẻ đã sai ít nhất một lần trong phiên được tính là sai.
 */
export function tachKetQuaPhien(danhSachThePhien, tapCardSai) {
  const daGap = new Set();
  const danhSachCardDung = [];
  const danhSachCardSai = [];

  for (const the of danhSachThePhien) {
    if (!the || daGap.has(the.id)) continue;
    daGap.add(the.id);
    (tapCardSai.has(the.id) ? danhSachCardSai : danhSachCardDung).push(the);
  }

  return { danhSachCardDung, danhSachCardSai };
}
