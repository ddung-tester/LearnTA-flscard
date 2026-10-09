/**
 * Luyện câu (nghe chép cả câu, nói theo): so câu người học viết/nói với câu mẫu theo từng từ.
 */

/** Bỏ dấu câu, đưa về chữ thường; giữ dấu nháy trong "don't", "it's". */
function chuanHoaTu(tu) {
  return String(tu || "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}']/gu, "")
    .replace(/^'+|'+$/g, "");
}

function tachTu(cau) {
  return String(cau || "")
    .split(/[\s—–]+/)
    .filter((tu) => chuanHoaTu(tu));
}

/**
 * Đánh dấu từng từ của câu mẫu là đúng (có trong câu trả lời, đúng thứ tự) hay sai/thiếu.
 * Dùng dãy con chung dài nhất nên một từ thừa hoặc thiếu không làm sai cả phần sau.
 * @returns {{ cacTu: Array<{ tu: string, dung: boolean }>, soDung: number, tongSo: number, tiLe: number }}
 */
export function soSanhTungTu(cauMau, cauTraLoi) {
  const tuMau = tachTu(cauMau);
  const mau = tuMau.map(chuanHoaTu);
  const traLoi = tachTu(cauTraLoi).map(chuanHoaTu);

  // bang[i][j] = độ dài dãy con chung dài nhất của mau[i..] và traLoi[j..]
  const bang = Array.from({ length: mau.length + 1 }, () => new Array(traLoi.length + 1).fill(0));
  for (let i = mau.length - 1; i >= 0; i -= 1) {
    for (let j = traLoi.length - 1; j >= 0; j -= 1) {
      bang[i][j] = mau[i] === traLoi[j]
        ? bang[i + 1][j + 1] + 1
        : Math.max(bang[i + 1][j], bang[i][j + 1]);
    }
  }

  const dung = new Array(mau.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < mau.length && j < traLoi.length) {
    if (mau[i] === traLoi[j]) {
      dung[i] = true;
      i += 1;
      j += 1;
    } else if (bang[i + 1][j] >= bang[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  const soDung = dung.filter(Boolean).length;
  return {
    cacTu: tuMau.map((tu, k) => ({ tu, dung: dung[k] })),
    soDung,
    tongSo: mau.length,
    tiLe: mau.length === 0 ? 0 : Math.round((soDung / mau.length) * 100),
  };
}

/** Câu đạt khi đúng ít nhất 80% số từ. */
export const TI_LE_DAT = 80;

/** Hàm tạo SpeechRecognition của trình duyệt (Chrome/Edge/Android), null nếu không hỗ trợ. */
export function layNhanDangGiongNoi() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}
