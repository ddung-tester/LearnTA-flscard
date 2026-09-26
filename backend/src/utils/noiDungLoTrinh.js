// Kiểm tra và nạp nội dung lộ trình (database/content/lo-trinh.json) vào DB.
// Chạy lại nhiều lần an toàn: khớp lộ trình theo slug, bộ từ theo deck_key, từ theo term_en.
// Không xoá từ đã có (người học có thể đã có tiến độ trên các từ đó).

const SLUG_HOP_LE = /^[a-z0-9-]{1,80}$/;
const GIOI_HAN = { term_en: 255, part_of_speech: 50, meaning_vi: 255 };

function thoatRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Cùng cách so khớp với chế độ Ngữ cảnh ở frontend (utils/phienHoc.cheTuTrongCau)
function cauChuaTu(cau, tu) {
  return new RegExp(`\\b${thoatRegex(tu)}`, "i").test(cau);
}

function chuanHoaTu([term_en, part_of_speech, meaning_vi, example_sentence, note = ""]) {
  return {
    term_en: String(term_en || "").trim(),
    part_of_speech: String(part_of_speech || "").trim(),
    meaning_vi: String(meaning_vi || "").trim(),
    example_sentence: String(example_sentence || "").trim(),
    note: String(note || "").trim(),
  };
}

function chuanHoaNoiDungLoTrinh(noiDung) {
  return (noiDung.roadmaps || []).map((loTrinh) => ({
    slug: loTrinh.slug,
    title: String(loTrinh.title || "").trim(),
    description: String(loTrinh.description || "").trim(),
    level_label: loTrinh.level_label ? String(loTrinh.level_label).trim() : null,
    decks: (loTrinh.decks || []).map((bo) => ({
      key: bo.key,
      title: String(bo.title || "").trim(),
      description: String(bo.description || "").trim(),
      words: (bo.words || []).map(chuanHoaTu),
    })),
  }));
}

/**
 * @returns {string[]} danh sách lỗi (rỗng nếu hợp lệ)
 */
function kiemTraNoiDungLoTrinh(noiDung) {
  const loi = [];
  const slugDaCo = new Set();
  const keyDaCo = new Set();

  if (!Array.isArray(noiDung?.roadmaps) || noiDung.roadmaps.length === 0) {
    return ["Thiếu mảng roadmaps"];
  }

  for (const loTrinh of chuanHoaNoiDungLoTrinh(noiDung)) {
    const noi = `Lộ trình "${loTrinh.slug}"`;
    if (!SLUG_HOP_LE.test(loTrinh.slug || "")) loi.push(`${noi}: slug không hợp lệ`);
    if (slugDaCo.has(loTrinh.slug)) loi.push(`${noi}: slug bị trùng`);
    slugDaCo.add(loTrinh.slug);
    if (!loTrinh.title) loi.push(`${noi}: thiếu title`);
    if (loTrinh.decks.length === 0) loi.push(`${noi}: chưa có bộ từ nào`);

    for (const bo of loTrinh.decks) {
      const noiBo = `Bộ "${bo.key}"`;
      if (!SLUG_HOP_LE.test(bo.key || "")) loi.push(`${noiBo}: key không hợp lệ`);
      if (keyDaCo.has(bo.key)) loi.push(`${noiBo}: key bị trùng`);
      keyDaCo.add(bo.key);
      if (!bo.title) loi.push(`${noiBo}: thiếu title`);
      if (bo.words.length === 0) loi.push(`${noiBo}: chưa có từ nào`);

      const tuDaCo = new Set();
      bo.words.forEach((tu, index) => {
        const noiTu = `${noiBo}, từ #${index + 1} "${tu.term_en}"`;
        if (!tu.term_en || !tu.meaning_vi) loi.push(`${noiTu}: thiếu từ hoặc nghĩa`);
        for (const [truong, toiDa] of Object.entries(GIOI_HAN)) {
          if (tu[truong].length > toiDa) loi.push(`${noiTu}: ${truong} quá ${toiDa} ký tự`);
        }
        const khoa = tu.term_en.toLowerCase();
        if (tuDaCo.has(khoa)) loi.push(`${noiTu}: bị trùng trong bộ`);
        tuDaCo.add(khoa);
        if (!tu.example_sentence) loi.push(`${noiTu}: thiếu câu ví dụ`);
        else if (!cauChuaTu(tu.example_sentence, tu.term_en)) {
          loi.push(`${noiTu}: câu ví dụ không chứa từ (chế độ Ngữ cảnh sẽ bỏ qua từ này)`);
        }
      });
    }
  }

  return loi;
}

