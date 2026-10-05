import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trangThai = vi.hoisted(() => ({ token: "tok", update: vi.fn(() => Promise.resolve({})) }));
vi.mock("../services/api", () => ({ getStoredAuthToken: () => trangThai.token }));
vi.mock("../services/userApi", () => ({ updateUserSettings: trangThai.update }));

import { luuLenTaiKhoan } from "./caiDatTaiKhoan";
import { chonKhoHocTap } from "./khoHocTap";

describe("luuLenTaiKhoan", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    trangThai.token = "tok";
    trangThai.update.mockClear();
    chonKhoHocTap(7);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gộp các lần đổi liên tiếp thành một lần lưu", () => {
    luuLenTaiKhoan({ giaoDien: "den-ban" });
    luuLenTaiKhoan({ amThanh: false });
    luuLenTaiKhoan({ giaoDien: "sang" });
    expect(trangThai.update).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(trangThai.update).toHaveBeenCalledTimes(1);
    expect(trangThai.update).toHaveBeenCalledWith({ preferences: { giaoDien: "sang", amThanh: false } });
  });

  it("khách không gửi gì", () => {
    trangThai.token = null;
    luuLenTaiKhoan({ giaoDien: "den-ban" });
    vi.runAllTimers();
    expect(trangThai.update).not.toHaveBeenCalled();
  });

  it("đổi tài khoản trước khi kịp gửi thì bỏ phần của tài khoản cũ", () => {
    luuLenTaiKhoan({ giaoDien: "den-ban" });
    chonKhoHocTap(8);
    vi.runAllTimers();
    expect(trangThai.update).not.toHaveBeenCalled();

    luuLenTaiKhoan({ amThanh: true });
    vi.runAllTimers();
    expect(trangThai.update).toHaveBeenCalledWith({ preferences: { amThanh: true } });
  });
});
