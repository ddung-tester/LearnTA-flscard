// Bộ lọc / sắp xếp / tìm kiếm từ vựng dùng chung cho trang chi tiết bộ từ
// và 3 trang học (Flashcard, Trắc nghiệm, Tự luận) để kết quả luôn khớp nhau.
import { laTuYeuThich } from "../data/duLieuMau";

export const SO_LAN_DUNG_DA_HOC = 5;
export const SO_NGAY_MOI_THEM = 7;

export const FILTER_TU = [
  { key: "tat-ca", label: "Tất cả" },
  { key: "yeu-thich", label: "Yêu thích" },
  { key: "moi-them", label: "Mới thêm" },
  { key: "chua-hoc-filter", label: "Chưa học" },
  { key: "da-hoc", label: "Đã học" },
];

export const SORT_TU = [
  { key: "mac-dinh", label: "Mặc định" },
  { key: "ten", label: "A → Z" },
  { key: "ten-desc", label: "Z → A" },
  { key: "ngay-them", label: "Cũ nhất trước" },
  { key: "ngay-them-desc", label: "Mới nhất trước" },
  { key: "so-cau-sai", label: "Sai nhiều nhất" },
  { key: "chua-hoc", label: "Chưa học trước" },
  { key: "da-hoc", label: "Đã học trước" },
];

const FILTER_HOP_LE = new Set(FILTER_TU.map((f) => f.key));
const SORT_HOP_LE = new Set(SORT_TU.map((s) => s.key));

export function chuanHoaFilter(key) {
  return FILTER_HOP_LE.has(key) ? key : "tat-ca";
}

export function chuanHoaSort(key) {
  return SORT_HOP_LE.has(key) ? key : "mac-dinh";
}

function soLanDung(the) {
  return Number(the?.correct_count ?? the?.progress?.correct_count ?? 0) || 0;
}

export function laTuDaHoc(the) {
  return soLanDung(the) >= SO_LAN_DUNG_DA_HOC;
}

// "Mới thêm" = thêm vào bộ trong SO_NGAY_MOI_THEM ngày gần nhất.
export function laTuMoiThem(the, bayGio = Date.now()) {
  const thoiGian = new Date(the?.created_at || 0).getTime();
  if (!thoiGian) return false;
  return bayGio - thoiGian <= SO_NGAY_MOI_THEM * 86400000;
}

const KIEM_TRA_FILTER = {
  "yeu-thich": laTuYeuThich,
  "moi-them": (the) => laTuMoiThem(the),
  "chua-hoc-filter": (the) => !laTuDaHoc(the),
  "da-hoc": laTuDaHoc,
};

export function locTheoFilter(danhSach, filterKey) {
  const kiemTra = KIEM_TRA_FILTER[filterKey];
  return kiemTra ? danhSach.filter(kiemTra) : danhSach;
}

export function demTheoFilter(danhSach) {
  const ketQua = { "tat-ca": danhSach.length };
  for (const [key, kiemTra] of Object.entries(KIEM_TRA_FILTER)) {
    ketQua[key] = danhSach.filter(kiemTra).length;
  }
  return ketQua;
}

// Bỏ dấu tiếng Việt + chữ thường để "qua tao" tìm được "quả táo".
export function chuanHoaTimKiem(chuoi) {
  return String(chuoi || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function timTheoTuKhoa(danhSach, tuKhoa) {
  const q = chuanHoaTimKiem(tuKhoa);
  if (!q) return danhSach;
  return danhSach.filter((the) =>
    [the.term_en, the.meaning_vi, the.example_sentence].some((truong) =>
      chuanHoaTimKiem(truong).includes(q)
    )
  );
}

function thoiGianTao(the) {
  return new Date(the.created_at || 0).getTime();
}

const SO_SANH = {
  ten: (a, b) => a.term_en.localeCompare(b.term_en, "en", { sensitivity: "base" }),
  "ten-desc": (a, b) => b.term_en.localeCompare(a.term_en, "en", { sensitivity: "base" }),
  "ngay-them": (a, b) => thoiGianTao(a) - thoiGianTao(b),
  "ngay-them-desc": (a, b) => thoiGianTao(b) - thoiGianTao(a),
  "so-cau-sai": (a, b) => (b.wrong_count || 0) - (a.wrong_count || 0),
  "chua-hoc": (a, b) => Number(laTuDaHoc(a)) - Number(laTuDaHoc(b)),
  "da-hoc": (a, b) => Number(laTuDaHoc(b)) - Number(laTuDaHoc(a)),
};

export function sapXepTu(danhSach, sortKey) {
  const soSanh = SO_SANH[sortKey];
  return soSanh ? [...danhSach].sort(soSanh) : danhSach;
}

export function apDungBoLoc(danhSach, { filter = "tat-ca", sort = "mac-dinh", tuKhoa = "" } = {}) {
  return sapXepTu(timTheoTuKhoa(locTheoFilter(danhSach, filter), tuKhoa), sort);
}

// Số lượng từ mỗi phiên cho trang Luyện tập (0 = tất cả).
export const SO_LUONG_TU = [10, 20, 50, 100, 200, 0];
const SO_LUONG_TOI_DA = 1000;

function docSoLuong(giaTri) {
  const so = Number(giaTri);
  return Number.isInteger(so) && so > 0 ? Math.min(so, SO_LUONG_TOI_DA) : 0;
}

// Đọc bộ lọc từ URL trang học (?filter=&sort=&q=&n=&random=).
// ngauNhien: true/false khi URL chỉ định, null để trang học dùng cài đặt đã lưu.
export function docBoLocTuUrl(searchParams) {
  const random = searchParams.get("random");
  return {
    filter: chuanHoaFilter(searchParams.get("filter")),
    sort: chuanHoaSort(searchParams.get("sort")),
    tuKhoa: searchParams.get("q") || "",
    soLuong: docSoLuong(searchParams.get("n")),
    ngauNhien: random === "1" ? true : random === "0" ? false : null,
  };
}

export function taoQueryBoLoc({
  filter = "tat-ca",
  sort = "mac-dinh",
  tuKhoa = "",
  soLuong = 0,
  ngauNhien = null,
}) {
  const params = new URLSearchParams();
  if (filter !== "tat-ca") params.set("filter", filter);
  if (sort !== "mac-dinh") params.set("sort", sort);
  if (tuKhoa.trim()) params.set("q", tuKhoa.trim());
  if (soLuong > 0) params.set("n", String(soLuong));
  if (ngauNhien !== null) params.set("random", ngauNhien ? "1" : "0");
  const query = params.toString();
  return query ? `?${query}` : "";
}
