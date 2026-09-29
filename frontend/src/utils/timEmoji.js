import { EMOJI_TU_VUNG } from "../data/emojiTuVung";

// Các dạng gốc có thể của một từ đã chia (ước lượng, thử lần lượt)
function dangGoc(tu) {
  const ds = [tu];
  const them = (re, thay) => {
    if (re.test(tu)) ds.push(tu.replace(re, thay));
  };
  them(/ies$/, "y");
  them(/(s|x|z|ch|sh)es$/, "$1");
  them(/s$/, "");
  them(/ied$/, "y");
  them(/([^aeiou])\1ed$/, "$1");
  them(/ed$/, "e");
  them(/ed$/, "");
  them(/([^aeiou])\1ing$/, "$1");
  them(/ing$/, "e");
  them(/ing$/, "");
  them(/ily$/, "y");
  them(/ly$/, "");
  return ds;
}

/**
 * Mã emoji động (vd. "1f34e") cho một từ/cụm từ tiếng Anh, null nếu không có.
 * Thử: nguyên cụm → bỏ "to "/mạo từ → dạng gốc → từ cuối của cụm ("junk foods" → "food").
 */
export function timEmoji(tuGoc) {
  const tu = String(tuGoc || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(to|a|an|the) /, "");
  if (!tu) return null;

  for (const dang of dangGoc(tu)) {
    if (EMOJI_TU_VUNG[dang]) return EMOJI_TU_VUNG[dang];
  }
  const cacTu = tu.split(" ");
  if (cacTu.length > 1) {
    for (const dang of dangGoc(cacTu[cacTu.length - 1])) {
      if (EMOJI_TU_VUNG[dang]) return EMOJI_TU_VUNG[dang];
    }
  }
  return null;
}

/** Ký tự emoji thật từ mã ("1f635_200d_1f4ab" → 😵‍💫), dùng khi chưa tải được hình động */
export function kyTuEmoji(ma) {
  return String.fromCodePoint(...ma.split("_").map((m) => parseInt(m, 16)));
}
