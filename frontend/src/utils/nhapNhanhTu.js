/**
 * nhapNhanhTu.js — Phân tích danh sách từ dán vào (giống luyentu) và lọc từ trùng.
 *
 * Mỗi dòng một từ. Hỗ trợ:
 *   - Đủ cột, cách bằng "|" hoặc Tab (dán từ Excel):
 *       từ | /phiên âm/ | loại từ | nghĩa | ví dụ | ghi chú   (cột nào trống cũng được)
 *   - 3 cột: từ | nghĩa | ví dụ
 *   - 2 cột: "từ - nghĩa", "từ, nghĩa", "từ | nghĩa", "từ<Tab>nghĩa"
 */

const DO_DAI_TOI_DA = { term_en: 255, meaning_vi: 255, pronunciation: 255, part_of_speech: 50 };

export const MAU_DAN_NHANH = "từ vựng | /phiên âm/ | loại từ | nghĩa | ví dụ | ghi chú";

export const PROMPT_CHATGPT = `Hãy tạo danh sách từ vựng tiếng Anh về chủ đề: [ĐIỀN CHỦ ĐỀ], khoảng 20 từ.
Mỗi dòng đúng 1 từ, các cột cách nhau bằng dấu |, theo thứ tự:
từ vựng | /phiên âm IPA/ | loại từ | nghĩa tiếng Việt | câu ví dụ tiếng Anh có chứa từ đó | ghi chú (đồng nghĩa, trái nghĩa)
Không đánh số, không thêm dòng tiêu đề, không giải thích gì thêm.
Ví dụ:
apple | /ˈæp.əl/ | noun | quả táo | I eat an apple every morning. | Đồng nghĩa: không có`;

function tachCot(noiDung) {
  if (noiDung.includes("|")) return noiDung.split("|").map((cot) => cot.trim());
  if (noiDung.includes("\t")) return noiDung.split("\t").map((cot) => cot.trim());

  const hai = noiDung.match(/^(.+?)\s*(?:\s-\s|,)\s*(.+)$/);
  return hai ? [hai[1].trim(), hai[2].trim()] : [noiDung];
}

function taoTu(cot) {
  if (cot.length >= 4) {
    const [term_en, pronunciation, part_of_speech, meaning_vi, example_sentence = "", ...ghiChu] = cot;
    return {
      term_en,
      pronunciation,
      part_of_speech,
      meaning_vi,
      example_sentence,
      note: ghiChu.filter(Boolean).join(" | "),
    };
  }

  const [term_en = "", meaning_vi = "", example_sentence = ""] = cot;
  return { term_en, pronunciation: "", part_of_speech: "", meaning_vi, example_sentence, note: "" };
}

function kiemTraTu(tu) {
  if (!tu.term_en) return "Thiếu từ tiếng Anh";
  if (!tu.meaning_vi) return "Thiếu nghĩa";
  for (const [truong, toiDa] of Object.entries(DO_DAI_TOI_DA)) {
    if ((tu[truong] || "").length > toiDa) return `Quá dài (tối đa ${toiDa} ký tự)`;
  }
  return "";
}

/**
 * @returns {{ hopLe: Object[], loi: { dong: number, noiDung: string, lyDo: string }[] }}
 */
export function phanTichDanNhanh(vanBan) {
  const hopLe = [];
  const loi = [];

  String(vanBan || "")
    .split(/\r?\n/)
    .forEach((dongGoc, index) => {
      const noiDung = dongGoc.trim();
      if (!noiDung) return;

      const tu = taoTu(tachCot(noiDung));
      const lyDo = kiemTraTu(tu);
      if (lyDo) loi.push({ dong: index + 1, noiDung, lyDo });
      else hopLe.push(tu);
    });

  return { hopLe, loi };
}

function khoaTu(tu) {
  const term = String(tu.term_en || "").trim().toLowerCase().replace(/\s+/g, " ");
  const loaiTu = String(tu.part_of_speech || "").trim().toLowerCase();
  return `${term}|${loaiTu}`;
}

/**
 * Loại từ trùng (cùng từ tiếng Anh và cùng loại từ) với bộ từ hiện có và trong chính danh sách mới.
 * Từ hiện có chưa ghi loại từ thì trùng với mọi loại từ của cùng từ đó.
 * @returns {{ moi: Object[], trung: Object[] }}
 */
export function locTuTrung(danhSachMoi, danhSachHienCo = []) {
  const daCo = new Set(danhSachHienCo.map(khoaTu));
  const tuDaCoKhongLoai = new Set(
    danhSachHienCo.filter((tu) => !tu.part_of_speech).map((tu) => khoaTu({ term_en: tu.term_en }))
  );
  const moi = [];
  const trung = [];

  for (const tu of danhSachMoi) {
    const khoa = khoaTu(tu);
    const khoaKhongLoai = khoaTu({ term_en: tu.term_en });
    if (daCo.has(khoa) || tuDaCoKhongLoai.has(khoaKhongLoai)) {
      trung.push(tu);
      continue;
    }
    daCo.add(khoa);
    moi.push(tu);
  }

  return { moi, trung };
}
