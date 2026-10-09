import { describe, expect, it, vi } from "vitest";
import { dangKyTrang, taiTruocTheoDuongDan } from "./taiTruocTrang";

describe("taiTruocTrang", () => {
  it("tải đúng chunk của trang khớp đường dẫn, mỗi chunk một lần", async () => {
    const taiBo = vi.fn(() => Promise.resolve({}));
    const taiThe = vi.fn(() => Promise.resolve({}));
    dangKyTrang("/decks/:deckId/flashcard", taiThe);
    dangKyTrang("/decks/:deckId", taiBo);

    taiTruocTheoDuongDan("/decks/7/flashcard");
    taiTruocTheoDuongDan("/decks/8/flashcard");
    taiTruocTheoDuongDan("/decks/7");
    taiTruocTheoDuongDan("/khong-co");

    expect(taiThe).toHaveBeenCalledTimes(1);
    expect(taiBo).toHaveBeenCalledTimes(1);
  });

  it("tải lại được sau khi lần trước lỗi mạng", async () => {
    const tai = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({});
    dangKyTrang("/thu-lai", tai);
    taiTruocTheoDuongDan("/thu-lai");
    await Promise.resolve();
    await Promise.resolve();
    taiTruocTheoDuongDan("/thu-lai");
    expect(tai).toHaveBeenCalledTimes(2);
  });
});
