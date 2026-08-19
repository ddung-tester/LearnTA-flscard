/**
 * TrangThongKe — Trang thống ke hoc tap tong hop.
 */
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { layDanhSachDeck } from "../services/deckApi";
import { getUserStats } from "../services/userApi";
import { layTatCaSRS, taiSRSDongBo } from "../utils/srsReview";
import { layTatCaTuSai, taiTuSaiDongBo } from "../utils/mistakeNotebook";
import { layTienDoDeck } from "../utils/tienDoHocTap";
import { layStudySessionSummary } from "../services/studySessionApi";
import EmptyState from "../components/common/EmptyState";
import { usePageTransition } from "../contexts/PageTransitionContext";

function tinhPhanPhoiMastery(srsList) {
  const dist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const e of srsList) {
    const lv = Math.min(5, Math.max(0, e.level ?? 0));
    dist[lv] = (dist[lv] || 0) + 1;
  }
  return dist;
}

function tinhThongKeSrsDanhSach(entries) {
  const active = entries.filter((entry) => entry.status === "active");
  const due = active.filter((entry) => {
    if (!entry.nextReviewAt) return true;
    return new Date(entry.nextReviewAt) <= new Date();
  }).length;
  const mastered = entries.filter((entry) => entry.status === "mastered").length;

  return {
    total: entries.length,
    duHomNay: due,
    active: active.length,
    mastered,
    khoHoc: active.length - due,
  };
}

function tinhThongKeTuSaiDanhSach(entries) {
  const active = entries.filter((entry) => entry.status === "active").length;
  const reviewed = entries.filter((entry) => entry.status === "reviewed").length;
  return { total: entries.length, active, reviewed };
}

function layTuKhoNhat(all, n = 8) {
  return all.filter((e) => e.status === "active")
    .sort((a, b) => (b.mistakeCount ?? 0) - (a.mistakeCount ?? 0))
    .slice(0, n);
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  } catch { return ""; }
}

