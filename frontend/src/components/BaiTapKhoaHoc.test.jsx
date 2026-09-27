import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import BaiTapKhoaHoc from "./BaiTapKhoaHoc";

vi.mock("../services/courseApi", () => ({ giaiThichCauHoi: vi.fn(), luuTraLoiCauHoi: vi.fn() }));

// React SSR chèn <!-- --> giữa chữ và biểu thức
function render(node) {
  return renderToString(node).replace(/<!-- -->/g, "");
}

const cau = (id, prompt) => ({
  id,
  source: "lesson",
  section: "practice",
  type: "multiple_choice",
  prompt,
  options: [
    { key: "A", text: "was" },
    { key: "B", text: "were" },
  ],
  answer_key: "A",
});
const CAU_HOI = [cau(1, "Câu một"), cau(2, "Câu hai"), cau(3, "Câu ba")];

describe("BaiTapKhoaHoc", () => {
  it("starts from the first question when nothing has been answered yet", () => {
    const html = render(<BaiTapKhoaHoc cauHoi={CAU_HOI} ketQuaGanNhat={{}} />);

    expect(html).not.toContain("Còn lại");
    expect(html).toContain("Câu một");
    expect(html).toContain("Câu <strong>1</strong> / 3");
  });

  it("resumes with the questions that are not correct yet", () => {
    const html = render(<BaiTapKhoaHoc cauHoi={CAU_HOI} ketQuaGanNhat={{ 1: true, 2: false }} />);

    expect(html).toMatch(/aria-pressed="true"[^>]*>Còn lại <span class="kh-chip__so">2<\/span>/);
    expect(html).toContain("Câu hai");
    expect(html).not.toContain("Câu một");
    expect(html).toContain("Câu <strong>1</strong> / 2");
  });

  it("offers the full set again once every question is correct", () => {
    const html = render(<BaiTapKhoaHoc cauHoi={CAU_HOI} ketQuaGanNhat={{ 1: true, 2: true, 3: true }} />);

    expect(html).not.toContain("Còn lại");
    expect(html).toContain("Câu <strong>1</strong> / 3");
  });
});
