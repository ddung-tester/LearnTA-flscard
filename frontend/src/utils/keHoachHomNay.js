/**
 * keHoachHomNay — ghép việc học trong ngày thành một danh sách theo thứ tự, khoảng 60 phút:
 *   1. Khởi động: câu bài tập sai đến hạn, từ của khoá học đến hạn ôn
 *   2. Buổi đang học: Từ vựng → Lý thuyết → Bài tập (bước nào xong rồi thì bỏ)
 *   3. Còn thời gian: buổi kế tiếp
 *   4. Còn thời gian: ôn từ đến hạn của bộ khác (lộ trình, bộ của tôi)
 *
 * Kế hoạch được chốt một lần mỗi ngày (lưu trên máy) để danh sách không đổi khi làm xong từng việc;
 * trạng thái xong của từng việc tính lại từ dữ liệu thật mỗi lần mở.
 * Số phút là ước lượng (giả định, cần đo lại): ôn từ 15 giây, câu bài tập 45 giây–1 phút, từ mới 1 phút.
 */
import { timBuoiTiepTheo, tienDoBuoiHoc, NGUONG_XONG_BUOI } from "./baiTapKhoaHoc";

export const MUC_TIEU_PHUT = 60;
const PHUT_LY_THUYET = 10;
const KHOA_LUU = "hocTA.keHoachHomNay";

const tron = (so, toiThieu = 1) => Math.max(toiThieu, Math.round(so));

