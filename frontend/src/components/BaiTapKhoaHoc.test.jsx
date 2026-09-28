import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import BaiTapKhoaHoc from "./BaiTapKhoaHoc";

vi.mock("../services/courseApi", () => ({
  giaiThichCauHoi: vi.fn(),
  layAudioCauHoi: vi.fn(),
  luuTraLoiCauHoi: vi.fn(),
}));

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

    // Mọi câu cùng một nhóm: không lặp tab "Trong bài" trùng với "Tất cả"
    expect(html).not.toContain("<span>Trong bài</span>");

    expect(html).not.toContain("Còn lại");
    expect(html).toContain("Câu một");
    expect(html).toContain("Câu <strong>1</strong> / 3");
  });

  it("resumes with the questions that are not correct yet", () => {
    const html = render(<BaiTapKhoaHoc cauHoi={CAU_HOI} ketQuaGanNhat={{ 1: true, 2: false }} />);

    expect(html).toContain('aria-pressed="true"><span>Còn lại</span><span class="ui-filter-tab__count">2</span>');
    expect(html).toContain("Câu hai");
    expect(html).not.toContain("Câu một");
    expect(html).toContain("Câu <strong>1</strong> / 2");
  });

  it("keeps AI extra practice out of the full and remaining sets, in its own group", () => {
    const luyenThem = { ...cau(201, "Câu luyện thêm"), source: "extra", section: "ngu_phap" };
    const html = render(<BaiTapKhoaHoc cauHoi={[...CAU_HOI, luyenThem]} ketQuaGanNhat={{ 1: true }} />);

    expect(html).toContain('<span>Tất cả</span><span class="ui-filter-tab__count">3</span>');
    expect(html).toContain('aria-pressed="true"><span>Còn lại</span><span class="ui-filter-tab__count">2</span>');
    expect(html).toContain('<span>Luyện thêm</span><span class="ui-filter-tab__count">1</span>');
    // Hàng chọn phần chỉ hiện khi đã chọn một nhóm
    expect(html).not.toContain("kh-bt__phan");
    expect(html).not.toContain("<span>Trong bài</span>");
    expect(html).not.toContain("Câu luyện thêm");
  });

  it("review mode runs every due question, extra ones included, labelled with its lesson", () => {
    const denHan = [
      { ...cau(1, "Câu một"), lesson_number: 13 },
      { ...cau(201, "Câu luyện thêm"), source: "extra", section: "ngu_phap", lesson_number: 14 },
    ];
    const html = render(<BaiTapKhoaHoc cauHoi={denHan} onTap />);

    expect(html).not.toContain("kh-bt__loc");
    expect(html).toContain("Câu <strong>1</strong> / 2");
    expect(html).toContain('<span class="kh-cau__nguon">Buổi 13 · </span>');
  });

  it("shows the parts of the only group under \"Tất cả\"", () => {
    const baiThi = [1, 2].map((id) => ({ ...cau(id, "Câu " + id), source: "exam", section: "quiz_" + id }));
    const html = render(<BaiTapKhoaHoc cauHoi={baiThi} ketQuaGanNhat={{}} />);

    expect(html).toMatch(/aria-pressed="true">Tất cả phần</);
    expect(html).toContain('Quiz 1 <span class="kh-chip__so">1</span>');
    expect(html).toContain('Quiz 2 <span class="kh-chip__so">1</span>');
  });

  it("offers the full set again once every question is correct", () => {
    const html = render(<BaiTapKhoaHoc cauHoi={CAU_HOI} ketQuaGanNhat={{ 1: true, 2: true, 3: true }} />);

    expect(html).not.toContain("Còn lại");
    expect(html).toContain("Câu <strong>1</strong> / 3");
  });

  it("listening questions offer the private audio or a replay of the transcript", () => {
    const coFile = { ...cau(1, "Where is Jack?"), source: "exam", section: "phan_1", audio_key: "bai-33/audio/mp31.mp3" };
    const coLoiThoai = { ...cau(2, "Name: _____ Walker"), listen_text: "J. I. L. L." };

    const htmlFile = render(<BaiTapKhoaHoc cauHoi={[coFile]} ketQuaGanNhat={{}} />);
    expect(htmlFile).toContain("▶ Nghe bài");

    const htmlLoiThoai = render(<BaiTapKhoaHoc cauHoi={[coLoiThoai]} ketQuaGanNhat={{}} />);
    expect(htmlLoiThoai).toContain("▶ Nghe lại");
    // Lời thoại chỉ hiện sau khi trả lời
    expect(htmlLoiThoai).not.toContain("J. I. L. L.");
  });
});
