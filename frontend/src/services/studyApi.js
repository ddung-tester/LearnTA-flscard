import api from "./api";

export async function taoStudySession(payload) {
  const response = await api.post("/study-sessions", payload);
  return response.data;
}

export async function ketThucStudySession(sessionId, payload) {
  const response = await api.patch(`/study-sessions/${sessionId}/finish`, payload);
  return response.data;
}

export async function luuStudyAnswers(sessionId, answers) {
  const response = await api.post(`/study-sessions/${sessionId}/answers`, {
    answers,
  });
  return response.data;
}

export async function luuQuizResult(payload) {
  const response = await api.post("/quiz-results", payload);
  return response.data;
}
