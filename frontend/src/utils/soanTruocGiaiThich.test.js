import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ chuanBiGiaiThich: vi.fn() }));
vi.mock("../services/courseApi", () => api);

import {
  GIAN_CACH_NEN_MS,
  _datLai,
  khoGiaiThichCua,
  napCauHoi,
  soanNen,
  uuTienSoan,
} from "./soanTruocGiaiThich";

const xong = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
  _datLai();
  api.chuanBiGiaiThich.mockReset().mockImplementation(async (id) => ({ ready: true, explanations: { A: `loi ${id}` } }));
});
afterEach(() => vi.useRealTimers());

it("câu ưu tiên soạn ngay, cả buổi soạn dần cách nhau 4 giây, bỏ qua câu đã đủ", async () => {
  napCauHoi([{ id: 1, explanations: { A: "co san" }, explanations_ready: true }, { id: 2 }, { id: 3 }, { id: 4 }]);
  soanNen([1, 2, 3, 4]);
  uuTienSoan([2]);
  await xong();
  expect(api.chuanBiGiaiThich.mock.calls.map(([id]) => id)).toEqual([2]);
  expect(khoGiaiThichCua({ id: 2 })).toEqual({ A: "loi 2" });

  await vi.advanceTimersByTimeAsync(GIAN_CACH_NEN_MS);
  expect(api.chuanBiGiaiThich.mock.calls.map(([id]) => id)).toEqual([2, 3]);
  await vi.advanceTimersByTimeAsync(GIAN_CACH_NEN_MS);
  expect(api.chuanBiGiaiThich.mock.calls.map(([id]) => id)).toEqual([2, 3, 4]);
  expect(khoGiaiThichCua({ id: 1 })).toEqual({ A: "co san" });
});

it("câu ưu tiên đến giữa lúc nghỉ thì làm ngay, không chờ hết nhịp", async () => {
  napCauHoi([{ id: 1 }, { id: 2 }, { id: 3 }]);
  soanNen([1, 2]);
  await vi.advanceTimersByTimeAsync(GIAN_CACH_NEN_MS);
  expect(api.chuanBiGiaiThich).toHaveBeenCalledTimes(1);
  uuTienSoan([3]);
  await xong();
  expect(api.chuanBiGiaiThich.mock.calls.map(([id]) => id)).toEqual([1, 3]);
});

it("lỗi liên tiếp (hết hạn mức) thì dừng phần nền", async () => {
  api.chuanBiGiaiThich.mockResolvedValue({ ready: false, explanations: {} });
  napCauHoi([1, 2, 3, 4, 5].map((id) => ({ id })));
  soanNen([1, 2, 3, 4, 5]);
  await vi.advanceTimersByTimeAsync(GIAN_CACH_NEN_MS * 10);
  expect(api.chuanBiGiaiThich).toHaveBeenCalledTimes(3);
});
