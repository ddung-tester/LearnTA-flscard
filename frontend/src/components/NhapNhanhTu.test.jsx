import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import NhapNhanhTu from "./NhapNhanhTu";
import ThanhTienDoLoTrinh from "./common/ThanhTienDoLoTrinh";

vi.mock("../services/cardApi", () => ({ taoTuBangAI: vi.fn() }));

// React SSR chèn <!-- --> giữa chữ và biểu thức
function render(node) {
  return renderToString(node).replace(/<!-- -->/g, "");
}

describe("NhapNhanhTu", () => {
  it("opens on the paste tab with the ChatGPT prompt helper and a disabled submit", () => {
    const html = render(
      <NhapNhanhTu danhSachHienCo={[]} dangLuu={false} onNhap={() => {}} onHuy={() => {}} />
    );

    expect(html).toContain("Dán danh sách");
    expect(html).toContain("Tạo bằng AI");
    expect(html).toContain("Sao chép prompt cho ChatGPT");
    expect(html).toMatch(/<button type="submit" disabled=""[^>]*>Thêm 0 từ<\/button>/);
  });
});

describe("ThanhTienDoLoTrinh", () => {
  it("shows learned and mastered counts and caps the bar at 100%", () => {
    const html = render(<ThanhTienDoLoTrinh tongSo={20} daHoc={25} daThuoc={5} />);

    expect(html).toContain("Đã học <strong>25</strong>/20");
    expect(html).toContain("width:100%");
    expect(html).toContain("width:25%");
  });

  it("handles an empty roadmap without dividing by zero", () => {
    const html = render(<ThanhTienDoLoTrinh tongSo={0} daHoc={0} daThuoc={0} />);
    expect(html).toContain("width:0%");
  });
});
