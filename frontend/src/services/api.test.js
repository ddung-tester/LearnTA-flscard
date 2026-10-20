import { beforeEach, expect, it, vi } from "vitest";

let events;
let storage;
beforeEach(() => {
  vi.resetModules();
  storage = new Map();
  events = new EventTarget();
  vi.stubGlobal("window", events);
  vi.stubGlobal("localStorage", {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  });
});

function storageChange(key, value) {
  if (value) storage.set(key, value);
  else storage.delete(key);
  events.dispatchEvent(Object.assign(new Event("storage"), { key }));
}

it("uses cross-tab token changes and logout on the next API request", async () => {
  const { default: api, storeAuthToken, AUTH_TOKEN_STORAGE_KEY, getStoredAuthToken } = await import("./api");
  const headers = [];
  api.defaults.adapter = async (config) => {
    headers.push(config.headers.Authorization);
    return { data: {}, status: 200, config };
  };
  storeAuthToken("A");
  await api.get("/decks");
  storageChange(AUTH_TOKEN_STORAGE_KEY, "B");
  await api.get("/decks");
  storageChange(AUTH_TOKEN_STORAGE_KEY, null);
  await api.get("/decks");
  expect(headers).toEqual(["Bearer A", "Bearer B", undefined]);
  expect(getStoredAuthToken()).toBeNull();
});

it("aborts A's in-flight requests and ignores its stale 401 after switching to B", async () => {
  const { default: api, storeAuthToken, getStoredAuthToken } = await import("./api");
  let reject;
  let config;
  api.defaults.adapter = (request) => {
    config = request;
    return new Promise((_resolve, fail) => { reject = fail; });
  };
  storeAuthToken("A");
  const pending = api.get("/auth/me");
  storeAuthToken("B");
  expect(config.signal.aborted).toBe(true);
  reject({ config, response: { status: 401 } });
  await expect(pending).rejects.toThrow();
  expect(getStoredAuthToken()).toBe("B");
});

it("caches reads briefly, gives each caller its own copy and forgets after writes or account switches", async () => {
  const { default: api, layCoBoNho, storeAuthToken } = await import("./api");
  let soLanDoc = 0;
  api.defaults.adapter = async (config) => {
    if (config.method === "get") soLanDoc += 1;
    return { data: { cards: [{ id: 1 }], lan: soLanDoc }, status: 200, config };
  };
  storeAuthToken("A");
  const dau = await layCoBoNho("/decks/1/cards");
  dau.cards.push({ id: 2 });
  const sau = await layCoBoNho("/decks/1/cards");
  expect(soLanDoc).toBe(1);
  expect(sau.cards).toEqual([{ id: 1 }]);

  await api.post("/study-sessions", {});
  expect((await layCoBoNho("/decks/1/cards")).lan).toBe(2);

  storeAuthToken("B");
  expect((await layCoBoNho("/decks/1/cards")).lan).toBe(3);
});

// Chờ hết các lần tự gọi lại (có hẹn giờ) của một request rồi trả kết quả
async function chayHetHenGio(goi) {
  vi.useFakeTimers();
  try {
    const ketQua = goi().then((data) => ({ data }), (loi) => ({ loi }));
    await vi.runAllTimersAsync();
    return await ketQua;
  } finally {
    vi.useRealTimers();
  }
}

it("does not keep failed reads in the cache", async () => {
  const { default: api, layCoBoNho } = await import("./api");
  let lan = 0;
  api.defaults.adapter = async (config) => {
    lan += 1;
    // Lần đầu và 2 lần tự gọi lại đều mất mạng
    if (lan <= 3) throw Object.assign(new Error("offline"), { config });
    return { data: { ok: true }, status: 200, config };
  };
  expect((await chayHetHenGio(() => layCoBoNho("/courses"))).loi).toBeInstanceOf(Error);
  await expect(layCoBoNho("/courses")).resolves.toEqual({ ok: true });
});

it("gives up on hung requests with a clear message, but lets AI calls wait longer", async () => {
  const { default: api, THOI_GIAN_CHO_AI_MS } = await import("./api");
  expect(api.defaults.timeout).toBe(25000);
  expect(THOI_GIAN_CHO_AI_MS).toBeGreaterThan(api.defaults.timeout);
  let lan = 0;
  api.defaults.adapter = async (config) => {
    lan += 1;
    throw Object.assign(new Error("timeout of 25000ms exceeded"), { code: "ECONNABORTED", config });
  };
  const { loi } = await chayHetHenGio(() => api.get("/decks"));
  expect(loi.message).toBe("Máy chủ phản hồi chậm. Chờ thêm chút rồi thử lại nhé.");
  expect(lan).toBe(3);
});

it("retries reads while the server wakes up, never retries writes, and reports a slow server", async () => {
  const { default: api, layMayChuCham, theoDoiMayChuCham } = await import("./api");
  const trangThai = [];
  theoDoiMayChuCham(() => trangThai.push(layMayChuCham()));
  let lanDoc = 0;
  let lanGhi = 0;
  api.defaults.adapter = (config) => {
    if (config.method === "post") {
      lanGhi += 1;
      return Promise.reject(Object.assign(new Error("offline"), { config }));
    }
    lanDoc += 1;
    // Lần đầu: 503 sau 7 s (máy chủ đang dậy); lần gọi lại thì xong
    if (lanDoc === 1) {
      return new Promise((_ok, loi) =>
        setTimeout(() => loi(Object.assign(new Error("503"), { config, response: { status: 503, data: {} } })), 7000)
      );
    }
    return Promise.resolve({ data: { ok: true }, status: 200, config });
  };
  expect((await chayHetHenGio(() => api.get("/courses"))).data.data).toEqual({ ok: true });
  expect(lanDoc).toBe(2);
  expect(trangThai).toEqual([true, false]);
  expect(layMayChuCham()).toBe(false);

  expect((await chayHetHenGio(() => api.post("/course-questions/1/answer", {}))).loi).toBeInstanceOf(Error);
  expect(lanGhi).toBe(1);
});
