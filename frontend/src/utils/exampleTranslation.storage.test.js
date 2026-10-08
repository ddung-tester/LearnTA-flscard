import { beforeEach, expect, it, vi } from "vitest";
import { themVaoSRS, layTatCaSRS, hopNhatSRSTuBackend } from "./srsReview";
import { luuTuSai, layTatCaTuSai, hopNhatTuSaiTuBackend } from "./mistakeNotebook";
import { chonKhoHocTap } from "./khoHocTap";
vi.mock("../services/api", () => ({ getStoredAuthToken: () => null }));
beforeEach(() => {
  chonKhoHocTap(null);
  const values = new Map();
  vi.stubGlobal("localStorage", { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) });
});
const card = { id: 1, term_en: "sister", meaning_vi: "chị gái", example_sentence: "My little sister loves drawing.", example_translation: "Em gái tôi thích vẽ." };
const options = { deckId: 11, deckTitle: "Family", source: "quiz" };
it.each([
  ["SRS", themVaoSRS, layTatCaSRS],
  ["mistakes", luuTuSai, layTatCaTuSai],
])("%s keeps matching translation and removes it after English changes", (_name, save, read) => {
  save([card], options);
  expect(read()[0].exampleTranslation).toBe(card.example_translation);
  save([{ id: 1, note: "unrelated" }], options);
  expect(read()[0].exampleTranslation).toBe(card.example_translation);
  save([{ id: 1, example_sentence: "Different English." }], options);
  expect(read()[0].exampleTranslation).toBeNull();
});
it("maps API translations into both review and mistake entries", () => {
  const row = { ...card, card_id: 1, deck_id: 11, mastery_level: 0, updated_at: new Date().toISOString() };
  hopNhatSRSTuBackend([row]);
  hopNhatTuSaiTuBackend([row]);
  expect(layTatCaSRS()[0].exampleTranslation).toBe(card.example_translation);
  expect(layTatCaTuSai()[0].exampleTranslation).toBe(card.example_translation);
});
