/**
 * tenseExamples.js
 * Cung cấp câu mẫu cho 3 thì tiếng Anh cơ bản kèm cấu trúc ngữ pháp (formula):
 * 1. Hiện tại đơn (Present Simple)
 * 2. Hiện tại tiếp diễn (Present Continuous)
 * 3. Quá khứ đơn (Past Simple)
 */

export const TENSE_META = {
  present_simple: {
    key: "present_simple",
    nameVi: "Hiện tại đơn",
    nameEn: "Present Simple",
    badgeColor: "var(--mau-chinh)",
  },
  present_continuous: {
    key: "present_continuous",
    nameVi: "Hiện tại tiếp diễn",
    nameEn: "Present Continuous",
    badgeColor: "#0284c7",
  },
  past_simple: {
    key: "past_simple",
    nameVi: "Quá khứ đơn",
    nameEn: "Past Simple",
    badgeColor: "#b45309",
  },
};

export const TENSE_EXAMPLES_MAP = {
  // Deck 1: Từ vựng cơ bản
  apple: [
    {
      tense: "present_simple",
      formula: "S + V(s/es) + O",
      sentence: "I eat a fresh apple every morning.",
      highlight: "eat a fresh apple",
      translation: "Tôi ăn một quả táo tươi mỗi sáng.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + O",
      sentence: "She is eating a sweet red apple right now.",
      highlight: "is eating a sweet red apple",
      translation: "Cô ấy đang ăn một quả táo đỏ ngọt ngay bây giờ.",
    },
    {
      tense: "past_simple",
      formula: "S + V2/ed + O",
      sentence: "We bought some delicious apples yesterday.",
      highlight: "bought some delicious apples",
      translation: "Chúng tôi đã mua vài quả táo rất ngon ngày hôm qua.",
    },
  ],
  book: [
    {
      tense: "present_simple",
      formula: "S + V(s/es) + O",
      sentence: "He reads an English book before going to sleep.",
      highlight: "reads an English book",
      translation: "Anh ấy đọc một quyển sách tiếng Anh trước khi đi ngủ.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + O",
      sentence: "I am reading an interesting book about history.",
      highlight: "am reading an interesting book",
      translation: "Tôi đang đọc một quyển sách thú vị về lịch sử.",
    },
    {
      tense: "past_simple",
      formula: "S + V2/ed + O",
      sentence: "She borrowed this book from the library last week.",
      highlight: "borrowed this book",
      translation: "Cô ấy đã mượn quyển sách này từ thư viện tuần trước.",
    },
  ],
  cat: [
    {
      tense: "present_simple",
      formula: "S + V(s/es) + ...",
      sentence: "My cat sleeps on the sofa all afternoon.",
      highlight: "My cat sleeps",
      translation: "Con mèo của tôi ngủ trên ghế sofa cả buổi chiều.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + ...",
      sentence: "Look, the little cat is playing with a ball.",
      highlight: "is playing",
      translation: "Nhìn kìa, chú mèo con đang chơi với quả bóng.",
    },
    {
      tense: "past_simple",
      formula: "S + was/were + adj/N",
      sentence: "The cat was very friendly when I visited them.",
      highlight: "was very friendly",
      translation: "Chú mèo đã rất thân thiện khi tôi ghé thăm họ.",
    },
  ],
  dog: [
    {
      tense: "present_simple",
      formula: "S + V(s/es) + O",
      sentence: "My dog barks loudly when strangers arrive.",
      highlight: "My dog barks",
      translation: "Chú chó của tôi sủa to khi có người lạ đến.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + ...",
      sentence: "The dog is running happily in the garden right now.",
      highlight: "is running happily",
      translation: "Chú chó đang chạy nhảy vui vẻ ngoài vườn lúc này.",
    },
    {
      tense: "past_simple",
      formula: "S + V2/ed + O",
      sentence: "We walked our dog in the central park yesterday.",
      highlight: "walked our dog",
      translation: "Chúng tôi đã dắt chó đi dạo ở công viên trung tâm hôm qua.",
    },
  ],
  elephant: [
    {
      tense: "present_simple",
      formula: "S + am/is/are + N / adj",
      sentence: "Elephants are the largest living land animals.",
      highlight: "Elephants are the largest",
      translation: "Voi là loài động vật trên cạn to lớn nhất còn sống.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + ...",
      sentence: "The big elephant is drinking water at the river.",
      highlight: "is drinking water",
      translation: "Chú voi to lớn đang uống nước bên bờ sông.",
    },
    {
      tense: "past_simple",
      formula: "S + V2/ed + O",
      sentence: "We saw a family of wild elephants during the safari.",
      highlight: "saw a family of wild elephants",
      translation: "Chúng tôi đã nhìn thấy một đàn voi hoang dã trong chuyến dã ngoại.",
    },
  ],
  flower: [
    {
      tense: "present_simple",
      formula: "S + V(s/es) + ...",
      sentence: "These flowers bloom beautifully every spring.",
      highlight: "flowers bloom beautifully",
      translation: "Những bông hoa này nở rộ tuyệt đẹp vào mỗi mùa xuân.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + O",
      sentence: "My sister is watering the flowers on the balcony.",
      highlight: "is watering the flowers",
      translation: "Chị gái tôi đang tưới hoa ngoài ban công.",
    },
    {
      tense: "past_simple",
      formula: "S + V2/ed + O",
      sentence: "He gave me a gorgeous bunch of flowers on my birthday.",
      highlight: "gave me a gorgeous bunch of flowers",
      translation: "Anh ấy đã tặng tôi một bó hoa rực rỡ vào ngày sinh nhật.",
    },
  ],

  // Deck 2: IELTS Speaking
  describe: [
    {
      tense: "present_simple",
      formula: "S + V(s/es) + O",
      sentence: "This article clearly describes the benefits of daily exercise.",
      highlight: "clearly describes the benefits",
      translation: "Bài viết này miêu tả rõ ràng những lợi ích của việc tập thể dục hàng ngày.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + O",
      sentence: "The speaker is describing his memorable trip to Vietnam.",
      highlight: "is describing his memorable trip",
      translation: "Diễn giả đang miêu tả chuyến đi đáng nhớ của ông ấy tới Việt Nam.",
    },
    {
      tense: "past_simple",
      formula: "S + V2/ed + O",
      sentence: "Yesterday, the candidate described her hometown in IELTS Part 2.",
      highlight: "described her hometown",
      translation: "Hôm qua, thí sinh đã miêu tả quê hương của mình trong phần thi IELTS Part 2.",
    },
  ],
  prefer: [
    {
      tense: "present_simple",
      formula: "S + prefer + N + to + N",
      sentence: "I prefer hot tea to iced coffee in the winter.",
      highlight: "prefer hot tea to iced coffee",
      translation: "Tôi thích trà nóng hơn cà phê đá vào mùa đông.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + starting to prefer...",
      sentence: "More and more commuters are preferring public transport nowadays.",
      highlight: "are preferring public transport",
      translation: "Ngày càng nhiều người đi làm đang dần ưa chuộng phương tiện công cộng hơn hiện nay.",
    },
    {
      tense: "past_simple",
      formula: "S + preferred + N / V-ing",
      sentence: "When she was young, she always preferred drawing to singing.",
      highlight: "always preferred drawing",
      translation: "Khi còn nhỏ, cô ấy luôn thích vẽ hơn ca hát.",
    },
  ],
  opinion: [
    {
      tense: "present_simple",
      formula: "In my opinion, S + V...",
      sentence: "In my opinion, regular practice leads to fluency.",
      highlight: "In my opinion",
      translation: "Theo ý kiến của tôi, việc luyện tập đều đặn sẽ mang lại sự lưu loát.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + expressing one's opinion",
      sentence: "The students are expressing their opinions on online learning.",
      highlight: "are expressing their opinions",
      translation: "Các bạn học sinh đang bày tỏ ý kiến của mình về việc học trực tuyến.",
    },
    {
      tense: "past_simple",
      formula: "S + shared/asked for + opinion",
      sentence: "He asked for my opinion before making the final decision.",
      highlight: "asked for my opinion",
      translation: "Anh ấy đã hỏi ý kiến của tôi trước khi đưa ra quyết định cuối cùng.",
    },
  ],
  convenient: [
    {
      tense: "present_simple",
      formula: "S + is/are + convenient + for/to...",
      sentence: "Online shopping is very convenient for busy workers.",
      highlight: "is very convenient",
      translation: "Mua sắm trực tuyến rất thuận tiện cho người đi làm bận rộn.",
    },
    {
      tense: "present_continuous",
      formula: "S + is/are + becoming + more convenient",
      sentence: "Modern technology is making our daily lives more convenient.",
      highlight: "is making our daily lives more convenient",
      translation: "Công nghệ hiện đại đang làm cho cuộc sống hàng ngày của chúng ta ngày càng thuận tiện hơn.",
    },
    {
      tense: "past_simple",
      formula: "S + was/were + convenient",
      sentence: "The location of that hotel was extremely convenient for our trip.",
      highlight: "was extremely convenient",
      translation: "Vị trí của khách sạn đó đã vô cùng thuận tiện cho chuyến đi của chúng tôi.",
    },
  ],
  beneficial: [
    {
      tense: "present_simple",
      formula: "S + is/are + beneficial + to/for...",
      sentence: "Daily reading is beneficial for expanding your vocabulary.",
      highlight: "is beneficial for expanding",
      translation: "Đọc sách mỗi ngày rất có lợi cho việc mở rộng vốn từ vựng của bạn.",
    },
    {
      tense: "present_continuous",
      formula: "S + is/are + proving + beneficial",
      sentence: "The new study method is proving beneficial to all students.",
      highlight: "is proving beneficial",
      translation: "Phương pháp học mới này đang chứng minh là rất có lợi cho tất cả học sinh.",
    },
    {
      tense: "past_simple",
      formula: "S + was/were + beneficial",
      sentence: "The internship was very beneficial to his future career.",
      highlight: "was very beneficial",
      translation: "Kỳ thực tập đó đã rất có lợi đối với sự nghiệp tương lai của anh ấy.",
    },
  ],

  // Deck 3: CNTT
  algorithm: [
    {
      tense: "present_simple",
      formula: "S + V(s/es) + O",
      sentence: "This search algorithm processes millions of queries every second.",
      highlight: "algorithm processes millions of queries",
      translation: "Thuật toán tìm kiếm này xử lý hàng triệu truy vấn mỗi giây.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + O",
      sentence: "The AI team is optimizing the recommendation algorithm right now.",
      highlight: "is optimizing the recommendation algorithm",
      translation: "Đội ngũ AI đang tối ưu hóa thuật toán gợi ý ngay lúc này.",
    },
    {
      tense: "past_simple",
      formula: "S + V2/ed + O",
      sentence: "He designed a new sorting algorithm for his graduation project.",
      highlight: "designed a new sorting algorithm",
      translation: "Anh ấy đã thiết kế một thuật toán sắp xếp mới cho đồ án tốt nghiệp của mình.",
    },
  ],
  database: [
    {
      tense: "present_simple",
      formula: "S + V(s/es) + O + in + database",
      sentence: "The backend server stores user accounts in a secure database.",
      highlight: "stores user accounts in a secure database",
      translation: "Máy chủ backend lưu trữ tài khoản người dùng trong một cơ sở dữ liệu bảo mật.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + database",
      sentence: "The engineer is migrating the database to the cloud server.",
      highlight: "is migrating the database",
      translation: "Kỹ sư đang di chuyển cơ sở dữ liệu lên máy chủ đám mây.",
    },
    {
      tense: "past_simple",
      formula: "S + V2/ed + O",
      sentence: "They backed up the entire customer database at midnight.",
      highlight: "backed up the entire customer database",
      translation: "Họ đã sao lưu toàn bộ cơ sở dữ liệu khách hàng lúc nửa đêm.",
    },
  ],
  variable: [
    {
      tense: "present_simple",
      formula: "S + V(s/es) + O",
      sentence: "A constant variable prevents unexpected value changes in JavaScript.",
      highlight: "variable prevents unexpected value changes",
      translation: "Biến hằng số ngăn chặn những thay đổi giá trị ngoài ý muốn trong JavaScript.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + variable",
      sentence: "I am renaming this variable to make the code easier to understand.",
      highlight: "am renaming this variable",
      translation: "Tôi đang đổi tên biến này để code dễ hiểu hơn.",
    },
    {
      tense: "past_simple",
      formula: "S + V2/ed + O",
      sentence: "She declared a local variable inside the loop yesterday.",
      highlight: "declared a local variable",
      translation: "Cô ấy đã khai báo một biến cục bộ bên trong vòng lặp ngày hôm qua.",
    },
  ],
  function: [
    {
      tense: "present_simple",
      formula: "S + V(s/es) + O",
      sentence: "This utility function calculates the distance between two points.",
      highlight: "function calculates the distance",
      translation: "Hàm tiện ích này tính toán khoảng cách giữa hai điểm.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + function",
      sentence: "The developer is writing a recursive function to traverse the tree.",
      highlight: "is writing a recursive function",
      translation: "Lập trình viên đang viết một hàm đệ quy để duyệt cây.",
    },
    {
      tense: "past_simple",
      formula: "S + V2/ed + O",
      sentence: "We refactored that slow function to improve application speed.",
      highlight: "refactored that slow function",
      translation: "Chúng tôi đã cấu trúc lại hàm chạy chậm đó để tăng tốc ứng dụng.",
    },
  ],
  component: [
    {
      tense: "present_simple",
      formula: "S + V(s/es) + O",
      sentence: "React components manage their own state and render UI dynamically.",
      highlight: "components manage their own state",
      translation: "Các thành phần React tự quản lý trạng thái của mình và hiển thị giao diện linh hoạt.",
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + component",
      sentence: "He is building a reusable modal component for the design system.",
      highlight: "is building a reusable modal component",
      translation: "Anh ấy đang xây dựng một thành phần modal tái sử dụng cho hệ thống thiết kế.",
    },
    {
      tense: "past_simple",
      formula: "S + V2/ed + O",
      sentence: "We created a clean navigation component in the last sprint.",
      highlight: "created a clean navigation component",
      translation: "Chúng tôi đã tạo một thành phần điều hướng gọn gàng trong đợt phát triển vừa qua.",
    },
  ],
};

