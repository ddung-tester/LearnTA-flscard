import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import DanhSachDapAn from "./DanhSachDapAn";
import TheCauHoiPhien from "./TheCauHoiPhien";

// React SSR chèn <!-- --> giữa chữ và biểu thức
function render(node) {
  return renderToString(node).replace(/<!-- -->/g, "");
}

describe("TheCauHoiPhien", () => {
  it("shows the question text by default", () => {
    const html = render(<TheCauHoiPhien cauHoi="quả táo" onDoc={() => {}} />);
    expect(html).toContain("quả táo");
    expect(html).toContain("Đọc câu hỏi");
  });

  it("hides the word in listening mode and shows a play button instead", () => {
    const html = render(<TheCauHoiPhien cauHoi="apple" cheDoNghe onDoc={() => {}} />);
    expect(html).not.toContain("apple");
    expect(html).toContain("Nghe lại từ");
    expect(html).toContain("Nghe và gõ từ tiếng Anh");
  });
});

describe("DanhSachDapAn", () => {
  const props = {
    danhSachDapAn: ["apple", "pear", "grape", "melon"],
    dapAnDung: "apple",
    onChon: () => {},
    khoa: 1,
  };

  it("renders every option enabled before answering", () => {
    const html = render(<DanhSachDapAn {...props} dapAnDaChon={null} />);
    expect(html.match(/<button/g)).toHaveLength(4);
    expect(html).not.toContain("disabled");
  });

  it("marks the right answer and the wrong pick after answering", () => {
    const html = render(<DanhSachDapAn {...props} dapAnDaChon="pear" />);
    expect(html).toContain("ui-answer-correct");
    expect(html).toContain("ui-answer-wrong");
    expect(html).toContain("Đáp án bạn chọn, chưa đúng");
    expect(html.match(/disabled=""/g)).toHaveLength(4);
  });
});
