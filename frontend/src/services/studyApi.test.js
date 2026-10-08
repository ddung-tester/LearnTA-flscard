import { beforeEach, expect, it, vi } from "vitest";
import { chonKhoHocTap } from "../utils/khoHocTap";
import { layStudySessionsLocal, taoStudySessionLocal } from "../utils/studySessionHistory";
import { taoStudySession, luuKetQuaPhien, dongBoKetQuaPhien, dongBoKetQuaCho } from "./studyApi";

const api = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));
vi.mock("./api", () => ({ default: api }));
const create = { deck_id: 10, mode: "quiz", direction: "vi-en", total: 1 };
const result = {
  finish: { correct: 1, review: 0, total: 1, xp_earned: 10 },
  answers: [{ card_id: 101, user_answer: "apple", is_correct: true }],
  quiz: { deck_id: 10, question_type: "multiple-choice", correct: 1, review: 0, total: 1 },
};

beforeEach(() => {
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  vi.stubGlobal("window", { localStorage });
  chonKhoHocTap(null);
  chonKhoHocTap(1);
  api.post.mockReset().mockResolvedValue({ data: { id: 42 } });
  api.patch.mockReset().mockResolvedValue({ data: { id: 42 } });
});

it("keeps completed answers and waits for a late session creation before finish/SRS", async () => {
  let resolve;
  api.post.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const session = await taoStudySession(create);
  const saving = luuKetQuaPhien(session.id, result);
  expect(layStudySessionsLocal()[0].answers).toEqual(result.answers);
  expect(layStudySessionsLocal()[0].sync.pending).toBe(true);
  expect(api.patch).not.toHaveBeenCalled();
  resolve({ data: { id: 42 } });
  await saving;
  expect(api.patch).toHaveBeenCalledWith("/study-sessions/42/finish", result.finish);
  expect(api.post).toHaveBeenCalledWith("/study-sessions/42/answers", { answers: result.answers });
  expect(layStudySessionsLocal()[0].saved).toBe(true);
});

it("reports 503, preserves full results and retries using the same remote session", async () => {
  const session = await taoStudySession(create);
  api.patch.mockRejectedValueOnce(new Error("503"));
  await expect(luuKetQuaPhien(session.id, result)).rejects.toThrow("503");
  expect(layStudySessionsLocal()[0].answers).toEqual(result.answers);
  expect(layStudySessionsLocal()[0].saved).toBe(false);
  await dongBoKetQuaPhien(session.id);
  expect(api.post.mock.calls.filter(([url]) => url === "/study-sessions")).toHaveLength(1);
  expect(api.patch.mock.calls.map(([url]) => url)).toEqual([
    "/study-sessions/42/finish", "/study-sessions/42/finish",
  ]);
  expect(layStudySessionsLocal()[0].sync.pending).toBe(false);
});

it("can resume persisted answers after a failed answers request and browser reload", async () => {
  const session = await taoStudySession(create);
  api.post.mockImplementation(async (url) => {
    if (url.endsWith("/answers")) throw new Error("offline");
    return { data: { id: 42 } };
  });
  await expect(luuKetQuaPhien(session.id, result)).rejects.toThrow("offline");
  api.post.mockResolvedValue({ data: { id: 42 } });
  vi.resetModules();
  const restoredOwner = await import("../utils/khoHocTap");
  restoredOwner.chonKhoHocTap(1);
  const reloaded = await import("./studyApi");
  await reloaded.dongBoKetQuaCho();
  expect(layStudySessionsLocal()[0].answers).toEqual(result.answers);
  expect(layStudySessionsLocal()[0].saved).toBe(true);
  expect(api.post.mock.calls.filter(([url]) => url === "/study-sessions")).toHaveLength(1);
});

it("does not send A's remaining answers with B's token after account switch", async () => {
  const session = await taoStudySession(create);
  let resolve;
  api.patch.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const saving = luuKetQuaPhien(session.id, result);
  await vi.waitFor(() => expect(api.patch).toHaveBeenCalled());
  chonKhoHocTap(2);
  resolve({ data: { id: 42 } });
  await expect(saving).rejects.toThrow();
  expect(layStudySessionsLocal()).toEqual([]);
  expect(api.post.mock.calls.filter(([url]) => url.endsWith("/answers"))).toHaveLength(0);
  chonKhoHocTap(1);
  expect(layStudySessionsLocal()[0].sync.pending).toBe(true);
});

