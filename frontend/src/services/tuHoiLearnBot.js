import { layDanhSachDeck, taoDeck } from "./deckApi";
import { layCardsTheoDeck, taoCard } from "./cardApi";

// Từ mới người học bấm "Thêm từ" trong câu trả lời của LearnBot vào chung một bộ của tài khoản
export const TEN_BO_HOI_LEARNBOT = "Từ hỏi LearnBot";

/**
 * Lưu một từ vào bộ "Từ hỏi LearnBot" (tự tạo bộ nếu chưa có). Từ đã có thì không thêm trùng.
 * @returns {Promise<{ deckId: number, daCo: boolean }>}
 */
export async function luuTuHoiLearnBot({ tu, nghia }) {
  const danhSach = await layDanhSachDeck();
  let bo = danhSach.find((muc) => muc.source === "user" && muc.title === TEN_BO_HOI_LEARNBOT);
  if (!bo) {
    bo = await taoDeck({ title: TEN_BO_HOI_LEARNBOT, description: "Từ mới bạn lưu khi hỏi LearnBot." });
  }
  const the = await layCardsTheoDeck(bo.id);
  const khoa = tu.trim().toLowerCase();
  if (the.some((muc) => String(muc.term_en || "").trim().toLowerCase() === khoa)) {
    return { deckId: bo.id, daCo: true };
  }
  await taoCard(bo.id, { term_en: tu.trim(), meaning_vi: nghia.trim() || tu.trim(), example_sentence: "", note: "Lưu từ LearnBot" });
  return { deckId: bo.id, daCo: false };
}