/**
 * Fallback generator nếu từ chưa có trong TENSE_EXAMPLES_MAP
 * Tạo 3 câu ngữ pháp chuẩn cho Hiện tại đơn, Hiện tại tiếp diễn, Quá khứ đơn
 */
function generateFallbackExamples(termEn, meaningVi) {
  const term = String(termEn || "").trim();
  const meaning = String(meaningVi || "").trim();
  const lower = term.toLowerCase();

  // Kiểm tra nếu là động từ thông thường
  const isVerb =
    lower.startsWith("to ") ||
    lower.endsWith("ize") ||
    lower.endsWith("ate") ||
    ["learn", "read", "write", "study", "speak", "cook", "walk", "play", "make", "work", "build"].includes(lower);

  if (isVerb) {
    const verbBase = lower.startsWith("to ") ? lower.slice(3) : lower;
    const verbThird = verbBase.endsWith("s") || verbBase.endsWith("sh") || verbBase.endsWith("ch")
      ? `${verbBase}es`
      : `${verbBase}s`;
    const verbIng = verbBase.endsWith("e") && !verbBase.endsWith("ee")
      ? `${verbBase.slice(0, -1)}ing`
      : `${verbBase}ing`;
    const verbEd = verbBase.endsWith("e")
      ? `${verbBase}d`
      : `${verbBase}ed`;

    return [
      {
        tense: "present_simple",
        formula: "S + V(s/es) + O",
        sentence: `He always ${verbThird} with great enthusiasm every day.`,
        highlight: verbThird,
        translation: `Anh ấy luôn ${meaning || term} với sự hào hứng lớn mỗi ngày.`,
      },
      {
        tense: "present_continuous",
        formula: "S + am/is/are + V-ing + O",
        sentence: `She is ${verbIng} very diligently right now.`,
        highlight: `is ${verbIng}`,
        translation: `Cô ấy đang ${meaning || term} rất chăm chỉ vào lúc này.`,
      },
      {
        tense: "past_simple",
        formula: "S + V2/ed + O",
        sentence: `They ${verbEd} together during the project yesterday.`,
        highlight: verbEd,
        translation: `Họ đã ${meaning || term} cùng nhau trong dự án ngày hôm qua.`,
      },
    ];
  }

  // Mặc định xem như danh từ / tính từ / khái niệm
  return [
    {
      tense: "present_simple",
      formula: "S + V(s/es) + [từ vựng] + ...",
      sentence: `I encounter this "${term}" frequently in my daily studies.`,
      highlight: term,
      translation: `Tôi gặp "${meaning || term}" này thường xuyên trong quá trình học hàng ngày.`,
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing + [từ vựng]...",
      sentence: `We are learning how to apply "${term}" in modern contexts right now.`,
      highlight: term,
      translation: `Chúng tôi đang học cách ứng dụng "${meaning || term}" trong bối cảnh hiện đại ngay bây giờ.`,
    },
    {
      tense: "past_simple",
      formula: "S + V2/ed + [từ vựng] + yesterday/last week",
      sentence: `The teacher explained "${term}" thoroughly during yesterday's lesson.`,
      highlight: term,
      translation: `Giáo viên đã giải thích "${meaning || term}" rất cặn kẽ trong buổi học ngày hôm qua.`,
    },
  ];
}

