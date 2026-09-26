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
export function tachCauMau(cau, tu) {
  const tuSach = String(tu || "").trim();
  if (!tuSach) return [{ text: cau, laTu: false }];

  const mau = new RegExp(`\\b(${tuSach.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return cau
    .split(mau)
    .filter(Boolean)
    .map((text) => ({ text, laTu: text.toLowerCase() === tuSach.toLowerCase() }));
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