it("shares concurrent retries and does not repeat a saved quiz", async () => {
  const session = await taoStudySession(create);
  api.patch.mockRejectedValueOnce(new Error("offline"));
  await expect(luuKetQuaPhien(session.id, result)).rejects.toThrow();
  await Promise.all([dongBoKetQuaPhien(session.id), dongBoKetQuaPhien(session.id)]);
  await dongBoKetQuaCho();
  expect(api.post.mock.calls.filter(([url]) => url === "/quiz-results")).toHaveLength(1);
});


it("keeps guest results locally without creating or mutating any server session", async () => {
  chonKhoHocTap(null);
  const session = await taoStudySession(create);
  await luuKetQuaPhien(session.id, result);
  await dongBoKetQuaCho();
  expect(api.post).not.toHaveBeenCalled();
  expect(api.patch).not.toHaveBeenCalled();
  expect(layStudySessionsLocal()[0]).toMatchObject({
    answers: result.answers, correct: 1, saved: false,
    sync: { localOnly: true, pending: false },
  });
  chonKhoHocTap(2);
  expect(layStudySessionsLocal()).toEqual([]);
});
it("retains old pending guest sessions locally and never retries them against the server", async () => {
  chonKhoHocTap(null);
  taoStudySessionLocal({ ...result.finish, ended_at: new Date().toISOString(), answers: result.answers, sync: { create, remoteId: 42, finish: result.finish, pending: true } });
  await dongBoKetQuaCho();
  expect(api.post).not.toHaveBeenCalled();
  expect(api.patch).not.toHaveBeenCalled();
  expect(layStudySessionsLocal()[0].sync).toMatchObject({ localOnly: true, pending: false });
});

it("retries a lost create response after reload with the same persisted request key", async () => {
  const requests = [];
  let lost = false;
  api.post.mockImplementation(async (url, payload) => {
    if (url === "/study-sessions") {
      requests.push({ ...payload });
      if (!lost) { lost = true; throw new Error("response lost after commit"); }
    }
    return { data: { id: 42 } };
  });
  const session = await taoStudySession(create);
  await expect(luuKetQuaPhien(session.id, result)).rejects.toThrow("response lost");
  vi.resetModules();
  (await import("../utils/khoHocTap")).chonKhoHocTap(1);
  await (await import("./studyApi")).dongBoKetQuaCho();
  expect(requests).toHaveLength(2);
  expect(requests[0].client_request_id).toBe(session.id);
  expect(requests[1]).toEqual(requests[0]);
  expect(layStudySessionsLocal()[0].saved).toBe(true);
});
it("retries a lost quiz response after reload with the same key and different sessions have different keys", async () => {
  const requests = [];
  let lost = false;
  api.post.mockImplementation(async (url, payload) => {
    if (url === "/quiz-results") {
      requests.push({ ...payload });
      if (!lost) { lost = true; throw new Error("quiz response lost after commit"); }
    }
    return { data: { id: 42 } };
  });
  const session = await taoStudySession(create);
  await expect(luuKetQuaPhien(session.id, result)).rejects.toThrow("quiz response lost");
  vi.resetModules();
  (await import("../utils/khoHocTap")).chonKhoHocTap(1);
  const reloaded = await import("./studyApi");
  await reloaded.dongBoKetQuaCho();
  expect(requests).toHaveLength(2);
  expect(requests[0].client_request_id).toBe(session.id);
  expect(requests[1]).toEqual(requests[0]);
  const next = await reloaded.taoStudySession(create);
  await reloaded.luuKetQuaPhien(next.id, result);
  expect(next.id).not.toBe(session.id);
  expect(requests[2].client_request_id).toBe(next.id);
});

it("can replay a legacy numeric session id with a string quiz request key", async () => {
  taoStudySessionLocal({ id: 42, ...result.finish, answers: result.answers, sync: { create, remoteId: 42, finish: result.finish, quiz: result.quiz, pending: true } });
  await dongBoKetQuaCho();
  expect(api.post).toHaveBeenCalledWith("/quiz-results", { ...result.quiz, client_request_id: "42" });
  expect(layStudySessionsLocal()[0].saved).toBe(true);
});
