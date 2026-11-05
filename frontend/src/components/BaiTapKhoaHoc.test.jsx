import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import BaiTapKhoaHoc from "./BaiTapKhoaHoc";

vi.mock("../services/courseApi", () => ({
  chuanBiGiaiThich: vi.fn(() => Promise.resolve({ ready: true })),
  layBanDichCauHoi: vi.fn(() => Promise.resolve({})),
  giaiThichCauHoi: vi.fn(),
  layAudioCauHoi: vi.fn(),
  luuTraLoiCauHoi: vi.fn(),
}));

// Thanh "Câu tiếp theo" đọc cỡ màn hình (không render được phía server): thay bằng nút đơn giản
vi.mock("./common/ThanhTiepTuc", () => ({
  default: ({ nhanNut }) => <button type="button">{nhanNut}</button>,
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

    // Mọi câu cùng một nhóm: không lặp lựa chọn "Trong bài" trùng với "Tất cả"
    expect(html).not.toContain("Cả nhóm Trong bài");
    expect(html).toContain("Tất cả (3)</option>");

    expect(html).not.toContain("Còn lại");
    expect(html).toContain("Câu một");
    expect(html).toContain("Câu <strong>1</strong> / 3");
  });

  it("keeps the translate button hidden until the question is answered (the translation fills in the answer)", () => {
    const html = render(<BaiTapKhoaHoc cauHoi={CAU_HOI} ketQuaGanNhat={{}} />);

    expect(html).not.toContain("Dịch câu sang tiếng Việt");
    expect(html).not.toContain("kh-dich");
  });

  it("resumes with the questions that are not correct yet", () => {
    const html = render(<BaiTapKhoaHoc cauHoi={CAU_HOI} ketQuaGanNhat={{ 1: true, 2: false }} />);

    expect(html).toContain('<option value="con-lai" selected="">Còn lại – chưa đúng (2)</option>');
    expect(html).toContain("Câu hai");
    expect(html).not.toContain("Câu một");
    expect(html).toContain("Câu <strong>1</strong> / 2");
  });

  it("keeps AI extra practice out of the full and remaining sets, in its own group", () => {
    const luyenThem = { ...cau(201, "Câu luyện thêm"), source: "extra", section: "ngu_phap" };
    const html = render(<BaiTapKhoaHoc cauHoi={[...CAU_HOI, luyenThem]} ketQuaGanNhat={{ 1: true }} />);

    expect(html).toContain("Tất cả (3)</option>");
    expect(html).toContain('<option value="con-lai" selected="">Còn lại – chưa đúng (2)</option>');
    expect(html).toContain('<optgroup label="Luyện thêm">');
    expect(html).toContain("Cả nhóm Luyện thêm (1)</option>");
    expect(html).not.toContain("Cả nhóm Trong bài");
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

    expect(html).toContain('selected="">Tất cả (2)</option>');
    expect(html).toContain("Quiz 1 (1)</option>");
    expect(html).toContain("Quiz 2 (1)</option>");
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

  it("asks to answer again after a wrong answer instead of moving on", () => {
    const luot = { v: 2, phan: "tat-ca", ids: [1, 2, 3], chiSo: 0, ketQua: { 0: { traLoi: "B", dung: false } } };
    const html = render(<BaiTapKhoaHoc cauHoi={CAU_HOI} luotDaLuu={luot} />);

    expect(html).toContain("Trả lời lại");
    expect(html).not.toContain("Câu tiếp theo");
  });

  it("while answering again shows the correct answer and keeps the wrong choice locked", () => {
    const luot = {
      v: 2,
      phan: "tat-ca",
      ids: [1, 2, 3],
      chiSo: 0,
      ketQua: { 0: { traLoi: "B", dung: false, nhapLai: true } },
    };
    const html = render(<BaiTapKhoaHoc cauHoi={CAU_HOI} luotDaLuu={luot} />);

    expect(html).toContain("Chọn lại đáp án đúng để đi tiếp");
    expect(html).not.toContain("Trả lời lại");
    expect(html).toMatch(/kh-lua-chon__nut--sai"[^>]*disabled/);
  });

  it("lets the learner go back to answered questions but not skip ahead", () => {
    const luot = { v: 2, phan: "tat-ca", ids: [1, 2, 3], chiSo: 1, ketQua: { 0: { traLoi: "A", dung: true } } };
    const html = render(<BaiTapKhoaHoc cauHoi={CAU_HOI} luotDaLuu={luot} />);

    expect(html).toContain("Câu <strong>2</strong> / 3");
    expect(html).toMatch(/aria-label="Câu trước"(?![^>]*disabled)/);
    expect(html).toMatch(/disabled=""[^>]*aria-label="Câu sau"|aria-label="Câu sau"[^>]*disabled/);
  });

  it("restores a re-asked question from the saved round", () => {
    const luot = {
      v: 2,
      phan: "tat-ca",
      ids: [1, 2, 1],
      hoiLai: [2],
      chiSo: 2,
      ketQua: { 0: { traLoi: "B", dung: false, daSua: true }, 1: { traLoi: "A", dung: true } },
    };
    const html = render(<BaiTapKhoaHoc cauHoi={CAU_HOI} luotDaLuu={luot} />);

    expect(html).toContain("Hỏi lại");
    expect(html).toContain("Câu một");
    // Đếm theo lần trả lời đầu: 1 đúng, 1 sai
    expect(html).toContain("1 đúng");
    expect(html).toContain("1 sai");
  });
});
