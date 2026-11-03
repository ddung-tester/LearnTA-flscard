/**
 * viTriHocBuoi — nhớ chỗ người học dừng lại trong một buổi của khoá học, để lần sau chọn
 * "Học tiếp" (mở đúng bước, đúng trang sổ tay, đúng câu bài tập) hoặc "Học lại từ đầu".
 * Lưu ở localStorage theo tài khoản + buổi: chỉ nhớ trên máy này (tiến độ đúng/sai từng câu vẫn ở server).
 *
 * Một mục: { buoc, trangLyThuyet, baiTap: { phan, ids, chiSo, ketQua } | null, tuDau, luc }
 */
const KHOA_LUU = "hocTA.viTriBuoi";
const SO_MUC_TOI_DA = 80;

function docTatCa() {
  try {
    return JSON.parse(localStorage.getItem(KHOA_LUU) || "{}") || {};
  } catch {
    return {};
  }
}

function ghiTatCa(tatCa) {
  try {
    const cacKhoa = Object.keys(tatCa).sort((a, b) => (tatCa[a].luc || 0) - (tatCa[b].luc || 0));
    for (const khoa of cacKhoa.slice(0, Math.max(0, cacKhoa.length - SO_MUC_TOI_DA))) delete tatCa[khoa];
    localStorage.setItem(KHOA_LUU, JSON.stringify(tatCa));
  } catch {
    // Bộ nhớ trình duyệt bị chặn / đầy: không nhớ được thì thôi, học vẫn bình thường
  }
}

export const khoaViTriBuoi = (userId, courseId, soBai) => `${userId ?? "khach"}:${courseId}/${soBai}`;

export function docViTriBuoi(khoa) {
  return docTatCa()[khoa] || null;
}

/** Gộp phần mới vào chỗ dừng đã lưu */
export function ghiViTriBuoi(khoa, phanMoi) {
  const tatCa = docTatCa();
  tatCa[khoa] = { ...tatCa[khoa], ...phanMoi, luc: Date.now() };
  ghiTatCa(tatCa);
}

/** "Học lại từ đầu": quên chỗ dừng, bài tập bắt đầu lại từ câu 1 của tất cả các phần */
export function hocLaiTuDau(khoa) {
  const tatCa = docTatCa();
  tatCa[khoa] = { buoc: "tu-vung", trangLyThuyet: 0, baiTap: null, tuDau: true, luc: Date.now() };
  ghiTatCa(tatCa);
}

/** Chỗ dừng đáng hỏi lại: đã qua bước Từ vựng, hoặc đang làm dở một lượt bài tập */
export function coChoDungDeTiep(viTri) {
  if (!viTri) return false;
  return (viTri.buoc && viTri.buoc !== "tu-vung") || (viTri.baiTap?.chiSo ?? 0) > 0 || (viTri.trangLyThuyet ?? 0) > 0;
}
