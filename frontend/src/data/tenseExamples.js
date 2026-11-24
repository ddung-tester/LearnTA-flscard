/**
 * tenseExamples.js
 * Câu mẫu 6 thì: HT đơn, HT tiếp diễn, QK đơn, QK tiếp diễn, HT hoàn thành, TL đơn.
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
  past_continuous: {
    key: "past_continuous",
    nameVi: "Quá khứ tiếp diễn",
    nameEn: "Past Continuous",
    badgeColor: "#7c3aed",
  },
  present_perfect: {
    key: "present_perfect",
    nameVi: "Hiện tại hoàn thành",
    nameEn: "Present Perfect",
    badgeColor: "#0f766e",
  },
  future_simple: {
    key: "future_simple",
    nameVi: "Tương lai đơn",
    nameEn: "Future Simple",
    badgeColor: "#be185d",
  },
};


// Động từ thông dụng — được kiểm tra trước suffix
const COMMON_VERBS = new Set([
  // Động từ bất quy tắc cơ bản
  "be", "do", "have", "go", "get", "make", "take", "come", "see", "know",
  "think", "look", "want", "give", "use", "find", "tell", "ask", "seem",
  "feel", "try", "leave", "call", "keep", "let", "begin", "show", "hear",
  "play", "run", "move", "live", "say", "put", "bring", "mean", "pay",
  "meet", "sit", "stand", "lose", "set", "read", "lead", "hold", "cut",
  "hit", "win", "ride", "fall", "send", "build", "spend", "grow", "buy",
  "wear", "catch", "drive", "break", "fly", "teach", "speak", "write",
  "choose", "sleep", "eat", "drink", "sell", "sing", "swim", "draw",
  "throw", "fight", "hide", "forget", "rise", "understand",
  // Động từ thường gặp trong học tiếng Anh
  "learn", "study", "speak", "cook", "walk", "work", "help", "need",
  "love", "like", "start", "stop", "open", "close", "visit", "watch",
  "listen", "practice", "exercise", "travel", "enjoy", "create", "design",
  "plan", "check", "fix", "save", "share", "search", "type", "test",
  "review", "manage", "improve", "increase", "reduce", "change", "add",
  "remove", "connect", "finish", "continue", "repeat", "remember",
  "push", "pull", "jump", "climb", "turn", "wait", "print",
  "copy", "delete", "download", "upload", "install", "update", "click",
  // Dễ nhầm với danh từ / tính từ — cần liệt kê rõ
  "believe", "achieve", "receive", "perceive", "conceive", "deceive",
  "relieve", "retrieve", "grieve", "behave", "observe", "preserve",
  "deserve", "serve", "reserve", "solve", "resolve", "involve", "evolve",
  "approve", "improve", "prove", "move", "remove", "grove",
  "decide", "provide", "divide", "guide", "ride", "slide", "hide",
  "describe", "subscribe", "inscribe", "prescribe",
  "produce", "reduce", "introduce", "reproduce",
  "complete", "compete", "delete", "create", "relate", "translate",
  "generate", "operate", "celebrate", "communicate", "participate",
  "indicate", "educate", "motivate", "investigate", "demonstrate",
  "allow", "follow", "borrow", "throw", "grow", "show", "know",
  "respond", "correspond", "depend", "extend", "attend", "pretend",
  "intend", "spend", "blend", "defend", "recommend", "understand",
  "consider", "wonder", "cover", "discover", "recover", "deliver",
  "remember", "prefer", "refer", "differ", "offer", "suffer", "transfer",
  "appear", "disappear", "fear", "hear", "clear", "cheer",
  "support", "report", "export", "import", "transport", "sort",
  "accept", "expect", "respect", "protect", "correct", "connect", "collect",
  "select", "detect", "affect", "reflect", "reject", "object", "project",
  "suggest", "request", "protest", "invest", "rest", "test", "arrest",
  "express", "impress", "stress", "access", "process", "progress",
  "discuss", "miss", "pass", "class", "address",
  "explain", "remain", "obtain", "contain", "maintain", "complain",
  "entertain", "sustain", "train", "gain", "obtain",
  "confirm", "perform", "reform", "inform", "transform",
  "climb", "combine", "define", "design", "imagine", "examine",
  "challenge", "encourage", "engage", "manage", "arrange", "change",
  "exchange", "range", "damage", "judge", "acknowledge",
  "admit", "commit", "permit", "submit", "transmit", "emit", "omit",
  "control", "enroll", "scroll", "patrol",
  "dream", "scream", "stream", "team", "seem",
  "enjoy", "deploy", "destroy", "employ", "annoy",
  "carry", "hurry", "worry", "marry", "bury", "copy", "reply", "supply",
  "apply", "comply", "imply", "multiply", "satisfy", "classify",
  "identify", "justify", "notify", "qualify", "verify",
]);

// Tính từ thông dụng
const COMMON_ADJECTIVES = new Set([
  // Cơ bản
  "good", "bad", "big", "small", "large", "little", "long", "short",
  "high", "low", "old", "young", "new", "fast", "slow", "hot", "cold",
  "warm", "cool", "hard", "soft", "easy", "difficult", "heavy", "light",
  "dark", "bright", "clean", "dirty", "rich", "poor", "busy", "free",
  "happy", "sad", "angry", "tired", "sick", "safe", "smart", "kind",
  "brave", "tall", "wide", "deep", "flat", "round", "sharp", "thin",
  "thick", "rough", "smooth", "sweet", "sour", "bitter", "spicy",
  "loud", "quiet", "early", "late", "far", "near", "true", "false",
  "right", "wrong", "real", "fake", "full", "empty", "open", "closed",
  // Nâng cao
  "beautiful", "ugly", "wonderful", "terrible", "horrible", "amazing",
  "fantastic", "excellent", "perfect", "terrible", "awful", "great",
  "important", "famous", "popular", "common", "special", "normal",
  "natural", "local", "global", "digital", "physical", "mental", "social",
  "economic", "political", "cultural", "historical", "traditional",
  "modern", "ancient", "recent", "current", "future", "previous",
  "first", "last", "next", "main", "major", "minor", "basic", "simple",
  "complex", "strange", "unusual", "interesting", "boring", "exciting",
  "creative", "innovative", "effective", "efficient", "successful",
  "healthy", "wealthy", "powerful", "peaceful", "dangerous", "serious",
  "funny", "silly", "clever", "wise", "polite", "rude", "friendly",
  "lonely", "lovely", "lively", "lovely", "ugly", "tiny", "mighty",
  "worthy", "costly", "messy", "noisy", "lucky", "tricky", "cozy",
]);


// ---------------------------------------------------------------------------
// Nhận diện loại từ (POS) — thứ tự ưu tiên: to+verb > COMMON_VERBS > COMMON_ADJECTIVES > suffix verb > suffix adj > noun
// ---------------------------------------------------------------------------
function detectPOS(lower) {
  // "to run", "to believe" — rõ ràng là động từ
  if (lower.startsWith("to ")) return "verb";

  // Kiểm tra danh sách tường minh trước (chính xác nhất)
  if (COMMON_VERBS.has(lower)) return "verb";
  if (COMMON_ADJECTIVES.has(lower)) return "adjective";

  // Suffix động từ — kiểm tra trước suffix tính từ
  if (
    lower.endsWith("ize") || lower.endsWith("ise") ||
    lower.endsWith("ate") || lower.endsWith("ify") ||
    lower.endsWith("fy")  || lower.endsWith("efy") ||
    lower.endsWith("en")  ||                              // brighten, widen, happen
    lower.endsWith("eer") || lower.endsWith("ure") ||    // volunteer, ensure
    lower.endsWith("ieve") || lower.endsWith("eive") ||  // believe, receive
    lower.endsWith("cede") || lower.endsWith("ceed") ||  // proceed, exceed
    lower.endsWith("form") || lower.endsWith("duct") ||  // perform, conduct
    lower.endsWith("pose") || lower.endsWith("pose") ||  // compose, propose
    lower.endsWith("duce") || lower.endsWith("scribe") || // produce, describe
    lower.endsWith("fend") || lower.endsWith("tend") ||  // defend, attend
    lower.endsWith("spond") || lower.endsWith("nect")    // respond, connect
  ) return "verb";

  // Suffix tính từ
  if (
    lower.endsWith("ful")  || lower.endsWith("less") ||
    lower.endsWith("ous")  || lower.endsWith("ive")  ||
    lower.endsWith("ible") || lower.endsWith("able") ||
    lower.endsWith("ic")   || lower.endsWith("ical") ||
    lower.endsWith("ent")  || lower.endsWith("ant")  ||
    lower.endsWith("ish")  || lower.endsWith("some") ||
    lower.endsWith("ward") || lower.endsWith("wise") ||
    lower.endsWith("most") || lower.endsWith("like") ||
    // tính từ kết thúc "-al" nhưng tránh nhầm với noun (signal, animal)
    (lower.endsWith("al") && lower.length > 5 && !/signal|animal|metal|final|canal|oval|rival|total|equal|focal|legal|moral|rural|tonal|viral|banal|naval|papal|penal|regal|tidal|vegal|zonal/.test(lower))
  ) return "adjective";

  return "noun";
}

/** Metadata cho từng loại từ — dùng để hiển thị badge */
export const POS_META = {
  verb:      { nameVi: "Động từ", nameEn: "verb",      abbr: "v.",   color: "#0284c7" },
  adjective: { nameVi: "Tính từ", nameEn: "adjective", abbr: "adj.", color: "#0f766e" },
  noun:      { nameVi: "Danh từ", nameEn: "noun",      abbr: "n.",   color: "#b45309" },
};

