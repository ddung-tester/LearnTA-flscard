import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { taoStudySessionLocal, ketThucStudySessionLocal, layStudySessionSummaryLocal, layStudySessionsLocal } from "./studySessionHistory";
beforeEach(() => {
  const data = new Map();
  vi.stubGlobal("window", { localStorage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } });
});
it("excludes abandoned sessions from totals, activity, modes and recent history", () => {
  taoStudySessionLocal({ total: 100, mode: "flashcard" });
  const completed = taoStudySessionLocal({ total: 4, mode: "quiz" });
  ketThucStudySessionLocal(completed.id, { correct: 2, review: 2, xp_earned: 20 });
  expect(layStudySessionsLocal()).toHaveLength(2);
  const summary = layStudySessionSummaryLocal();
  expect(summary).toMatchObject({ total_sessions: 1, total_cards_studied: 4, average_accuracy: 50, total_xp_earned: 20 });
  expect(summary.mode_breakdown).toHaveLength(1);
  expect(summary.recent_sessions).toHaveLength(1);
  expect(summary.last_7_days_activity.reduce((sum, day) => sum + day.cards_studied, 0)).toBe(4);
});


afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it("assigns activity to the Vietnam day at the UTC day boundary", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-05T17:01:00Z"));
  const row = taoStudySessionLocal({ total: 1 });
  ketThucStudySessionLocal(row.id, { correct: 1, ended_at: "2026-10-05T17:00:00Z" });
  const days = layStudySessionSummaryLocal().last_7_days_activity;
  expect(days.at(-1)).toMatchObject({ date: "2026-10-06", cards_studied: 1 });
  expect(days.at(-2)).toMatchObject({ date: "2026-10-05", cards_studied: 0 });
});
