/**
 * Du lieu mau (mock data) cho Phase 1.
 * Dung de phat trien frontend truoc khi ket noi backend.
 * Cau truc giong voi database schema trong PROJECT_CONTEXT.md.
 *
 * Cac truong placeholder (streak, masteredCount) se duoc thay bang
 * du lieu that tu backend o Phase 2.
 */

const FAVORITES_STORAGE_KEY = "hocTA.cardFavorites";

function docYeuThichDaLuu() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function luuYeuThich(cardId, isFavorite) {
  if (typeof window === "undefined") return;

  const hienTai = docYeuThichDaLuu();
  if (isFavorite) {
    hienTai[cardId] = true;
  } else {
    delete hienTai[cardId];
  }

  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(hienTai));
}

function ngayTaoTuId(id) {
  const ngay = Math.max(1, 30 - id);
  return `2026-04-${String(ngay).padStart(2, "0")}T08:00:00Z`;
}

function sapXepTuMoiTruoc(danhSach) {
  return [...danhSach].sort((a, b) => {
    const thoiGianB = new Date(b.created_at || 0).getTime();
    const thoiGianA = new Date(a.created_at || 0).getTime();

    if (thoiGianB !== thoiGianA) return thoiGianB - thoiGianA;
    return b.id - a.id;
  });
}

const yeuThichDaLuu = docYeuThichDaLuu();

export const danhSachBo = [
  {
    id: 1,
    title: "Từ vựng cơ bản",
    description: "Các từ thông dụng hàng ngày",
    created_at: "2026-04-15T08:00:00Z",
    updated_at: "2026-04-15T08:00:00Z",
    // Placeholder — se duoc tinh tu backend Phase 2
    streak: 3,
    masteredCount: 4,
  },
  {
    id: 2,
    title: "IELTS Speaking Part 1",
    description: "Từ vựng thường gặp trong IELTS Speaking",
    created_at: "2026-04-20T10:00:00Z",
    updated_at: "2026-04-20T10:00:00Z",
    streak: 0,
    masteredCount: 2,
  },
  {
    id: 3,
    title: "Công nghệ thông tin",
    description: "Thuật ngữ IT phổ biến",
    created_at: "2026-04-25T14:00:00Z",
    updated_at: "2026-04-25T14:00:00Z",
    streak: 1,
    masteredCount: 0,
  },
];

