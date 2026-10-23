import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import PhanHoiDung from "./PhanHoiDung";
vi.mock("./TenseExamplesCard", () => ({ default: () => null }));
vi.mock("./ThanhTiepTuc", () => ({ default: () => null }));
vi.mock("../../hooks/useManRong", () => ({ default: () => false }));
vi.mock("../../hooks/useTTS", () => ({ default: () => ({ speak: vi.fn(), isPlaying: false }) }));
const card = { term_en: "sister", example_sentence: "My little sister loves drawing.", example_translation: "Em gái tôi thích vẽ." };
describe("original example translation", () => {
  it("keeps the original English and hides the Vietnamese translation behind a button", () => {
    const html = renderToString(<PhanHoiDung the={card} termEn="sister" />);
    expect(html).toContain('lang="en"');
    expect(html).toContain("My little ");
    expect(html).toContain(" loves drawing.");
    expect(html).toContain("Xem tiếng Việt");
    expect(html).not.toContain(card.example_translation);
  });
  it("does not show a translate button if the original example is missing", () => {
    const html = renderToString(<PhanHoiDung the={{ ...card, example_sentence: "" }} termEn="sister" />);
    expect(html).not.toContain("Xem tiếng Việt");
  });
});
