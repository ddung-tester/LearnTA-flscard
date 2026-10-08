import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import PhanHoiDung from "./PhanHoiDung";
vi.mock("./TenseExamplesCard", () => ({ default: () => null }));
vi.mock("./ThanhTiepTuc", () => ({ default: () => null }));
vi.mock("../../hooks/useManRong", () => ({ default: () => false }));
vi.mock("../../hooks/useTTS", () => ({ default: () => ({ speak: vi.fn(), isPlaying: false }) }));
const card = { term_en: "sister", example_sentence: "My little sister loves drawing.", example_translation: "Em gái tôi thích vẽ." };
describe("original example translation", () => {
  it("keeps the original English and shows its own Vietnamese translation", () => {
    const html = renderToString(<PhanHoiDung the={card} termEn="sister" />);
    expect(html).toContain('lang="en"');
    expect(html).toContain("My little ");
    expect(html).toContain(" loves drawing.");
    expect(html).toContain('lang="vi"');
    expect(html).toContain(card.example_translation);
  });
  it("does not show an orphan translation if the original example is missing", () => {
    const html = renderToString(<PhanHoiDung the={{ ...card, example_sentence: "" }} termEn="sister" />);
    expect(html).not.toContain(card.example_translation);
  });
});