export const danhSachThe = [
  // Bo 1: Tu vung co ban
  {
    id: 1,
    deck_id: 1,
    term_en: "apple",
    meaning_vi: "quả táo",
    example_sentence: "I eat an apple every morning.",
    note: "Danh từ đếm được",
    created_at: ngayTaoTuId(1),
    is_favorite: Boolean(yeuThichDaLuu[1]),
  },
  {
    id: 2,
    deck_id: 1,
    term_en: "book",
    meaning_vi: "quyển sách",
    example_sentence: "She is reading a book.",
    note: "",
    created_at: ngayTaoTuId(2),
    is_favorite: Boolean(yeuThichDaLuu[2]),
  },
  {
    id: 3,
    deck_id: 1,
    term_en: "cat",
    meaning_vi: "con mèo",
    example_sentence: "The cat is sleeping on the sofa.",
    note: "",
    created_at: ngayTaoTuId(3),
    is_favorite: Boolean(yeuThichDaLuu[3]),
  },
  {
    id: 4,
    deck_id: 1,
    term_en: "dog",
    meaning_vi: "con chó",
    example_sentence: "My dog likes to play in the park.",
    note: "",
    created_at: ngayTaoTuId(4),
    is_favorite: Boolean(yeuThichDaLuu[4]),
  },
  {
    id: 5,
    deck_id: 1,
    term_en: "elephant",
    meaning_vi: "con voi",
    example_sentence: "Elephants are the largest land animals.",
    note: "Phát âm: /ˈelɪfənt/",
    created_at: ngayTaoTuId(5),
    is_favorite: Boolean(yeuThichDaLuu[5]),
  },
  {
    id: 6,
    deck_id: 1,
    term_en: "flower",
    meaning_vi: "bông hoa",
    example_sentence: "She gave me a beautiful flower.",
    note: "",
    created_at: ngayTaoTuId(6),
    is_favorite: Boolean(yeuThichDaLuu[6]),
  },

  // Bo 2: IELTS Speaking
  {
    id: 7,
    deck_id: 2,
    term_en: "describe",
    meaning_vi: "mô tả",
    example_sentence: "Can you describe your hometown?",
    note: "Thường dùng trong Part 2",
    created_at: ngayTaoTuId(7),
    is_favorite: Boolean(yeuThichDaLuu[7]),
  },
  {
    id: 8,
    deck_id: 2,
    term_en: "prefer",
    meaning_vi: "thích hơn",
    example_sentence: "I prefer tea to coffee.",
    note: "prefer + N / V-ing",
    created_at: ngayTaoTuId(8),
    is_favorite: Boolean(yeuThichDaLuu[8]),
  },
  {
    id: 9,
    deck_id: 2,
    term_en: "opinion",
    meaning_vi: "ý kiến",
    example_sentence: "In my opinion, reading is important.",
    note: "",
    created_at: ngayTaoTuId(9),
    is_favorite: Boolean(yeuThichDaLuu[9]),
  },
  {
    id: 10,
    deck_id: 2,
    term_en: "convenient",
    meaning_vi: "thuận tiện",
    example_sentence: "Public transport is very convenient here.",
    note: "Tính từ",
    created_at: ngayTaoTuId(10),
    is_favorite: Boolean(yeuThichDaLuu[10]),
  },
  {
    id: 11,
    deck_id: 2,
    term_en: "beneficial",
    meaning_vi: "có lợi",
    example_sentence: "Exercise is beneficial for health.",
    note: "beneficial to / for",
    created_at: ngayTaoTuId(11),
    is_favorite: Boolean(yeuThichDaLuu[11]),
  },

  // Bo 3: CNTT
  {
    id: 12,
    deck_id: 3,
    term_en: "algorithm",
    meaning_vi: "thuật toán",
    example_sentence: "This sorting algorithm is very efficient.",
    note: "",
    created_at: ngayTaoTuId(12),
    is_favorite: Boolean(yeuThichDaLuu[12]),
  },
  {
    id: 13,
    deck_id: 3,
    term_en: "database",
    meaning_vi: "cơ sở dữ liệu",
    example_sentence: "We store user data in the database.",
    note: "",
    created_at: ngayTaoTuId(13),
    is_favorite: Boolean(yeuThichDaLuu[13]),
  },
  {
    id: 14,
    deck_id: 3,
    term_en: "variable",
    meaning_vi: "biến",
    example_sentence: "Declare a variable before using it.",
    note: "Khái niệm cơ bản trong lập trình",
    created_at: ngayTaoTuId(14),
    is_favorite: Boolean(yeuThichDaLuu[14]),
  },
  {
    id: 15,
    deck_id: 3,
    term_en: "function",
    meaning_vi: "hàm",
    example_sentence: "This function returns a string.",
    note: "",
    created_at: ngayTaoTuId(15),
    is_favorite: Boolean(yeuThichDaLuu[15]),
  },
  {
    id: 16,
    deck_id: 3,
    term_en: "component",
    meaning_vi: "thành phần",
    example_sentence: "React uses components to build UIs.",
    note: "Khái niệm React",
    created_at: ngayTaoTuId(16),
    is_favorite: Boolean(yeuThichDaLuu[16]),
  },
];

/**
 * Lay danh sach the theo id cua bo.
 */
export function layTheoBoId(boId) {
  return sapXepTuMoiTruoc(danhSachThe.filter((the) => the.deck_id === boId));
}

/**
 * Lay thong tin bo theo id.
 */
export function layBoTheoId(boId) {
  return danhSachBo.find((bo) => bo.id === boId) || null;
}

export function laTuYeuThich(the) {
  return Boolean(the?.is_favorite || the?.isFavorite);
}

export function laTuMoiThem(the) {
  const soLanDung =
    the?.correct_count ??
    the?.correctCount ??
    the?.progress?.correct_count ??
    the?.progress?.correctCount ??
    0;

  return Number(soLanDung) < 5;
}

export function capNhatTrangThaiYeuThichThe(cardId, isFavorite) {
  const the = danhSachThe.find((item) => item.id === cardId);
  if (the) {
    the.is_favorite = isFavorite;
    the.isFavorite = isFavorite;
  }

  luuYeuThich(cardId, isFavorite);
}

export function locTuYeuThich(danhSach, chiHocTuYeuThich) {
  if (!chiHocTuYeuThich) return danhSach;
  return danhSach.filter(laTuYeuThich);
}
