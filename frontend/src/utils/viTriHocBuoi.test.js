import { beforeEach, describe, expect, it, vi } from "vitest";
import { coChoDungDeTiep, docViTriBuoi, ghiViTriBuoi, hocLaiTuDau, khoaViTriBuoi } from "./viTriHocBuoi";

describe("viTriHocBuoi", () => {
  beforeEach(() => {
    const values = new Map();
    vi.stubGlobal("localStorage", { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) });
  });

  it("tách theo tài khoản và buổi", () => {
    const a = khoaViTriBuoi(1, 1, 3);
    const b = khoaViTriBuoi(2, 1, 3);
    ghiViTriBuoi(a, { buoc: "bai-tap" });
    expect(docViTriBuoi(a).buoc).toBe("bai-tap");
    expect(docViTriBuoi(b)).toBeNull();
  });

  it("gộp phần mới vào chỗ dừng cũ", () => {
    const k = khoaViTriBuoi(1, 1, 3);
    ghiViTriBuoi(k, { buoc: "bai-tap", baiTap: { phan: "tat-ca", ids: [1, 2, 3], chiSo: 2, ketQua: {} } });
    ghiViTriBuoi(k, { buoc: "ly-thuyet", trangLyThuyet: 1 });
    const v = docViTriBuoi(k);
    expect(v.baiTap.chiSo).toBe(2);
    expect(v.buoc).toBe("ly-thuyet");
    expect(v.trangLyThuyet).toBe(1);
  });

  it("học lại từ đầu xoá lượt bài tập và đánh dấu làm từ câu 1", () => {
    const k = khoaViTriBuoi(1, 1, 3);
    ghiViTriBuoi(k, { buoc: "bai-tap", baiTap: { ids: [1], chiSo: 0 } });
    hocLaiTuDau(k);
    const v = docViTriBuoi(k);
    expect(v).toMatchObject({ buoc: "tu-vung", baiTap: null, tuDau: true, trangLyThuyet: 0 });
    expect(coChoDungDeTiep(v)).toBe(false);
  });

  it("chỉ hỏi học tiếp khi đã qua bước Từ vựng hoặc đang làm dở", () => {
    expect(coChoDungDeTiep(null)).toBe(false);
    expect(coChoDungDeTiep({ buoc: "tu-vung" })).toBe(false);
    expect(coChoDungDeTiep({ buoc: "ly-thuyet" })).toBe(true);
    expect(coChoDungDeTiep({ buoc: "tu-vung", baiTap: { chiSo: 4 } })).toBe(true);
  });
});
