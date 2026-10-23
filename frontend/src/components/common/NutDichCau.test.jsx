import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import NutDichCau from "./NutDichCau";
vi.mock("../../services/cardApi", () => ({ dichCauViDu: vi.fn() }));

describe("NutDichCau", () => {
  it("hides a saved translation behind the button", () => {
    const html = renderToString(<NutDichCau banDich="Em gái tôi thích vẽ." />);
    expect(html).toContain("Xem tiếng Việt");
    expect(html).not.toContain("Em gái tôi thích vẽ.");
  });
  it("offers the button for a card that can still be translated", () => {
    expect(renderToString(<NutDichCau cardId="42" />)).toContain("Xem tiếng Việt");
  });
  it("renders nothing without a translation or a real card id", () => {
    expect(renderToString(<NutDichCau cardId="mistake-3" />)).toBe("");
    expect(renderToString(<NutDichCau />)).toBe("");
  });
});
