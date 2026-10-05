import api from "./api";
import {
  capNhatStudySessionLocal,
  ketThucStudySessionLocal,
  layStudySessionsLocal,
  luuStudyAnswersLocal,
  taoStudySessionLocal,
} from "../utils/studySessionHistory";
import { layPhienKhoHocTap, laPhienKhoHienTai } from "../utils/khoHocTap";

const starts = new Map();
const saves = new Map();

function assertOwner(owner) {
  if (!laPhienKhoHienTai(owner)) throw new Error("Tài khoản đã thay đổi. Kết quả được giữ trong kho của tài khoản trước.");
}

function draft(sessionId) {
  return layStudySessionsLocal().find((session) => String(session.id) === String(sessionId));
}

export async function taoStudySession(payload) {
  const owner = layPhienKhoHocTap();
  const session = taoStudySessionLocal({ ...payload, sync: { create: payload, remoteId: null } });
  const pending = api.post("/study-sessions", payload).then((response) => {
    assertOwner(owner);
    const current = draft(session.id);
    capNhatStudySessionLocal(session.id, { sync: { ...current.sync, remoteId: response.data.id } });
    return response.data.id;
  }).catch((error) => ({ error }));
  starts.set(session.id, pending);
  pending.finally(() => starts.delete(session.id));
  return session;
}

async function remoteId(sessionId, owner) {
  assertOwner(owner);
  if (!String(sessionId).startsWith("local-")) return sessionId;
  if (starts.has(sessionId)) {
    const result = await starts.get(sessionId);
    assertOwner(owner);
    starts.delete(sessionId);
    if (result?.error) throw result.error;
  }
  const current = draft(sessionId);
  if (current.sync.remoteId) return current.sync.remoteId;
  const response = await api.post("/study-sessions", current.sync.create);
  assertOwner(owner);
  capNhatStudySessionLocal(sessionId, { sync: { ...draft(sessionId).sync, remoteId: response.data.id } });
  return response.data.id;
}

export async function ketThucStudySession(sessionId, payload) {
  const owner = layPhienKhoHocTap();
  if (String(sessionId).startsWith("local-")) ketThucStudySessionLocal(sessionId, payload);
  const id = await remoteId(sessionId, owner);
  const response = await api.patch(`/study-sessions/${id}/finish`, payload);
  assertOwner(owner);
  return response.data;
}

export async function luuStudyAnswers(sessionId, answers) {
  const owner = layPhienKhoHocTap();
  if (String(sessionId).startsWith("local-")) luuStudyAnswersLocal(sessionId, answers);
  const id = await remoteId(sessionId, owner);
  const response = await api.post(`/study-sessions/${id}/answers`, { answers });
  assertOwner(owner);
  return response.data;
}

export async function luuQuizResult(payload) {
  const response = await api.post("/quiz-results", payload);
  return response.data;
}

export function luuKetQuaPhien(sessionId, { finish, answers = [], quiz }) {
  const owner = layPhienKhoHocTap();
  assertOwner(owner);
  const current = draft(sessionId);
  ketThucStudySessionLocal(sessionId, finish);
  luuStudyAnswersLocal(sessionId, answers);
  capNhatStudySessionLocal(sessionId, {
    sync: { ...current.sync, pending: true, finish, quiz, quizSaved: current.sync?.quizSaved ?? false },
  });
  return dongBoKetQuaPhien(sessionId);
}

export function dongBoKetQuaPhien(sessionId) {
  const owner = layPhienKhoHocTap();
  const existing = saves.get(sessionId);
  if (existing?.owner === owner) return existing.promise;
  const promise = (async () => {
    const current = draft(sessionId);
    if (!current?.sync?.pending) return;
    await ketThucStudySession(sessionId, current.sync.finish);
    assertOwner(owner);
    if (current.answers.length) await luuStudyAnswers(sessionId, current.answers);
    assertOwner(owner);
    if (current.sync.quiz && !current.sync.quizSaved) {
      await luuQuizResult(current.sync.quiz);
      assertOwner(owner);
      capNhatStudySessionLocal(sessionId, { sync: { ...draft(sessionId).sync, quizSaved: true } });
    }
    capNhatStudySessionLocal(sessionId, { saved: true, sync: { ...draft(sessionId).sync, pending: false } });
  })().finally(() => {
    if (saves.get(sessionId)?.promise === promise) saves.delete(sessionId);
  });
  saves.set(sessionId, { owner, promise });
  return promise;
}

export async function dongBoKetQuaCho() {
  const owner = layPhienKhoHocTap();
  const pending = layStudySessionsLocal().filter((session) => session.sync?.pending);
  for (const session of pending) {
    assertOwner(owner);
    try {
      await dongBoKetQuaPhien(session.id);
    } catch {
      assertOwner(owner);
    }
  }
}