async function napBoTu(connection, roadmapId, bo, thuTu, thongKe) {
  const [lienKet] = await connection.query(
    "SELECT id, deck_id FROM roadmap_decks WHERE deck_key = ? LIMIT 1",
    [bo.key]
  );

  let deckId;
  if (lienKet[0]) {
    deckId = lienKet[0].deck_id;
    await connection.execute("UPDATE decks SET title = ?, description = ? WHERE id = ?", [
      bo.title,
      bo.description,
      deckId,
    ]);
    await connection.execute(
      "UPDATE roadmap_decks SET roadmap_id = ?, sort_order = ? WHERE id = ?",
      [roadmapId, thuTu, lienKet[0].id]
    );
  } else {
    // Bộ từ mẫu (user_id NULL): ai cũng đọc được, không ai sửa được qua API
    const [ketQua] = await connection.execute(
      "INSERT INTO decks (user_id, title, description) VALUES (NULL, ?, ?)",
      [bo.title, bo.description]
    );
    deckId = ketQua.insertId;
    await connection.execute(
      "INSERT INTO roadmap_decks (roadmap_id, deck_id, deck_key, sort_order) VALUES (?, ?, ?, ?)",
      [roadmapId, deckId, bo.key, thuTu]
    );
    thongKe.boMoi += 1;
  }

  const [theCu] = await connection.query("SELECT id, term_en FROM cards WHERE deck_id = ?", [deckId]);
  const theoTu = new Map(theCu.map((the) => [the.term_en.trim().toLowerCase(), the.id]));

  for (const [index, tu] of bo.words.entries()) {
    const cardId = theoTu.get(tu.term_en.toLowerCase());
    const noiDung = [tu.meaning_vi, tu.example_sentence, tu.part_of_speech || null, tu.note, index];

    if (cardId) {
      await connection.execute(
        `UPDATE cards
         SET meaning_vi = ?, example_sentence = ?, part_of_speech = ?, note = ?, sort_order = ?
         WHERE id = ?`,
        [...noiDung, cardId]
      );
      thongKe.tuCapNhat += 1;
    } else {
      await connection.execute(
        `INSERT INTO cards (meaning_vi, example_sentence, part_of_speech, note, sort_order, deck_id, term_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [...noiDung, deckId, tu.term_en]
      );
      thongKe.tuMoi += 1;
    }
  }
}

/**
 * Nạp nội dung đã chuẩn hoá. Gọi trong một transaction.
 * @returns {{ loTrinh: number, boMoi: number, tuMoi: number, tuCapNhat: number }}
 */
async function napNoiDungLoTrinh(connection, danhSachLoTrinh) {
  const thongKe = { loTrinh: 0, boMoi: 0, tuMoi: 0, tuCapNhat: 0 };

  for (const [thuTuLoTrinh, loTrinh] of danhSachLoTrinh.entries()) {
    await connection.execute(
      `INSERT INTO roadmaps (slug, title, description, level_label, sort_order)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         description = VALUES(description),
         level_label = VALUES(level_label),
         sort_order = VALUES(sort_order)`,
      [loTrinh.slug, loTrinh.title, loTrinh.description, loTrinh.level_label, thuTuLoTrinh]
    );
    const [dong] = await connection.query("SELECT id FROM roadmaps WHERE slug = ? LIMIT 1", [
      loTrinh.slug,
    ]);
    thongKe.loTrinh += 1;

    for (const [thuTuBo, bo] of loTrinh.decks.entries()) {
      await napBoTu(connection, dong[0].id, bo, thuTuBo, thongKe);
    }
  }

  return thongKe;
}

module.exports = {
  chuanHoaNoiDungLoTrinh,
  kiemTraNoiDungLoTrinh,
  napNoiDungLoTrinh,
};