/** Loại từ đã lưu trong thẻ (part_of_speech) nếu khuôn câu dự phòng có hỗ trợ, không thì đoán theo chữ */
function chonPOS(lower, partOfSpeech) {
  const daLuu = String(partOfSpeech || "").trim().toLowerCase();
  return POS_META[daLuu] ? daLuu : detectPOS(lower);
}

/** API public: nhận diện loại từ cho một từ tiếng Anh (ưu tiên part_of_speech của thẻ) */
export function getWordType(termEn, partOfSpeech) {
  if (!termEn) return null;
  const lower = String(termEn).trim().toLowerCase();
  // Trường hợp "to + verb"
  const base = lower.startsWith("to ") ? lower.slice(3) : lower;
  const pos = chonPOS(base, partOfSpeech);
  return { pos, ...POS_META[pos] };
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
 * @returns {Array<{ tense, formula, sentence, highlight?, translation }>} — 6 phần tử
 */
export function getTenseExamples(cardOrTerm) {
  if (!cardOrTerm) return [];

  const termEn = typeof cardOrTerm === "string" ? cardOrTerm : cardOrTerm.term_en || "";
  const cleanKey = termEn.trim().toLowerCase();

  // 1. Ưu tiên cao nhất: dùng câu mẫu AI/chuẩn đã lưu trong DB
  if (typeof cardOrTerm === "object") {
    const saved = cardOrTerm.tense_examples || cardOrTerm.examples;
    if (Array.isArray(saved) && saved.length >= 6) return saved;
  }

  // 2. Lấy base từ bảng cố định
  let base = null;
  if (typeof cardOrTerm === "object" && Array.isArray(cardOrTerm.examples) && cardOrTerm.examples.length >= 3) {
    base = cardOrTerm.examples;
  } else if (TENSE_EXAMPLES_MAP[cleanKey]) {
    base = TENSE_EXAMPLES_MAP[cleanKey];
  } else {
    for (const [key, exs] of Object.entries(TENSE_EXAMPLES_MAP)) {
      if (cleanKey.startsWith(`${key} `) || cleanKey.endsWith(` ${key}`)) {
        base = exs;
        break;
      }
    }
  }

  // 3. Không có câu soạn sẵn: không tự ghép câu theo khuôn nữa — khuôn cũ sinh câu sai ngữ pháp/vô nghĩa
  //    ("I use a hour every day", "He bought a grandmother yesterday"), dạy sai người mới học
  //    (audit 18/11/2026, BUG-06). Thẻ không có ví dụ 6 thì thì khối ví dụ ẩn đi; dùng
  //    "Sinh câu ví dụ AI" ở trang Thêm từ hoặc script seed:ai-examples để có câu chuẩn.
  return base || [];
}