/**
 * Lấy danh sách 3 câu theo 3 thì cho một từ / thẻ
 * @param {object|string} cardOrTerm - Thẻ hoặc chuỗi term_en
 * @returns {Array<{ tense: string, formula: string, sentence: string, highlight?: string, translation: string }>}
 */
export function getTenseExamples(cardOrTerm) {
  if (!cardOrTerm) return [];

  // Nếu truyền object thẻ và đã có sẵn mảng examples chuẩn
  if (typeof cardOrTerm === "object" && Array.isArray(cardOrTerm.examples) && cardOrTerm.examples.length >= 3) {
    return cardOrTerm.examples;
  }

  const termEn = typeof cardOrTerm === "string" ? cardOrTerm : cardOrTerm.term_en || "";
  const meaningVi = typeof cardOrTerm === "object" ? cardOrTerm.meaning_vi : "";
  const cleanKey = termEn.trim().toLowerCase();

  if (TENSE_EXAMPLES_MAP[cleanKey]) {
    return TENSE_EXAMPLES_MAP[cleanKey];
  }

  // Tra cứu thử nếu term có chứa từ khóa
  for (const [key, examples] of Object.entries(TENSE_EXAMPLES_MAP)) {
    if (cleanKey === key || cleanKey.startsWith(`${key} `) || cleanKey.endsWith(` ${key}`)) {
      return examples;
    }
  }

  // Sinh câu dự phòng nếu từ chưa có trong danh mục mẫu
  return generateFallbackExamples(termEn, meaningVi);
}
