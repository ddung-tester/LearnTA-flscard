import { beforeEach, expect, it, vi } from "vitest";

const luuTraLoiCauHoi = vi.fn();
vi.mock("./courseApi", () => ({ luuTraLoiCauHoi: (...args) => luuTraLoiCauHoi(...args) }));

let storage;
beforeEach(() => {
  vi.resetModules();
  luuTraLoiCauHoi.mockReset();
  storage = new Map();
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("localStorage", {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  });
});

const loiMang = () => Object.assign(new Error("offline"), { status: undefined });
const loi400 = () => Object.assign(new Error("bad"), { status: 400 });

it("queues answers that fail on a network error and sends them again when back online", async () => {
  const hang = await import("./hangChoTraLoi");
  luuTraLoiCauHoi.mockRejectedValueOnce(loiMang());
  expect(await hang.luuTraLoiCoHangCho(5, "went")).toBe(false);
  expect(hang.soCauDangCho()).toBe(1);
  expect(JSON.parse(storage.get("hocTA.hangChoTraLoi"))).toEqual([expect.objectContaining({ questionId: 5, answer: "went" })]);

  luuTraLoiCauHoi.mockResolvedValue({});
  await hang.guiLaiHangCho();
  expect(luuTraLoiCauHoi).toHaveBeenLastCalledWith(5, "went");
  expect(hang.soCauDangCho()).toBe(0);
  expect(storage.has("hocTA.hangChoTraLoi")).toBe(false);
});

it("keeps only the latest answer per question and drops answers the server rejects", async () => {
  const hang = await import("./hangChoTraLoi");
  luuTraLoiCauHoi.mockRejectedValueOnce(loiMang());
  await hang.luuTraLoiCoHangCho(5, "go");
  luuTraLoiCauHoi.mockRejectedValueOnce(loiMang());
  await hang.luuTraLoiCoHangCho(5, "went");
  expect(hang.soCauDangCho()).toBe(1);

  luuTraLoiCauHoi.mockRejectedValueOnce(loi400());
  expect(await hang.luuTraLoiCoHangCho(6, "x".repeat(10))).toBe(false);
  expect(hang.soCauDangCho()).toBe(1);

  hang.xoaHangCho();
  expect(hang.soCauDangCho()).toBe(0);
});