/** Ngày theo giờ Việt Nam (YYYY-MM-DD): kế hoạch đổi lúc 00:00 giờ VN như lịch ôn */
export function ngayVN(now = new Date()) {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Tập deck_id của các buổi khoá học → nhận ra từ nào thuộc khoá */
export function boCuaKhoaHoc(cacKhoa) {
  const ids = new Set();
  for (const khoa of cacKhoa || []) {
    for (const bai of khoa.lessons || []) if (bai.deck_id) ids.add(String(bai.deck_id));
  }
  return ids;
}

/** Số từ đến hạn ôn, tách từ của khoá và từ của bộ khác */
export function demTuDenHan(srs, idsKhoa, now = new Date()) {
  let khoa = 0;
  let khac = 0;
  for (const muc of srs || []) {
    if (new Date(muc.nextReviewAt || 0) > now) continue;
    if (idsKhoa.has(String(muc.deckId))) khoa += 1;
    else khac += 1;
  }
  return { khoa, khac };
}

function cacViecCuaBuoi(khoa, bai, daDoc) {
  const tienDo = tienDoBuoiHoc(bai);
  const goc = `/khoa-hoc/${khoa.id}/bai/${bai.lesson_number}`;
  const nhom = `Buổi ${bai.lesson_number} · ${bai.title}`;
  const viec = [];
  // Chỉ đưa vào bước còn dở; bước đã xong của buổi thì bỏ
  if (tienDo.tuDaHoc < tienDo.tongTu) {
    viec.push({
      id: `tu-vung:${bai.lesson_number}`,
      nhom,
      nhan: "Học từ mới",
      phut: tron(tienDo.tongTu - tienDo.tuDaHoc, 3),
      to: `${goc}/tu-vung`,
    });
  }
  if (!daDoc(bai.lesson_number)) {
    viec.push({ id: `ly-thuyet:${bai.lesson_number}`, nhom, nhan: "Đọc lý thuyết", phut: PHUT_LY_THUYET, to: `${goc}/ly-thuyet` });
  }
  if (tienDo.cauDung < Math.ceil(tienDo.tongCau * NGUONG_XONG_BUOI)) {
    viec.push({
      id: `bai-tap:${bai.lesson_number}`,
      nhom,
      nhan: "Làm bài tập",
      phut: tron(tienDo.tongCau - tienDo.cauDung, 3),
      to: `${goc}/bai-tap`,
    });
  }
  return viec;
}

/**
 * Lập kế hoạch mới (chưa có trạng thái xong).
 * @param {{ khoa: object|null, tuDenHan: { khoa: number, khac: number }, cauDenHan: number, daDoc: (soBuoi:number)=>boolean }} vao
 * @returns {Array<{ id, nhom, nhan, phut, to }>}
 */
export function lapKeHoach({ khoa, tuDenHan, cauDenHan, daDoc = () => false }) {
  const viec = [];
  const KHOI_DONG = "Khởi động · ôn bài cũ";
  if (cauDenHan > 0) {
    viec.push({ id: "on-cau", nhom: KHOI_DONG, nhan: `Ôn ${cauDenHan} câu bài tập làm sai`, phut: tron(cauDenHan * 0.75, 2), to: "/review?loai=cau" });
  }
  if (tuDenHan.khoa > 0) {
    viec.push({ id: "on-tu-khoa", nhom: KHOI_DONG, nhan: `Ôn ${tuDenHan.khoa} từ của khoá học`, phut: tron(tuDenHan.khoa * 0.25, 2), to: "/review?nguon=khoa" });
  }
  const tong = () => viec.reduce((cong, muc) => cong + muc.phut, 0);

  if (khoa) {
    const buoi = timBuoiTiepTheo(khoa.lessons || []);
    if (buoi) {
      viec.push(...cacViecCuaBuoi(khoa, buoi, daDoc));
      // Còn nhiều thời gian: thêm buổi kế tiếp (tối đa 1 buổi nữa)
      if (tong() < MUC_TIEU_PHUT - 20) {
        const theoSo = [...khoa.lessons].sort((a, b) => a.lesson_number - b.lesson_number);
        const buoiSau = theoSo.find((bai) => bai.lesson_number > buoi.lesson_number && !tienDoBuoiHoc(bai).xong);
        if (buoiSau) viec.push(...cacViecCuaBuoi(khoa, buoiSau, daDoc));
      }
    }
  }

  if (tuDenHan.khac > 0 && tong() < MUC_TIEU_PHUT) {
    const soTu = Math.min(tuDenHan.khac, Math.max(8, (MUC_TIEU_PHUT - tong()) * 4));
    viec.push({ id: "on-tu-khac", nhom: "Ôn thêm", nhan: `Ôn ${soTu} từ ở bộ khác`, phut: tron(soTu * 0.25, 2), to: "/review?nguon=khac" });
  }
  return viec;
}

/**
 * Việc nào đã xong, tính từ dữ liệu hiện tại.
 * Ôn: không còn gì đến hạn. Từ vựng: học hết từ của buổi. Lý thuyết: đã đọc trên máy này.
 * Bài tập: đúng từ 80% câu (cùng ngưỡng xong buổi).
 */
export function danhDauXong(keHoach, { khoa, tuDenHan, cauDenHan, daDoc = () => false }) {
  const buoiTheoSo = new Map((khoa?.lessons || []).map((bai) => [String(bai.lesson_number), bai]));
  return keHoach.map((viec) => {
    const [loai, so] = viec.id.split(":");
    let xong = false;
    if (loai === "on-cau") xong = cauDenHan === 0;
    else if (loai === "on-tu-khoa") xong = tuDenHan.khoa === 0;
    else if (loai === "on-tu-khac") xong = tuDenHan.khac === 0;
    else if (loai === "ly-thuyet") xong = daDoc(Number(so));
    else {
      const bai = buoiTheoSo.get(so);
      const tienDo = bai ? tienDoBuoiHoc(bai) : null;
      if (!tienDo) xong = true;
      else if (loai === "tu-vung") xong = tienDo.tuDaHoc >= tienDo.tongTu;
      else if (loai === "bai-tap") xong = tienDo.cauDung >= Math.ceil(tienDo.tongCau * NGUONG_XONG_BUOI);
    }
    return { ...viec, xong };
  });
}

function khoaLuu(userId) {
  return `${KHOA_LUU}:${userId ?? "khach"}`;
}

/** Kế hoạch đã chốt hôm nay (null nếu chưa có hoặc của ngày khác) */
export function docKeHoachDaChot(userId, now = new Date()) {
  try {
    const luu = JSON.parse(localStorage.getItem(khoaLuu(userId)) || "null");
    return luu && luu.ngay === ngayVN(now) && Array.isArray(luu.viec) ? luu.viec : null;
  } catch {
    return null;
  }
}

export function chotKeHoach(userId, viec, now = new Date()) {
  try {
    localStorage.setItem(khoaLuu(userId), JSON.stringify({ ngay: ngayVN(now), viec }));
  } catch {
    // Không lưu được thì mỗi lần mở lập lại, vẫn dùng được
  }
}

/** Đang học theo kế hoạch hôm nay: màn kết thúc của các bước hiện nút "Tiếp kế hoạch hôm nay" */
const CO_DANG_THEO = "hocTA.dangTheoKeHoach";
export function batDauTheoKeHoach() {
  try {
    sessionStorage.setItem(CO_DANG_THEO, ngayVN());
  } catch {
    // bỏ qua
  }
}
export function dangTheoKeHoach() {
  try {
    return sessionStorage.getItem(CO_DANG_THEO) === ngayVN();
  } catch {
    return false;
  }
}
