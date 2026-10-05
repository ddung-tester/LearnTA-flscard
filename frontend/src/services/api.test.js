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
