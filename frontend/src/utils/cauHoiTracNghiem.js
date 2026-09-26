/**
 * cauHoiTracNghiem.js — Sinh câu hỏi trắc nghiệm 4 đáp án từ danh sách thẻ.
 * Đáp án nhiễu ưu tiên các đáp án có độ dài gần với đáp án đúng.
 */
import { cheTuTrongCau, taoSoTuSeed, tronMangOnDinh } from "./phienHoc";

export const CHE_DO_MAC_DINH_QUIZ = "vi-en";

function tinhDoDaiVanBan(giaTri) {
  return String(giaTri || "").trim().replace(/\s+/g, " ").length;
}

function tinhDiemGanDoDai(cauHoi, dapAnDung, dapAn) {
  const doDaiDapAn = Math.max(1, tinhDoDaiVanBan(dapAn));
  const doDaiDapAnDung = Math.max(1, tinhDoDaiVanBan(dapAnDung));
  const doDaiCauHoi = Math.max(1, tinhDoDaiVanBan(cauHoi));

  const lechVoiDapAnDung =
    Math.abs(doDaiDapAn - doDaiDapAnDung) / Math.max(doDaiDapAn, doDaiDapAnDung);
  const lechVoiCauHoi =
    Math.abs(doDaiDapAn - doDaiCauHoi) / Math.max(doDaiDapAn, doDaiCauHoi);

  return lechVoiDapAnDung * 0.75 + lechVoiCauHoi * 0.25;
}

function layDapAnNhieuTuongDong(danhSachThe, theHienTai, laEnVi, seed) {
  const cauHoi = laEnVi ? theHienTai.term_en : theHienTai.meaning_vi;
  const dapAnDung = laEnVi ? theHienTai.meaning_vi : theHienTai.term_en;
  const dapAnDaDung = new Set([String(dapAnDung || "").trim().toLowerCase()]);

  return danhSachThe
    .filter((theKhac) => theKhac.id !== theHienTai.id)
    .map((theKhac) => {
      const dapAn = laEnVi ? theKhac.meaning_vi : theKhac.term_en;

      return {
        id: theKhac.id,
        dapAn,
        diem: tinhDiemGanDoDai(cauHoi, dapAnDung, dapAn),
        thuTuPhu: taoSoTuSeed(`${seed}-distractor-${theHienTai.id}-${theKhac.id}`),
      };
    })
    .filter(({ dapAn }) => {
      const khoa = String(dapAn || "").trim().toLowerCase();
      if (!khoa || dapAnDaDung.has(khoa)) return false;
      dapAnDaDung.add(khoa);
      return true;
    })
    .sort((a, b) => a.diem - b.diem || a.thuTuPhu - b.thuTuPhu)
    .slice(0, 3)
    .map(({ dapAn }) => dapAn);
}

/**
 * @param danhSachNhieu - pool lấy đáp án sai (mặc định = danhSachThe). Khi học lại
 *   từ sai thì truyền cả bộ từ để luôn đủ 3 đáp án nhiễu.
 */
export function taoDanhSachCauHoi(
  danhSachThe,
  cheDo = CHE_DO_MAC_DINH_QUIZ,
  seed = "quiz",
  danhSachNhieu = null
) {
  if (!danhSachThe || danhSachThe.length === 0) return [];
  const poolNhieu = danhSachNhieu && danhSachNhieu.length >= 4 ? danhSachNhieu : danhSachThe;
  if (poolNhieu.length < 4) return [];

  const laEnVi = cheDo === "en-vi";

  return danhSachThe.map((the) =>
    taoCauHoi(
      the,
      laEnVi ? the.term_en : the.meaning_vi,
      laEnVi ? the.meaning_vi : the.term_en,
      layDapAnNhieuTuongDong(poolNhieu, the, laEnVi, seed),
      seed
    )
  );
}

function taoCauHoi(the, cauHoi, dapAnDung, dapAnNhieu, seed) {
  return {
    id: the.id,
    cauHoi,
    dapAnDung,
    the,
    danhSachDapAn: tronMangOnDinh(
      [dapAnDung, ...dapAnNhieu],
      `${seed}-answers-${the.id}`,
      (dapAn, index) => `${index}-${dapAn}`
    ),
  };
}

/**
 * Ngữ cảnh: câu ví dụ của thẻ bị che từ đang học, chọn từ tiếng Anh phù hợp.
 * Bỏ qua thẻ không có câu ví dụ chứa chính từ đó.
 */
export function taoDanhSachCauHoiNguCanh(danhSachThe, seed = "ngu-canh", danhSachNhieu = null) {
  if (!danhSachThe || danhSachThe.length === 0) return [];
  const poolNhieu = danhSachNhieu && danhSachNhieu.length >= 4 ? danhSachNhieu : danhSachThe;
  if (poolNhieu.length < 4) return [];

  return danhSachThe.flatMap((the) => {
    const cauHoi = cheTuTrongCau(the.example_sentence, the.term_en);
    if (!cauHoi) return [];
    // laEnVi = false → đáp án nhiễu là từ tiếng Anh của các thẻ khác
    const dapAnNhieu = layDapAnNhieuTuongDong(poolNhieu, the, false, seed);
    return [taoCauHoi(the, cauHoi, the.term_en, dapAnNhieu, seed)];
  });
}

// Hỗn hợp (giống luyentu): trắc nghiệm, gõ nghĩa, gõ từ, nghe viết
export const LOAI_CAU_HON_HOP = ["chon", "go-nghia", "go-tu", "nghe"];

/**
 * Gán ngẫu nhiên (ổn định theo seed) một dạng câu cho từng thẻ.
 * Câu trắc nghiệm mang sẵn chiều hỏi và 4 đáp án. Bộ dưới 4 từ thì bỏ dạng trắc nghiệm.
 */
export function ganLoaiCauHonHop(danhSachThe, seed = "hon-hop", danhSachNhieu = null) {
  const coTheChon = (danhSachNhieu?.length ?? danhSachThe.length) >= 4;
  const cacLoai = coTheChon ? LOAI_CAU_HON_HOP : LOAI_CAU_HON_HOP.slice(1);

  return danhSachThe.map((the) => {
    const loai = cacLoai[taoSoTuSeed(`${seed}-loai-${the.id}`) % cacLoai.length];
    if (loai !== "chon") return { ...the, __loaiCau: loai };

    const chieu = taoSoTuSeed(`${seed}-chieu-${the.id}`) % 2 === 0 ? "en-vi" : "vi-en";
    const [cau] = taoDanhSachCauHoi([the], chieu, seed, danhSachNhieu);
    return { ...the, __loaiCau: "chon", __chieuChon: chieu, __dapAnLuaChon: cau.danhSachDapAn };
  });
}