function formatStudyTime(seconds) {
  const total = Number(seconds || 0);
  if (total < 60) return total + " giây";
  const minutes = Math.round(total / 60);
  if (minutes < 60) return minutes + " phút";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}g ${rest}p` : `${hours}g`;
}

function modeLabel(mode) {
  return {
    flashcard: "Flashcard",
    quiz: "Quiz",
    written: "Tự luận",
    tuluan: "Tự luận",
    review: "Ôn tập",
  }[mode] || mode || "Khác";
}

function TkStatCard({ icon, label, value, sub, highlight = false }) {
  return (
    <div className={`tk-stat-card ${highlight ? "tk-stat-card--highlight" : ""}`.trim()}>
      <span className="tk-stat-card__icon" aria-hidden="true">{icon}</span>
      <div>
        <p className="tk-stat-card__value">{value ?? "—"}</p>
        <p className="tk-stat-card__label">{label}</p>
        {sub && <p className="tk-stat-card__sub">{sub}</p>}
      </div>
    </div>
  );
}

function MasteryBar({ label, count, total, color, level }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="tk-mastery-row">
      <div className="tk-mastery-row__meta">
        <span className={"tk-mastery-badge tk-mastery-badge--lv" + level}>{label}</span>
        <span className="tk-mastery-row__count">{count} từ</span>
      </div>
      <div className="tk-mastery-bar-wrap">
        <div className="tk-mastery-bar-fill" style={{ width: pct + "%", background: color }} />
      </div>
      <span className="tk-mastery-row__pct">{pct}%</span>
    </div>
  );
}

function DeckStatRow({ deck, srsList, mistakeList }) {
  const td = layTienDoDeck(deck.id);
  const deckSrs = srsList.filter((e) => String(e.deckId) === String(deck.id));
  const deckMistakes = mistakeList.filter((e) => String(e.deckId) === String(deck.id));
  const masteredCount = deckSrs.filter((e) => e.status === "mastered").length;
  const dueCount = deckSrs.filter((e) => e.status === "active" && new Date(e.nextReviewAt) <= new Date()).length;
  const mistakeCount = deckMistakes.filter((e) => e.status === "active").length;
  const total = deck.total_words ?? 0;
  const pct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
  const lastActivity = td?.lastActivityAt ?? null;
  return (
    <Link to={"/decks/" + deck.id} className="tk-deck-row">
      <div className="tk-deck-row__header">
        <span className="tk-deck-row__title">{deck.title}</span>
        <span className="tk-deck-row__date">{lastActivity ? "Học " + formatDate(lastActivity) : "Chưa học"}</span>
      </div>
      <div className="tk-deck-row__chips">
        <span className="tk-chip">{total} từ</span>
        {masteredCount > 0 && <span className="tk-chip tk-chip--master">🏆 {masteredCount}</span>}
        {dueCount > 0 && <span className="tk-chip tk-chip--due">📅 {dueCount}</span>}
        {mistakeCount > 0 && <span className="tk-chip tk-chip--mistake">✕ {mistakeCount}</span>}
        {deckSrs.length === 0 && <span className="tk-chip tk-chip--none">Chưa có SRS</span>}
      </div>
      <div className="tk-deck-row__bar-wrap" aria-label={pct + "% thành thạo"}>
        <div className="tk-deck-row__bar-fill" style={{ width: pct + "%" }} />
      </div>
      <span className="tk-deck-row__pct-label">{pct}% thành thạo</span>
    </Link>
  );
}

function DifficultWordRow({ entry }) {
  return (
    <div className="tk-word-row">
      <div className="tk-word-row__left">
        <span className="tk-word-row__word">{entry.word}</span>
        <span className="tk-word-row__meaning">{entry.meaning}</span>
      </div>
      <div className="tk-word-row__right">
        <span className="tk-word-row__count">✕ {entry.mistakeCount}</span>
        <span className="tk-word-row__deck">{entry.deckTitle}</span>
        {entry.lastWrongAt && <span className="tk-word-row__date">{formatDate(entry.lastWrongAt)}</span>}
      </div>
    </div>
  );
}

function ActivityBars({ days = [] }) {
  const maxCards = Math.max(1, ...days.map((day) => Number(day.cards_studied || 0)));

  return (
    <div className="tk-mastery-chart">
      {days.map((day) => {
        const cards = Number(day.cards_studied || 0);
        const pct = Math.max(4, Math.round((cards / maxCards) * 100));

        return (
          <div key={day.date} className="tk-mastery-row">
            <div className="tk-mastery-row__meta">
              <span className="tk-mastery-badge">{formatDate(day.date)}</span>
              <span className="tk-mastery-row__count">{day.session_count || 0} phiên</span>
            </div>
            <div className="tk-mastery-bar-wrap">
              <div className="tk-mastery-bar-fill" style={{ width: pct + "%" }} />
            </div>
            <span className="tk-mastery-row__pct">{cards}</span>
          </div>
        );
      })}
    </div>
  );
}

function ModeBreakdown({ modes = [] }) {
  return (
    <div className="tk-review-grid">
      {modes.map((item) => (
        <div key={item.mode} className="tk-review-card tk-review-card--upcoming">
          <span className="tk-review-card__num">{item.cards_studied || 0}</span>
          <span className="tk-review-card__label">
            {modeLabel(item.mode)} · {item.session_count || 0} phiên · {item.accuracy || 0}%
          </span>
        </div>
      ))}
    </div>
  );
}

function RecentSessionList({ sessions = [] }) {
  return (
    <div className="tk-deck-list">
      {sessions.map((session) => (
        <div key={session.id} className="tk-deck-row">
          <div className="tk-deck-row__header">
            <span className="tk-deck-row__title">
              {modeLabel(session.mode)}{session.deck_title ? " · " + session.deck_title : ""}
            </span>
            <span className="tk-deck-row__date">
              {formatDate(session.ended_at || session.started_at)}
            </span>
          </div>
          <div className="tk-deck-row__chips">
            <span className="tk-chip">{session.total_cards ?? session.total ?? 0} từ</span>
            <span className="tk-chip tk-chip--master">{session.accuracy ?? 0}% đúng</span>
            <span className="tk-chip">{formatStudyTime(session.duration_seconds)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const MASTERY_LEVELS = [
  { level: 0, label: "Mới",        color: "oklch(72% 0.07 260)" },
  { level: 1, label: "Lv.1",       color: "oklch(66% 0.13 220)" },
  { level: 2, label: "Lv.2",       color: "oklch(62% 0.15 180)" },
  { level: 3, label: "Lv.3",       color: "oklch(58% 0.16 150)" },
  { level: 4, label: "Lv.4",       color: "oklch(54% 0.16 120)" },
  { level: 5, label: "Thành thạo", color: "oklch(50% 0.16 164)" },
];

function TrangThongKe() {
  const { setPageDataLoading } = usePageTransition();
  const [decks, setDecks] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [dangTai, setDangTai] = useState(true);

  const [srsList, setSrsList] = useState(() => layTatCaSRS());
  const [mistakeList, setMistakeList] = useState(() => layTatCaTuSai());
  const srsStats     = useMemo(() => tinhThongKeSrsDanhSach(srsList), [srsList]);
  const mistakeStats = useMemo(() => tinhThongKeTuSaiDanhSach(mistakeList), [mistakeList]);
  const masteryDist  = useMemo(() => tinhPhanPhoiMastery(srsList), [srsList]);
  const tuKhoNhat    = useMemo(() => layTuKhoNhat(mistakeList, 8), [mistakeList]);
  const tongTu = useMemo(() => (decks ?? []).reduce((s, d) => s + (d.total_words ?? 0), 0), [decks]);

  useEffect(() => {
    let active = true;

    Promise.all([
      layDanhSachDeck(),
      getUserStats(),
      layStudySessionSummary(),
      taiSRSDongBo({ limit: 200 }),
      taiTuSaiDongBo({ limit: 200 }),
    ])
      .then(([ds, st, sessionData, syncedSrs, syncedMistakes]) => {
        if (!active) return;
        setDecks(ds);
        setUserStats(st);
        setSessionSummary(sessionData);
        setSrsList(syncedSrs);
        setMistakeList(syncedMistakes);
      })
      .catch(() => {
        if (active) setDecks([]);
      })
      .finally(() => {
        if (active) setDangTai(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Báo cho PageTransitionContext biết trang đang tải dữ liệu
  useLayoutEffect(() => {
    setPageDataLoading("thong-ke", dangTai);
    return () => {
      setPageDataLoading("thong-ke", false);
    };
  }, [dangTai, setPageDataLoading]);

  const totalSrsItems = srsList.length;
  const activityDays = sessionSummary?.last_7_days_activity ?? [];
  const modeBreakdown = sessionSummary?.mode_breakdown ?? [];
  const recentSessions = sessionSummary?.recent_sessions ?? [];
  const hasStudyHistory = Number(sessionSummary?.total_sessions || 0) > 0;

  return (
    <div className="tk-page">
      <section className="tk-header">
        <div className="tk-header__text">
          <h1 className="tk-header__title">📊 Thống kê học tập</h1>
          <p className="tk-header__sub">Tổng quan tiến độ từ vựng của bạn qua tất cả bộ từ</p>
        </div>
        <div className="tk-header__actions">
          {srsStats.duHomNay > 0 && (
            <Link to="/review" className="tk-cta-btn tk-cta-btn--primary" id="tk-btn-review">
              📅 Ôn tập ({srsStats.duHomNay})
            </Link>
          )}
          {mistakeStats.active > 0 && (
            <Link to="/tu-sai" className="tk-cta-btn tk-cta-btn--secondary" id="tk-btn-tusai">
              📓 Từ sai ({mistakeStats.active})
            </Link>
          )}
        </div>
      </section>

      <section className="tk-section">
        <h2 className="tk-section__title">Tổng quan</h2>
        <div className="tk-stat-grid">
          <TkStatCard icon="📝" label="Tổng từ"    value={dangTai ? "…" : tongTu} />
          <TkStatCard icon="🏆" label="Thành thạo" value={srsStats.mastered}
            sub={totalSrsItems > 0 ? "/ " + totalSrsItems + " trong SRS" : "Chưa có"}
            highlight={srsStats.mastered > 0} />
          <TkStatCard icon="📖" label="Đang học"   value={srsStats.khoHoc} sub="Active trong SRS" />
          <TkStatCard icon="📅" label="Ôn hôm nay" value={srsStats.duHomNay}
            sub={srsStats.duHomNay > 0 ? "Cần ôn ngay!" : "Không có gì"}
            highlight={srsStats.duHomNay > 0} />
          <TkStatCard icon="✕"  label="Từ sai"     value={mistakeStats.active}
            sub={mistakeStats.reviewed > 0 ? mistakeStats.reviewed + " đã ôn" : "Chưa có"} />
          <TkStatCard icon="🔥" label="Streak"     value={userStats?.current_streak ?? "…"}
            sub={userStats?.longest_streak ? "Dài nhất: " + userStats.longest_streak : null} />
          <TkStatCard icon="⭐" label="Tổng XP"    value={userStats?.total_xp ?? "…"} />
          <TkStatCard icon="📚" label="Bộ từ"      value={dangTai ? "…" : (decks?.length ?? 0)} />
          <TkStatCard icon="🎯" label="Phiên học" value={sessionSummary?.total_sessions ?? 0}
            sub={(sessionSummary?.total_cards_studied ?? 0) + " từ đã học"} />
          <TkStatCard icon="⏱" label="Thời gian" value={formatStudyTime(sessionSummary?.total_duration_seconds)}
            sub={(sessionSummary?.average_accuracy ?? 0) + "% đúng trung bình"} />
        </div>
      </section>

      <section className="tk-section">
        <h2 className="tk-section__title">Lịch sử học tập</h2>
        {!hasStudyHistory ? (
          <EmptyState
            icon="search"
            title="Chưa có phiên học nào"
            description="Hoàn thành Quiz, Tự luận, Flashcard hoặc Ôn tập để bắt đầu ghi lịch sử."
          />
        ) : (
          <>
            <p className="tk-section__sub">Hoạt động 7 ngày gần nhất</p>
            <ActivityBars days={activityDays} />
            {modeBreakdown.length > 0 && (
              <>
                <p className="tk-section__sub">Theo chế độ học</p>
                <ModeBreakdown modes={modeBreakdown} />
              </>
            )}
            {recentSessions.length > 0 && (
              <>
                <p className="tk-section__sub">Phiên gần đây</p>
                <RecentSessionList sessions={recentSessions} />
              </>
            )}
          </>
        )}
      </section>

      {totalSrsItems > 0 && (
        <section className="tk-section">
          <h2 className="tk-section__title">Phân phối thành thạo</h2>
          <p className="tk-section__sub">{totalSrsItems} từ trong SRS · Tích lũy qua Quiz, Tự luận và Flashcard</p>
          <div className="tk-mastery-chart">
            {MASTERY_LEVELS.map(({ level, label, color }) => (
              <MasteryBar key={level} label={label} count={masteryDist[level] ?? 0}
                total={totalSrsItems} color={color} level={level} />
            ))}
          </div>
        </section>
      )}

      {totalSrsItems > 0 && (
        <section className="tk-section">
          <h2 className="tk-section__title">Trạng thái ôn tập</h2>
          <div className="tk-review-grid">
            <div className="tk-review-card tk-review-card--due">
              <span className="tk-review-card__num">{srsStats.duHomNay}</span>
              <span className="tk-review-card__label">Cần ôn hôm nay</span>
              {srsStats.duHomNay > 0 && <Link to="/review" className="tk-review-card__link">Bắt đầu →</Link>}
            </div>
            <div className="tk-review-card tk-review-card--upcoming">
              <span className="tk-review-card__num">{srsStats.khoHoc}</span>
              <span className="tk-review-card__label">Sắp đến hạn</span>
            </div>
            <div className="tk-review-card tk-review-card--mastered">
              <span className="tk-review-card__num">{srsStats.mastered}</span>
              <span className="tk-review-card__label">Đã thành thạo</span>
            </div>
            <div className="tk-review-card tk-review-card--mistake">
              <span className="tk-review-card__num">{mistakeStats.active}</span>
              <span className="tk-review-card__label">Từ sai cần ôn</span>
              {mistakeStats.active > 0 && <Link to="/tu-sai" className="tk-review-card__link">Xem →</Link>}
            </div>
          </div>
        </section>
      )}

      <section className="tk-section">
        <div className="tk-section__header">
          <h2 className="tk-section__title">Từ khó nhất</h2>
          {mistakeStats.active > 0 && <Link to="/tu-sai" className="tk-section__link">Xem tất cả →</Link>}
        </div>
        {tuKhoNhat.length === 0 ? (
          <EmptyState icon="search" title="Chưa có từ sai nào"
            description="Làm quiz hoặc tự luận để hệ thống theo dõi từ bạn hay nhầm." />
        ) : (
          <div className="tk-word-list">
            {tuKhoNhat.map((entry) => <DifficultWordRow key={entry.id} entry={entry} />)}
          </div>
        )}
      </section>

      <section className="tk-section">
        <div className="tk-section__header">
          <h2 className="tk-section__title">Tiến độ theo bộ từ</h2>
          <Link to="/decks" className="tk-section__link">Xem tất cả →</Link>
        </div>
        {dangTai ? (
          <div className="tk-deck-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="tk-deck-row tk-deck-row--loading">
                <div className="skeleton-shimmer" style={{ height: "1rem", width: "55%", marginBottom: "0.4rem" }} />
                <div className="skeleton-shimmer" style={{ height: "0.75rem", width: "35%" }} />
              </div>
            ))}
          </div>
        ) : decks?.length === 0 ? (
          <EmptyState icon="deck" title="Chưa có bộ từ nào"
            description="Tạo bộ từ để bắt đầu theo dõi tiến độ." />
        ) : (
          <div className="tk-deck-list">
            {(decks ?? []).map((deck) => (
              <DeckStatRow key={deck.id} deck={deck} srsList={srsList} mistakeList={mistakeList} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default TrangThongKe;
