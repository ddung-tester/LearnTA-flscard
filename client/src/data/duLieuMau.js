/**
 * Du lieu mau (mock data) cho Phase 1.
 * Dung de phat trien frontend truoc khi ket noi backend.
 * Cau truc giong voi database schema trong PROJECT_CONTEXT.md.
 *
 * Cac truong placeholder (streak, masteredCount) se duoc thay bang
 * du lieu that tu backend o Phase 2.
 */

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
  },
  {
    id: 2,
    deck_id: 1,
    term_en: "book",
    meaning_vi: "quyển sách",
    example_sentence: "She is reading a book.",
    note: "",
  },
  {
    id: 3,
    deck_id: 1,
    term_en: "cat",
    meaning_vi: "con mèo",
    example_sentence: "The cat is sleeping on the sofa.",
    note: "",
  },
  {
    id: 4,
    deck_id: 1,
    term_en: "dog",
    meaning_vi: "con chó",
    example_sentence: "My dog likes to play in the park.",
    note: "",
  },
  {
    id: 5,
    deck_id: 1,
    term_en: "elephant",
    meaning_vi: "con voi",
    example_sentence: "Elephants are the largest land animals.",
    note: "Phát âm: /ˈelɪfənt/",
  },
  {
    id: 6,
    deck_id: 1,
    term_en: "flower",
    meaning_vi: "bông hoa",
    example_sentence: "She gave me a beautiful flower.",
    note: "",
  },

  // Bo 2: IELTS Speaking
  {
    id: 7,
    deck_id: 2,
    term_en: "describe",
    meaning_vi: "mô tả",
    example_sentence: "Can you describe your hometown?",
    note: "Thường dùng trong Part 2",
  },
  {
    id: 8,
    deck_id: 2,
    term_en: "prefer",
    meaning_vi: "thích hơn",
    example_sentence: "I prefer tea to coffee.",
    note: "prefer + N / V-ing",
  },
  {
    id: 9,
    deck_id: 2,
    term_en: "opinion",
    meaning_vi: "ý kiến",
    example_sentence: "In my opinion, reading is important.",
    note: "",
  },
  {
    id: 10,
    deck_id: 2,
    term_en: "convenient",
    meaning_vi: "thuận tiện",
    example_sentence: "Public transport is very convenient here.",
    note: "Tính từ",
  },
  {
    id: 11,
    deck_id: 2,
    term_en: "beneficial",
    meaning_vi: "có lợi",
    example_sentence: "Exercise is beneficial for health.",
    note: "beneficial to / for",
  },

  // Bo 3: CNTT
  {
    id: 12,
    deck_id: 3,
    term_en: "algorithm",
    meaning_vi: "thuật toán",
    example_sentence: "This sorting algorithm is very efficient.",
    note: "",
  },
  {
    id: 13,
    deck_id: 3,
    term_en: "database",
    meaning_vi: "cơ sở dữ liệu",
    example_sentence: "We store user data in the database.",
    note: "",
  },
  {
    id: 14,
    deck_id: 3,
    term_en: "variable",
    meaning_vi: "biến",
    example_sentence: "Declare a variable before using it.",
    note: "Khái niệm cơ bản trong lập trình",
  },
  {
    id: 15,
    deck_id: 3,
    term_en: "function",
    meaning_vi: "hàm",
    example_sentence: "This function returns a string.",
    note: "",
  },
  {
    id: 16,
    deck_id: 3,
    term_en: "component",
    meaning_vi: "thành phần",
    example_sentence: "React uses components to build UIs.",
    note: "Khái niệm React",
  },
];

/**
 * Lay danh sach the theo id cua bo.
 */
export function layTheoBoId(boId) {
  return danhSachThe.filter((the) => the.deck_id === boId);
}

/**
 * Lay thong tin bo theo id.
 */
export function layBoTheoId(boId) {
  return danhSachBo.find((bo) => bo.id === boId) || null;
}
