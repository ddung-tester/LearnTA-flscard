/**
 * tenseExamples.js
 * Câu mẫu 3 thì cơ bản: Hiện tại đơn, Hiện tại tiếp diễn, Quá khứ đơn.
 * Nguyên tắc: câu đơn giản, ngắn gọn, luôn chứa chính từ đang học.
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

// ---------------------------------------------------------------------------
// Bảng chia động từ bất quy tắc
// ---------------------------------------------------------------------------
const IRREGULAR_PAST = {
  run: "ran", go: "went", eat: "ate", drink: "drank", buy: "bought",
  sell: "sold", give: "gave", take: "took", find: "found", know: "knew",
  think: "thought", see: "saw", come: "came", get: "got", feel: "felt",
  become: "became", keep: "kept", put: "put", read: "read",
  write: "wrote", speak: "spoke", build: "built", make: "made",
  sit: "sat", stand: "stood", leave: "left", sleep: "slept",
  bring: "brought", tell: "told", teach: "taught", sing: "sang",
  swim: "swam", fly: "flew", draw: "drew", win: "won", meet: "met",
  hear: "heard", pay: "paid", say: "said", send: "sent", show: "showed",
  understand: "understood", begin: "began", break: "broke", choose: "chose",
  cut: "cut", hit: "hit", let: "let", set: "set", fall: "fell", hold: "held",
  lose: "lost", ride: "rode", rise: "rose", spend: "spent", wear: "wore",
  catch: "caught", fight: "fought", teach: "taught", throw: "threw",
  drive: "drove", forget: "forgot", grow: "grew", hide: "hid",
};

// Động từ thông dụng
const COMMON_VERBS = new Set([
  "learn", "read", "write", "study", "speak", "cook", "walk", "play",
  "make", "work", "build", "run", "go", "eat", "drink", "buy", "sell",
  "give", "take", "find", "know", "think", "see", "look", "come", "get",
  "try", "use", "ask", "need", "feel", "become", "show", "want", "help",
  "keep", "stay", "love", "like", "start", "stop", "open", "close",
  "put", "move", "live", "call", "meet", "tell", "send", "sit", "stand",
  "leave", "sleep", "bring", "teach", "sing", "swim", "fly", "draw",
  "win", "hear", "pay", "say", "understand", "begin", "break", "choose",
  "cut", "hit", "let", "set", "fall", "hold", "lose", "ride", "spend",
  "wear", "catch", "drive", "forget", "grow", "hide", "throw", "fight",
  "push", "pull", "jump", "climb", "ride", "turn", "wait", "visit",
  "watch", "listen", "practice", "exercise", "travel", "enjoy", "create",
  "design", "plan", "check", "fix", "save", "delete", "copy", "share",
  "download", "upload", "install", "update", "login", "search", "click",
  "type", "print", "scan", "test", "review", "manage", "control",
  "improve", "increase", "reduce", "change", "add", "remove", "connect",
  "complete", "finish", "continue", "stop", "repeat", "remember", "forget",
]);

// ---------------------------------------------------------------------------
// Hàm chia động từ
// ---------------------------------------------------------------------------
function getThirdPerson(verb) {
  const v = verb.toLowerCase();
  if (["go", "do"].includes(v)) return `${v}es`;
  if (v.endsWith("s") || v.endsWith("sh") || v.endsWith("ch") || v.endsWith("x") || v.endsWith("z")) {
    return `${v}es`;
  }
  if (v.endsWith("y") && !/[aeiou]y$/i.test(v)) {
    return `${v.slice(0, -1)}ies`;
  }
  return `${v}s`;
}

function getIngForm(verb) {
  const v = verb.toLowerCase();
  if (v.endsWith("ie")) return `${v.slice(0, -2)}ying`;
  if (v === "be") return "being";
  if (v.endsWith("e") && !v.endsWith("ee") && !v.endsWith("oe") && v !== "age") {
    return `${v.slice(0, -1)}ing`;
  }
  // Nhân đôi phụ âm cuối (1 âm tiết, nguyên âm + phụ âm)
  if (
    v.length <= 6 &&
    /[aeiou][bcdfghjklmnpqrstvwxyz]$/.test(v) &&
    !/[wxy]$/.test(v)
  ) {
    return `${v}${v.slice(-1)}ing`;
  }
  return `${v}ing`;
}

function getPastForm(verb) {
  const v = verb.toLowerCase();
  if (IRREGULAR_PAST[v]) return IRREGULAR_PAST[v];
  if (v.endsWith("e")) return `${v}d`;
  if (v.endsWith("y") && !/[aeiou]y$/i.test(v)) return `${v.slice(0, -1)}ied`;
  // Nhân đôi phụ âm cuối
  if (
    v.length <= 5 &&
    /[aeiou][bcdfghjklmnpqrstvwxyz]$/.test(v) &&
    !/[wxy]$/.test(v)
  ) {
    return `${v}${v.slice(-1)}ed`;
  }
  return `${v}ed`;
}

// ---------------------------------------------------------------------------
// Nhận diện loại từ
// ---------------------------------------------------------------------------
function detectPOS(lower) {
  if (lower.startsWith("to ")) return "verb";

  const verbBase = lower;
  if (COMMON_VERBS.has(verbBase)) return "verb";
  if (
    lower.endsWith("ize") || lower.endsWith("ise") ||
    lower.endsWith("ate") || lower.endsWith("ify") ||
    lower.endsWith("fy")
  ) return "verb";

  if (
    lower.endsWith("ful") || lower.endsWith("less") ||
    lower.endsWith("ous") || lower.endsWith("ive") ||
    lower.endsWith("ible") || lower.endsWith("able") ||
    lower.endsWith("ic") || lower.endsWith("ical") ||
    lower.endsWith("ent") || lower.endsWith("ant") ||
    lower.endsWith("ish") || lower.endsWith("al") ||
    [
      "happy", "sad", "big", "small", "good", "bad", "fast", "slow",
      "old", "new", "hot", "cold", "easy", "hard", "smart", "kind",
      "brave", "free", "safe", "clean", "dirty", "heavy", "light",
      "tall", "short", "long", "young", "rich", "poor", "busy",
    ].includes(lower)
  ) return "adjective";

  return "noun";
}

// ---------------------------------------------------------------------------
// Sinh câu mẫu dự phòng — đơn giản, luôn chứa từ đang học
// ---------------------------------------------------------------------------
function generateFallbackExamples(termEn, meaningVi) {
  const term = String(termEn || "").trim();
  if (!term) return [];

  const lower = term.toLowerCase();
  const meaning = String(meaningVi || "").trim();
  const pos = detectPOS(lower);

  // --- ĐỘNG TỪ ---
  if (pos === "verb") {
    const base = lower.startsWith("to ") ? lower.slice(3) : lower;
    const third = getThirdPerson(base);
    const ing = getIngForm(base);
    const past = getPastForm(base);
    const meanLabel = meaning || base;

    return [
      {
        tense: "present_simple",
        formula: "S + V(s/es)",
        sentence: `I ${base} every day.`,
        highlight: base,
        translation: `Tôi ${meanLabel} mỗi ngày.`,
      },
      {
        tense: "present_continuous",
        formula: "S + am/is/are + V-ing",
        sentence: `She is ${ing} right now.`,
        highlight: `is ${ing}`,
        translation: `Cô ấy đang ${meanLabel} lúc này.`,
      },
      {
        tense: "past_simple",
        formula: "S + V2/V-ed",
        sentence: `He ${past} yesterday.`,
        highlight: past,
        translation: `Anh ấy đã ${meanLabel} hôm qua.`,
      },
    ];
  }

  // --- TÍNH TỪ ---
  if (pos === "adjective") {
    const meanLabel = meaning || lower;
    return [
      {
        tense: "present_simple",
        formula: "S + is/are + adj",
        sentence: `She is very ${lower} today.`,
        highlight: lower,
        translation: `Cô ấy rất ${meanLabel} hôm nay.`,
      },
      {
        tense: "present_continuous",
        formula: "S + is/are + becoming + adj",
        sentence: `The weather is becoming ${lower} now.`,
        highlight: lower,
        translation: `Thời tiết đang trở nên ${meanLabel} bây giờ.`,
      },
      {
        tense: "past_simple",
        formula: "S + was/were + adj",
        sentence: `He was very ${lower} yesterday.`,
        highlight: lower,
        translation: `Anh ấy đã rất ${meanLabel} hôm qua.`,
      },
    ];
  }

  // --- DANH TỪ / KHÁI NIỆM ---
  const article = /^[aeiou]/i.test(lower) ? "an" : "a";
  const meanLabel = meaning || lower;

  // Phân nhóm danh từ để sinh câu tự nhiên hơn
  const DIRECTION_WORDS = new Set(["north", "south", "east", "west", "left", "right", "center", "middle"]);
  const ABSTRACT_WORDS = new Set(["time", "life", "love", "peace", "freedom", "truth", "success", "health", "wealth", "luck", "hope", "fear", "joy", "anger", "pride", "shame", "faith", "beauty", "power", "energy"]);
  const PLACE_SUFFIXES = ["tion", "land", "side", "town", "city", "park", "road", "street", "way", "room", "ward", "yard", "field", "ground", "area"];
  const isDirection = DIRECTION_WORDS.has(lower);
  const isAbstract = ABSTRACT_WORDS.has(lower);
  const isPlace = PLACE_SUFFIXES.some(s => lower.endsWith(s));

  if (isDirection) {
    return [
      {
        tense: "present_simple",
        formula: "S + V(s/es)",
        sentence: `The sun rises in the ${lower} every morning.`,
        highlight: lower,
        translation: `Mặt trời mọc ở phía ${meanLabel} mỗi sáng.`,
      },
      {
        tense: "present_continuous",
        formula: "S + am/is/are + V-ing",
        sentence: `We are heading ${lower} right now.`,
        highlight: lower,
        translation: `Chúng tôi đang đi về phía ${meanLabel} lúc này.`,
      },
      {
        tense: "past_simple",
        formula: "S + V2/V-ed",
        sentence: `They traveled ${lower} last summer.`,
        highlight: lower,
        translation: `Họ đã du lịch về phía ${meanLabel} mùa hè năm ngoái.`,
      },
    ];
  }

  if (isAbstract) {
    return [
      {
        tense: "present_simple",
        formula: "S + V(s/es)",
        sentence: `Everyone values ${lower} in life.`,
        highlight: lower,
        translation: `Mọi người đều trân trọng ${meanLabel} trong cuộc sống.`,
      },
      {
        tense: "present_continuous",
        formula: "S + am/is/are + V-ing",
        sentence: `She is finding ${lower} in small things.`,
        highlight: lower,
        translation: `Cô ấy đang tìm thấy ${meanLabel} trong những điều nhỏ bé.`,
      },
      {
        tense: "past_simple",
        formula: "S + V2/V-ed",
        sentence: `He learned the value of ${lower} last year.`,
        highlight: lower,
        translation: `Anh ấy đã nhận ra giá trị của ${meanLabel} năm ngoái.`,
      },
    ];
  }

  if (isPlace) {
    return [
      {
        tense: "present_simple",
        formula: "S + V(s/es)",
        sentence: `I visit the ${lower} every weekend.`,
        highlight: lower,
        translation: `Tôi đến ${meanLabel} mỗi cuối tuần.`,
      },
      {
        tense: "present_continuous",
        formula: "S + am/is/are + V-ing",
        sentence: `She is walking around the ${lower} right now.`,
        highlight: lower,
        translation: `Cô ấy đang đi dạo quanh ${meanLabel} lúc này.`,
      },
      {
        tense: "past_simple",
        formula: "S + V2/V-ed",
        sentence: `He visited the ${lower} last week.`,
        highlight: lower,
        translation: `Anh ấy đã đến ${meanLabel} tuần trước.`,
      },
    ];
  }

  // Danh từ vật thể thông thường
  return [
    {
      tense: "present_simple",
      formula: "S + V(s/es)",
      sentence: `I use ${article} ${lower} every day.`,
      highlight: lower,
      translation: `Tôi dùng ${meanLabel} mỗi ngày.`,
    },
    {
      tense: "present_continuous",
      formula: "S + am/is/are + V-ing",
      sentence: `She is looking at the ${lower} right now.`,
      highlight: lower,
      translation: `Cô ấy đang nhìn vào ${meanLabel} lúc này.`,
    },
    {
      tense: "past_simple",
      formula: "S + V2/V-ed",
      sentence: `He bought ${article} ${lower} yesterday.`,
      highlight: lower,
      translation: `Anh ấy đã mua ${meanLabel} hôm qua.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Bảng câu mẫu cố định — đơn giản, luôn chứa từ đang học
// ---------------------------------------------------------------------------
export const TENSE_EXAMPLES_MAP = {
  // ── Từ vựng cơ bản ────────────────────────────────────────────────────────
  apple: [
    { tense: "present_simple",    formula: "S + eat(s) + O",           sentence: "I eat an apple every morning.",          highlight: "apple", translation: "Tôi ăn một quả táo mỗi sáng." },
    { tense: "present_continuous", formula: "S + is/are + eating + O",  sentence: "She is eating an apple right now.",      highlight: "apple", translation: "Cô ấy đang ăn một quả táo lúc này." },
    { tense: "past_simple",       formula: "S + ate + O",              sentence: "He ate an apple yesterday.",             highlight: "apple", translation: "Anh ấy đã ăn một quả táo hôm qua." },
  ],
  book: [
    { tense: "present_simple",    formula: "S + read(s) + O",          sentence: "I read a book every night.",             highlight: "book", translation: "Tôi đọc một quyển sách mỗi tối." },
    { tense: "present_continuous", formula: "S + is/are + reading + O", sentence: "She is reading a book now.",            highlight: "book", translation: "Cô ấy đang đọc sách lúc này." },
    { tense: "past_simple",       formula: "S + read + O",             sentence: "He read a book last night.",            highlight: "book", translation: "Anh ấy đã đọc sách tối qua." },
  ],
  cat: [
    { tense: "present_simple",    formula: "S + have(has) + O",        sentence: "I have a cat at home.",                 highlight: "cat", translation: "Tôi có một con mèo ở nhà." },
    { tense: "present_continuous", formula: "S + is/are + playing",     sentence: "My cat is playing right now.",         highlight: "cat", translation: "Con mèo của tôi đang chơi lúc này." },
    { tense: "past_simple",       formula: "S + was/were + adj",       sentence: "The cat was very cute.",                highlight: "cat", translation: "Con mèo đó rất dễ thương." },
  ],
  dog: [
    { tense: "present_simple",    formula: "S + have(has) + O",        sentence: "I have a dog named Max.",               highlight: "dog", translation: "Tôi có một con chó tên Max." },
    { tense: "present_continuous", formula: "S + is/are + running",     sentence: "My dog is running in the garden.",     highlight: "dog", translation: "Con chó của tôi đang chạy ngoài vườn." },
    { tense: "past_simple",       formula: "S + walked + O",           sentence: "She walked her dog this morning.",     highlight: "dog", translation: "Cô ấy đã dắt chó đi dạo sáng nay." },
  ],
  elephant: [
    { tense: "present_simple",    formula: "S + is/are + adj/N",       sentence: "An elephant is a very big animal.",    highlight: "elephant", translation: "Con voi là một loài động vật rất lớn." },
    { tense: "present_continuous", formula: "S + is/are + V-ing",       sentence: "The elephant is drinking water.",      highlight: "elephant", translation: "Con voi đang uống nước." },
    { tense: "past_simple",       formula: "S + saw + O",              sentence: "We saw an elephant at the zoo.",       highlight: "elephant", translation: "Chúng tôi đã thấy một con voi ở sở thú." },
  ],
  flower: [
    { tense: "present_simple",    formula: "S + like(s) + O",          sentence: "I like this flower very much.",        highlight: "flower", translation: "Tôi rất thích bông hoa này." },
    { tense: "present_continuous", formula: "S + is/are + watering + O",sentence: "She is watering the flowers.",        highlight: "flowers", translation: "Cô ấy đang tưới hoa." },
    { tense: "past_simple",       formula: "S + gave + O + O",         sentence: "He gave me a flower yesterday.",       highlight: "flower", translation: "Anh ấy đã tặng tôi một bông hoa hôm qua." },
  ],
  water: [
    { tense: "present_simple",    formula: "S + drink(s) + O",         sentence: "I drink water every day.",             highlight: "water", translation: "Tôi uống nước mỗi ngày." },
    { tense: "present_continuous", formula: "S + is/are + drinking + O",sentence: "She is drinking water now.",          highlight: "water", translation: "Cô ấy đang uống nước lúc này." },
    { tense: "past_simple",       formula: "S + drank + O",            sentence: "He drank a lot of water yesterday.",  highlight: "water", translation: "Anh ấy đã uống nhiều nước hôm qua." },
  ],
  food: [
    { tense: "present_simple",    formula: "S + eat(s) + O",           sentence: "I eat healthy food every day.",        highlight: "food", translation: "Tôi ăn thức ăn lành mạnh mỗi ngày." },
    { tense: "present_continuous", formula: "S + is/are + cooking + O", sentence: "She is cooking food in the kitchen.", highlight: "food", translation: "Cô ấy đang nấu thức ăn trong bếp." },
    { tense: "past_simple",       formula: "S + bought + O",           sentence: "He bought food at the market.",        highlight: "food", translation: "Anh ấy đã mua thức ăn ở chợ." },
  ],
  house: [
    { tense: "present_simple",    formula: "S + live(s) + in + O",     sentence: "I live in a small house.",             highlight: "house", translation: "Tôi sống trong một ngôi nhà nhỏ." },
    { tense: "present_continuous", formula: "S + is/are + cleaning",    sentence: "She is cleaning the house now.",      highlight: "house", translation: "Cô ấy đang dọn nhà lúc này." },
    { tense: "past_simple",       formula: "S + built + O",            sentence: "They built this house last year.",     highlight: "house", translation: "Họ đã xây ngôi nhà này năm ngoái." },
  ],
  school: [
    { tense: "present_simple",    formula: "S + go(es) + to + O",      sentence: "I go to school every day.",            highlight: "school", translation: "Tôi đi học mỗi ngày." },
    { tense: "present_continuous", formula: "S + is/are + studying",    sentence: "She is studying at school now.",      highlight: "school", translation: "Cô ấy đang học ở trường lúc này." },
    { tense: "past_simple",       formula: "S + went + to + O",        sentence: "He went to school by bike yesterday.", highlight: "school", translation: "Anh ấy đã đạp xe đến trường hôm qua." },
  ],

  // ── IELTS / Từ học thuật ──────────────────────────────────────────────────
  describe: [
    { tense: "present_simple",    formula: "S + describe(s) + O",      sentence: "She describes the picture clearly.",   highlight: "describes", translation: "Cô ấy mô tả bức tranh rõ ràng." },
    { tense: "present_continuous", formula: "S + is/are + describing",  sentence: "He is describing his hometown.",      highlight: "describing", translation: "Anh ấy đang mô tả quê hương của mình." },
    { tense: "past_simple",       formula: "S + described + O",        sentence: "She described the photo yesterday.",   highlight: "described", translation: "Cô ấy đã mô tả bức ảnh hôm qua." },
  ],
  prefer: [
    { tense: "present_simple",    formula: "S + prefer(s) + A + to + B", sentence: "I prefer tea to coffee.",           highlight: "prefer", translation: "Tôi thích trà hơn cà phê." },
    { tense: "present_continuous", formula: "S + is/are + preferring",  sentence: "She is preferring to stay home now.",highlight: "preferring", translation: "Cô ấy đang muốn ở nhà hơn lúc này." },
    { tense: "past_simple",       formula: "S + preferred + O",        sentence: "He preferred coffee before.",          highlight: "preferred", translation: "Anh ấy đã thích cà phê hơn trước đây." },
  ],
  opinion: [
    { tense: "present_simple",    formula: "In my opinion, S + V",      sentence: "In my opinion, this is a good idea.", highlight: "opinion", translation: "Theo ý kiến của tôi, đây là một ý tưởng hay." },
    { tense: "present_continuous", formula: "S + is/are + sharing + opinion", sentence: "She is sharing her opinion now.", highlight: "opinion", translation: "Cô ấy đang chia sẻ ý kiến của mình lúc này." },
    { tense: "past_simple",       formula: "S + asked for + opinion",   sentence: "He asked for my opinion yesterday.",  highlight: "opinion", translation: "Anh ấy đã hỏi ý kiến của tôi hôm qua." },
  ],
  convenient: [
    { tense: "present_simple",    formula: "S + is/are + convenient",   sentence: "Online shopping is very convenient.", highlight: "convenient", translation: "Mua sắm online rất tiện lợi." },
    { tense: "present_continuous", formula: "S + is/are + getting + adj", sentence: "This app is getting more convenient.", highlight: "convenient", translation: "Ứng dụng này đang trở nên tiện lợi hơn." },
    { tense: "past_simple",       formula: "S + was/were + convenient", sentence: "The location was very convenient.",    highlight: "convenient", translation: "Vị trí đó đã rất tiện lợi." },
  ],
  beneficial: [
    { tense: "present_simple",    formula: "S + is/are + beneficial",   sentence: "Exercise is beneficial for health.",  highlight: "beneficial", translation: "Tập thể dục rất có lợi cho sức khỏe." },
    { tense: "present_continuous", formula: "S + is/are + proving + beneficial", sentence: "This habit is proving beneficial.", highlight: "beneficial", translation: "Thói quen này đang chứng minh là có lợi." },
    { tense: "past_simple",       formula: "S + was/were + beneficial", sentence: "The training was very beneficial.",    highlight: "beneficial", translation: "Buổi đào tạo đó đã rất có lợi." },
  ],
  advantage: [
    { tense: "present_simple",    formula: "S + have(has) + advantage", sentence: "This method has many advantages.",    highlight: "advantages", translation: "Phương pháp này có nhiều lợi thế." },
    { tense: "present_continuous", formula: "S + is/are + taking + advantage", sentence: "She is taking advantage of this opportunity.", highlight: "advantage", translation: "Cô ấy đang tận dụng cơ hội này." },
    { tense: "past_simple",       formula: "S + had + advantage",      sentence: "They had an advantage in the game.",    highlight: "advantage", translation: "Họ đã có lợi thế trong trò chơi đó." },
  ],
  environment: [
    { tense: "present_simple",    formula: "S + protect(s) + O",        sentence: "We must protect the environment.",    highlight: "environment", translation: "Chúng ta phải bảo vệ môi trường." },
    { tense: "present_continuous", formula: "S + is/are + harming + O", sentence: "Pollution is harming the environment.", highlight: "environment", translation: "Ô nhiễm đang gây hại cho môi trường." },
    { tense: "past_simple",       formula: "S + damaged + O",          sentence: "They damaged the environment badly.",   highlight: "environment", translation: "Họ đã phá hoại môi trường nghiêm trọng." },
  ],
  technology: [
    { tense: "present_simple",    formula: "S + use(s) + O",            sentence: "We use technology every day.",        highlight: "technology", translation: "Chúng ta dùng công nghệ mỗi ngày." },
    { tense: "present_continuous", formula: "S + is/are + changing",    sentence: "Technology is changing very fast.",   highlight: "technology", translation: "Công nghệ đang thay đổi rất nhanh." },
    { tense: "past_simple",       formula: "S + developed + O",        sentence: "They developed new technology.",       highlight: "technology", translation: "Họ đã phát triển công nghệ mới." },
  ],

  // ── CNTT / Lập trình ────────────────────────────────────────────────────
  algorithm: [
    { tense: "present_simple",    formula: "S + use(s) + O",            sentence: "We use an algorithm to sort data.",   highlight: "algorithm", translation: "Chúng ta dùng thuật toán để sắp xếp dữ liệu." },
    { tense: "present_continuous", formula: "S + is/are + writing + O", sentence: "She is writing an algorithm now.",    highlight: "algorithm", translation: "Cô ấy đang viết thuật toán lúc này." },
    { tense: "past_simple",       formula: "S + wrote + O",            sentence: "He wrote a simple algorithm yesterday.", highlight: "algorithm", translation: "Anh ấy đã viết một thuật toán đơn giản hôm qua." },
  ],
  database: [
    { tense: "present_simple",    formula: "S + store(s) + O + in + O", sentence: "We store user data in a database.",  highlight: "database", translation: "Chúng ta lưu dữ liệu người dùng trong cơ sở dữ liệu." },
    { tense: "present_continuous", formula: "S + is/are + updating + O", sentence: "She is updating the database now.", highlight: "database", translation: "Cô ấy đang cập nhật cơ sở dữ liệu lúc này." },
    { tense: "past_simple",       formula: "S + backed up + O",        sentence: "He backed up the database yesterday.", highlight: "database", translation: "Anh ấy đã sao lưu cơ sở dữ liệu hôm qua." },
  ],
  variable: [
    { tense: "present_simple",    formula: "S + use(s) + O",            sentence: "I use a variable to store the value.", highlight: "variable", translation: "Tôi dùng biến để lưu giá trị." },
    { tense: "present_continuous", formula: "S + is/are + declaring + O", sentence: "She is declaring a new variable.", highlight: "variable", translation: "Cô ấy đang khai báo một biến mới." },
    { tense: "past_simple",       formula: "S + defined + O",          sentence: "He defined the variable yesterday.",    highlight: "variable", translation: "Anh ấy đã định nghĩa biến đó hôm qua." },
  ],
  function: [
    { tense: "present_simple",    formula: "S + create(s) + O",         sentence: "I create a function to add numbers.", highlight: "function", translation: "Tôi tạo một hàm để cộng các số." },
    { tense: "present_continuous", formula: "S + is/are + writing + O", sentence: "She is writing a new function now.",   highlight: "function", translation: "Cô ấy đang viết một hàm mới lúc này." },
    { tense: "past_simple",       formula: "S + wrote + O",            sentence: "He wrote that function last week.",     highlight: "function", translation: "Anh ấy đã viết hàm đó tuần trước." },
  ],
  component: [
    { tense: "present_simple",    formula: "S + build(s) + O",          sentence: "I build a button component for the app.", highlight: "component", translation: "Tôi xây dựng một component nút bấm cho ứng dụng." },
    { tense: "present_continuous", formula: "S + is/are + building + O", sentence: "She is building a new component.",  highlight: "component", translation: "Cô ấy đang xây dựng một component mới." },
    { tense: "past_simple",       formula: "S + created + O",          sentence: "He created a simple component yesterday.", highlight: "component", translation: "Anh ấy đã tạo một component đơn giản hôm qua." },
  ],
};

// ---------------------------------------------------------------------------
// API chính: lấy danh sách 3 câu mẫu cho một thẻ hoặc từ
// ---------------------------------------------------------------------------
/**
 * @param {object|string} cardOrTerm - Thẻ học hoặc chuỗi term_en
 * @returns {Array<{ tense, formula, sentence, highlight?, translation }>}
 */
export function getTenseExamples(cardOrTerm) {
  if (!cardOrTerm) return [];

  // Thẻ đã có sẵn mảng examples chuẩn (3 phần tử)
  if (
    typeof cardOrTerm === "object" &&
    Array.isArray(cardOrTerm.examples) &&
    cardOrTerm.examples.length >= 3
  ) {
    return cardOrTerm.examples;
  }

  const termEn = typeof cardOrTerm === "string" ? cardOrTerm : cardOrTerm.term_en || "";
  const meaningVi = typeof cardOrTerm === "object" ? cardOrTerm.meaning_vi : "";
  const cleanKey = termEn.trim().toLowerCase();

  // Tra bảng cố định (exact match)
  if (TENSE_EXAMPLES_MAP[cleanKey]) return TENSE_EXAMPLES_MAP[cleanKey];

  // Tra bảng cố định (partial match)
  for (const [key, examples] of Object.entries(TENSE_EXAMPLES_MAP)) {
    if (cleanKey.startsWith(`${key} `) || cleanKey.endsWith(` ${key}`)) {
      return examples;
    }
  }

  // Sinh câu dự phòng thông minh
  return generateFallbackExamples(termEn, meaningVi);
}
