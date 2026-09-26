import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import StudyResult from "./StudyResult";

vi.mock("../../services/reviewApi", () => ({}));
vi.mock("../../utils/mistakeNotebook", () => ({
  luuTuSaiDongBo: vi.fn(),
  danhDauDaOnDongBo: vi.fn(),
}));

function taoLocalStorage(duLieu = {}) {
  const store = new Map(Object.entries(duLieu));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

const APPLE = { id: 1, term_en: "apple", meaning_vi: "quả táo", example_sentence: "I eat an apple." };
const PEAR = { id: 2, term_en: "pear", meaning_vi: "quả lê" };
const GRAPE = { id: 3, term_en: "grape", meaning_vi: "quả nho" };

// React SSR chèn <!-- --> giữa chữ và biểu thức; bỏ đi để so sánh nội dung hiển thị
function render(props) {
  return renderHtml(props).replace(/<!-- -->/g, "");
}

function renderHtml(props) {
  return renderToString(
    <MemoryRouter>
      <StudyResult
        deckTitle="Fruits"
        deckId={10}
        tongSoCau={3}
        soCauDung={2}
        soCauSai={1}
        onLamLai={() => {}}
        onHocLaiTuSai={() => {}}
        danhSachCardSai={[PEAR]}
        danhSachCardDung={[APPLE, GRAPE]}
        mode="quiz"
        {...props}
      />
    </MemoryRouter>
  );
}

beforeEach(() => {
  // apple đang ở Lv3 trong SRS local; pear và grape chưa từng học
  vi.stubGlobal(
    "localStorage",
    taoLocalStorage({ streak_drop_srs_v1: JSON.stringify({ 1: { id: "1", level: 3 } }) })
  );
});

describe("StudyResult", () => {
  it("lists wrong and correct words with their new SRS level", () => {
    const html = render();

    expect(html).toContain("Trả lời sai (1)");
    expect(html).toContain("Trả lời đúng (2)");
    // apple Lv3 → đúng → Lv4, ôn lại sau 14 ngày; grape mới → Lv1
    expect(html).toContain("Lv4 · Ôn lại: 14 ngày");
    expect(html).toContain("Lv1 · Ôn lại: 1 ngày");
    // pear mới → sai → Lv0, ôn ngay
    expect(html).toContain("Lv0 · Ôn ngay");
    expect(html).toContain("I eat an apple.");
  });

  it("offers retrying wrong answers, a full retry and another mode", () => {
    const html = render();

    expect(html).toContain("Làm lại câu sai (1)");
    expect(html).toContain("Làm lại toàn bộ");
    expect(html).toContain("Chọn chế độ khác");
    expect(html).toContain('href="/decks/10"');
  });

  it("labels a retry round and hides the wrong list when everything is right", () => {
    const html = render({
      soCauDung: 1,
      soCauSai: 0,
      tongSoCau: 1,
      danhSachCardSai: [],
      danhSachCardDung: [PEAR],
      laLamLai: true,
    });

    expect(html).toContain("Làm lại câu sai · trắc nghiệm");
    expect(html).not.toContain("Trả lời sai");
    expect(html).not.toContain("Làm lại câu sai (");
  });
});
