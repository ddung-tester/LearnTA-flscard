const KHO_STUDY_SESSIONS = "streak_drop_study_sessions_v1";

function coTheDungLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function docSessions() {
  if (!coTheDungLocalStorage()) return [];

  try {
    const raw = window.localStorage.getItem(KHO_STUDY_SESSIONS);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function ghiSessions(sessions) {
  if (!coTheDungLocalStorage()) return;

  try {
    window.localStorage.setItem(KHO_STUDY_SESSIONS, JSON.stringify(sessions));
  } catch {
    // localStorage co the bi day hoac bi chan. Bo qua de flow hoc khong bi dung.
  }
}

function taoLocalId() {
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function tinhDurationSeconds(startedAt, endedAt, explicitDuration = 0) {
  const explicit = toNumber(explicitDuration);
  if (explicit > 0) return Math.round(explicit);

  const start = startedAt ? new Date(startedAt).getTime() : NaN;
  const end = endedAt ? new Date(endedAt).getTime() : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 1000);
}

function normalizeSession(payload = {}) {
  const startedAt = payload.started_at ?? payload.startedAt ?? new Date().toISOString();
  const endedAt = payload.ended_at ?? payload.endedAt ?? null;
  const total = toNumber(payload.total ?? payload.total_cards ?? payload.totalCards);
  const correct = toNumber(payload.correct ?? payload.correct_count ?? payload.correctCount);
  const wrong = toNumber(payload.review ?? payload.wrong_count ?? payload.wrongCount);
  const durationSeconds = tinhDurationSeconds(
    startedAt,
    endedAt,
    payload.duration_seconds ?? payload.durationSeconds
  );

  return {
    id: payload.id ?? taoLocalId(),
    user_id: payload.user_id ?? null,
    deck_id: payload.deck_id ?? payload.deckId ?? null,
    deck_title: payload.deck_title ?? payload.deckTitle ?? "",
    mode: payload.mode ?? "quiz",
    direction: payload.direction ?? "en-vi",
    only_favorite: Boolean(payload.only_favorite ?? payload.onlyFavorite ?? false),
    random_order: Boolean(payload.random_order ?? payload.randomOrder ?? false),
    started_at: startedAt,
    ended_at: endedAt,
    duration_seconds: durationSeconds,
    total,
    total_cards: total,
    correct,
    correct_count: correct,
    review: wrong,
    wrong_count: wrong,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    xp_earned: toNumber(payload.xp_earned ?? payload.xpEarned),
    max_combo: toNumber(payload.max_combo ?? payload.maxCombo),
    created_at: payload.created_at ?? startedAt,
    updated_at: payload.updated_at ?? endedAt ?? startedAt,
    saved: false,
  };
}

export function taoStudySessionLocal(payload) {
  const session = normalizeSession(payload);
  const sessions = docSessions();
  ghiSessions([session, ...sessions].slice(0, 300));
  return session;
}

export function ketThucStudySessionLocal(sessionId, payload) {
  const sessions = docSessions();
  const index = sessions.findIndex((session) => String(session.id) === String(sessionId));
  const current = index >= 0 ? sessions[index] : { id: sessionId };
  const endedAt = payload.ended_at ?? payload.endedAt ?? new Date().toISOString();
  const updated = normalizeSession({
    ...current,
    ...payload,
    id: current.id || sessionId,
    ended_at: endedAt,
  });

  if (index >= 0) {
    sessions[index] = updated;
  } else {
    sessions.unshift(updated);
  }

  ghiSessions(sessions.slice(0, 300));
  return updated;
}

export function luuStudyAnswersLocal() {
  return { inserted_count: 0, answers: [], saved: false };
}

export function luuStudySessionHoanThanhLocal(payload) {
  return taoStudySessionLocal({
    ...payload,
    ended_at: payload.ended_at ?? payload.endedAt ?? new Date().toISOString(),
  });
}

export function layStudySessionsLocal(params = {}) {
  let sessions = docSessions();

  if (params.mode) {
    sessions = sessions.filter((session) => session.mode === params.mode);
  }

  if (params.deckId || params.deck_id) {
    const deckId = String(params.deckId ?? params.deck_id);
    sessions = sessions.filter((session) => String(session.deck_id) === deckId);
  }

  if (params.from) {
    sessions = sessions.filter(
      (session) => String(session.ended_at || session.started_at).slice(0, 10) >= params.from
    );
  }

  if (params.to) {
    sessions = sessions.filter(
      (session) => String(session.ended_at || session.started_at).slice(0, 10) <= params.to
    );
  }

  return sessions;
}

function buildLast7Days() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
}

export function layStudySessionSummaryLocal() {
  const sessions = docSessions();
  const totalCards = sessions.reduce((sum, session) => sum + toNumber(session.total), 0);
  const totalCorrect = sessions.reduce((sum, session) => sum + toNumber(session.correct), 0);
  const totalDuration = sessions.reduce(
    (sum, session) => sum + toNumber(session.duration_seconds),
    0
  );
  const modeMap = new Map();

  for (const session of sessions) {
    const current = modeMap.get(session.mode) || {
      mode: session.mode,
      session_count: 0,
      cards_studied: 0,
      correct_count: 0,
      wrong_count: 0,
    };

    current.session_count += 1;
    current.cards_studied += toNumber(session.total);
    current.correct_count += toNumber(session.correct);
    current.wrong_count += toNumber(session.review);
    modeMap.set(session.mode, current);
  }

  const days = buildLast7Days();
  const activity = days.map((date) => {
    const sameDay = sessions.filter(
      (session) => String(session.ended_at || session.started_at).slice(0, 10) === date
    );

    return {
      date,
      session_count: sameDay.length,
      cards_studied: sameDay.reduce((sum, session) => sum + toNumber(session.total), 0),
      correct_count: sameDay.reduce((sum, session) => sum + toNumber(session.correct), 0),
      wrong_count: sameDay.reduce((sum, session) => sum + toNumber(session.review), 0),
      duration_seconds: sameDay.reduce(
        (sum, session) => sum + toNumber(session.duration_seconds),
        0
      ),
    };
  });

  return {
    total_sessions: sessions.length,
    total_cards_studied: totalCards,
    average_accuracy: totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0,
    total_duration_seconds: totalDuration,
    total_xp_earned: sessions.reduce((sum, session) => sum + toNumber(session.xp_earned), 0),
    last_7_days_activity: activity,
    mode_breakdown: [...modeMap.values()].map((item) => ({
      ...item,
      accuracy:
        item.cards_studied > 0
          ? Math.round((item.correct_count / item.cards_studied) * 100)
          : 0,
    })),
    recent_sessions: sessions.slice(0, 8),
    saved: false,
  };
}
