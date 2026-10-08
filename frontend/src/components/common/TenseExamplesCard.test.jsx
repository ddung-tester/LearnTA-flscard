import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CauNoiBat } from "./TenseExamplesCard";
import { getTenseExamples } from "../../data/tenseExamples";

describe("câu mẫu đã nhập", () => {
  it("dùng đúng 6 câu từ DB thay vì sinh câu thay thế", () => {
    const saved = Array.from({ length: 6 }, (_, i) => ({ sentence: `Saved ${i}` }));
    expect(getTenseExamples({ term_en: "cds", tense_examples: saved })).toBe(saved);
  });

  it("tô nổi bật dạng đã chia, giữ nguyên chữ hoa và câu", () => {
    const html = renderToStaticMarkup(<CauNoiBat sentence="She PAID for lunch." highlight="paid" />);
    expect(html).toContain(">PAID</mark>");
    expect(html.replace(/<[^>]*>/g, "")).toBe("She PAID for lunch.");
  });

  it("không tô từ ngắn nằm bên trong từ khác", () => {
    const html = renderToStaticMarkup(<CauNoiBat sentence="This is my bag." highlight="is" />);
    expect(html).toContain("This <mark ");
    expect(html).toContain(">is</mark> my bag.");
    expect(renderToStaticMarkup(<CauNoiBat sentence="The theater is open." highlight="the" />)).toContain(">The</mark> theater is open.");
    expect(renderToStaticMarkup(<CauNoiBat sentence="She smiles." highlight="he" />)).toBe("She smiles.");
  });

  it("hỗ trợ cả cụm và ký tự đặc biệt, không dùng regex từ người dùng", () => {
    const html = renderToStaticMarkup(<CauNoiBat sentence="I asked, 'You're welcome.'" highlight="You're welcome" />);
    expect(html.match(/<mark /g)).toHaveLength(1);
    expect(renderToStaticMarkup(<CauNoiBat sentence="Code uses C++." highlight="C++" />)).toContain(">C++</mark>");
  });

  it("vẫn hiển thị nguyên câu nếu thiếu highlight hoặc không tìm thấy", () => {
    expect(renderToStaticMarkup(<CauNoiBat sentence="Hello." />)).toBe("Hello.");
    expect(renderToStaticMarkup(<CauNoiBat sentence="Hello." highlight="missing" />)).toBe("Hello.");
  });
});
