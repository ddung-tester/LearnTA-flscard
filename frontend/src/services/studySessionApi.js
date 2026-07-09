import api from "./api";
import {
  layStudySessionsLocal,
  layStudySessionSummaryLocal,
  luuStudySessionHoanThanhLocal,
} from "../utils/studySessionHistory";

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export async function layStudySessions(params = {}) {
  try {
    const response = await api.get("/study-sessions", { params: cleanParams(params) });
    return response.data;
  } catch {
    return layStudySessionsLocal(params);
  }
}

export async function layStudySessionSummary() {
  try {
    const response = await api.get("/study-sessions/summary");
    return response.data;
  } catch {
    return layStudySessionSummaryLocal();
  }
}

export async function luuStudySessionHoanThanh(payload) {
  try {
    const response = await api.post("/study-sessions", payload);
    return response.data;
  } catch {
    return luuStudySessionHoanThanhLocal(payload);
  }
}
