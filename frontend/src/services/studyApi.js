import api from "./api";
import {
  ketThucStudySessionLocal,
  luuStudyAnswersLocal,
  taoStudySessionLocal,
} from "../utils/studySessionHistory";

const sessionDrafts = new Map();

function isLocalSession(sessionId) {
  return String(sessionId || "").startsWith("local-");
}

export async function taoStudySession(payload) {
  try {
    const response = await api.post("/study-sessions", payload);
    sessionDrafts.set(String(response.data.id), payload);
    return response.data;
  } catch {
    return taoStudySessionLocal(payload);
  }
}

export async function ketThucStudySession(sessionId, payload) {
  if (isLocalSession(sessionId)) {
    return ketThucStudySessionLocal(sessionId, payload);
  }

  try {
    const response = await api.patch(`/study-sessions/${sessionId}/finish`, payload);
    sessionDrafts.delete(String(sessionId));
    return response.data;
  } catch {
    const draft = sessionDrafts.get(String(sessionId)) || {};
    sessionDrafts.delete(String(sessionId));
    return ketThucStudySessionLocal(`local-${sessionId}`, {
      ...draft,
      ...payload,
    });
  }
}

export async function luuStudyAnswers(sessionId, answers) {
  if (isLocalSession(sessionId)) {
    return luuStudyAnswersLocal(sessionId, answers);
  }

  try {
    const response = await api.post(`/study-sessions/${sessionId}/answers`, {
      answers,
    });
    return response.data;
  } catch {
    return luuStudyAnswersLocal(sessionId, answers);
  }
}

export async function luuQuizResult(payload) {
  const response = await api.post("/quiz-results", payload);
  return response.data;
}
