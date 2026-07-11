/**
 * TrangOnTapHomNay — Daily Review page (SRS).
 *
 * Hiển thị các từ đến hạn ôn hôm nay từ SRS queue (localStorage).
 * Khi user đánh giá (Again/Hard/Good/Easy):
 * 1. Cập nhật SRS queue local (capNhatKetQuaOn)
 * 2. Gọi backend PATCH /cards/:cardId/progress (is_correct) nếu có thể
 * 3. Show toast + chuyển sang card tiếp theo
 */
import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { Link } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import { usePageTransition } from "../contexts/PageTransitionContext";
import EmptyState from "../components/common/EmptyState";
import {
  layTatCaSRS,
  capNhatKetQuaOnDongBo,
  xoaKhoiSRSDongBo,
  taiSRSDongBo,
} from "../utils/srsReview";
import { luuStudySessionHoanThanh } from "../services/studySessionApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

function levelLabel(level) {
  if (level >= 5) return { text: "Thành thạo", cls: "review-badge--mastered" };
  if (level >= 3) return { text: "Khá", cls: "review-badge--good" };
  if (level >= 1) return { text: "Cơ bản", cls: "review-badge--ok" };
  return { text: "Mới", cls: "review-badge--new" };
}

function easeConfig(ease) {
  return {
    again: { label: "Lại", sub: "4 giờ", cls: "review-btn--again" },
    hard:  { label: "Khó", sub: "1 ngày", cls: "review-btn--hard" },
    good:  { label: "Ổn", sub: "3 ngày", cls: "review-btn--good" },
    easy:  { label: "Dễ", sub: "7 ngày", cls: "review-btn--easy" },
  }[ease];
}

function laDenHan(entry) {
  if (!entry.nextReviewAt) return true;
  return new Date(entry.nextReviewAt) <= new Date();
}

function matchReviewSearch(entry, search) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [entry.word, entry.meaning, entry.deckTitle]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

function tinhThongKeSRS(ds) {
  const activeItems = ds.filter((entry) => entry.status === "active");
  const duHomNay = activeItems.filter(laDenHan).length;
  const mastered = ds.filter((entry) => entry.status === "mastered").length;
  return {
    total: ds.length,
    duHomNay,
    active: activeItems.length,
    mastered,
    khoHoc: activeItems.length - duHomNay,
  };
}

function ReviewFilters({
  filterMode,
  setFilterMode,
  deckFilter,
  setDeckFilter,
  levelFilter,
  setLevelFilter,
  sourceFilter,
  setSourceFilter,
  search,
  setSearch,
  uniqueDecks,
  uniqueSources,
  onClear,
}) {
  return (
    <div className="review-filter-bar">
      <div className="review-filter-tabs" aria-label="Lọc lịch ôn">
        {[
          { key: "due", label: "Đến hạn" },
          { key: "active", label: "Đang học" },
          { key: "all", label: "Tất cả" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilterMode(item.key)}
            aria-pressed={filterMode === item.key}
            className={`review-filter-tab ${filterMode === item.key ? "review-filter-tab--active" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="review-search-input"
        placeholder="Tìm từ hoặc nghĩa"
        aria-label="Tìm trong lịch ôn"
      />

      {uniqueDecks.length > 1 && (
        <select
          value={deckFilter}
          onChange={(event) => setDeckFilter(event.target.value)}
          className="review-select"
          aria-label="Lọc theo bộ từ"
        >
          <option value="">Tất cả bộ từ</option>
          {uniqueDecks.map((deck) => (
            <option key={deck.deckId} value={String(deck.deckId)}>
              {deck.deckTitle || `Bộ ${deck.deckId}`}
            </option>
          ))}
        </select>
      )}

      <select
        value={levelFilter}
        onChange={(event) => setLevelFilter(event.target.value)}
        className="review-select"
        aria-label="Lọc theo cấp độ"
      >
        <option value="">Mọi cấp độ</option>
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <option key={level} value={String(level)}>
            Lv{level}
          </option>
        ))}
      </select>

      {uniqueSources.length > 1 && (
        <select
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.target.value)}
          className="review-select"
          aria-label="Lọc theo nguồn"
        >
          <option value="">Mọi nguồn</option>
          {uniqueSources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      )}

      {(filterMode !== "due" || deckFilter || levelFilter || sourceFilter || search) && (
        <button type="button" onClick={onClear} className="review-nav-btn">
          Xoá lọc
        </button>
      )}
    </div>
  );
}

// ── StatsBar ──────────────────────────────────────────────────────────────────

function StatsBar({ total, done, remaining }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="review-stats-bar">
      <div className="review-stats-bar__text">
        <span className="review-stats-bar__done">{done} đã ôn</span>
        <span className="review-stats-bar__sep">·</span>
        <span className="review-stats-bar__remaining">{remaining} còn lại</span>
      </div>
      <div className="review-stats-bar__track">
        <div
          className="review-stats-bar__fill"
          style={{ width: `${pct}%` }}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
}

// ── ReviewCard ────────────────────────────────────────────────────────────────

function ReviewCard({ entry, onRate, onRemove, isLoading }) {
  const [revealed, setRevealed] = useState(false);
  const badge = levelLabel(entry.level ?? 0);

  function handleReveal() {
    setRevealed(true);
  }

  function handleRate(ease) {
    if (!revealed || isLoading) return;
    onRate(entry.id, ease);
    setRevealed(false); // reset for next card (same component reused)
  }

  return (
    <div className="review-card ui-content-enter">
      {/* Card header */}
      <div className="review-card__header">
        <span className={`review-badge ${badge.cls}`}>{badge.text} · Lv{entry.level ?? 0}</span>
        <span className="review-card__deck">{entry.deckTitle || `Bộ ${entry.deckId}`}</span>
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          disabled={isLoading}
          className="review-card__remove"
          aria-label="Xoá khỏi hàng ôn"
          title="Xoá khỏi hàng ôn"
        >
          ✕
        </button>
      </div>

      {/* Word */}
      <div className="review-card__word-section">
        <p className="review-card__term">{entry.word}</p>

        {!revealed ? (
          <button
            type="button"
            onClick={handleReveal}
            className="review-card__reveal-btn"
            id="btn-reveal-answer"
          >
            Xem nghĩa →
          </button>
        ) : (
          <div className="review-card__reveal ui-content-enter">
            <p className="review-card__meaning">{entry.meaning}</p>
            {entry.example && (
              <p className="review-card__example">{entry.example}</p>
            )}
          </div>
        )}
      </div>

      {/* Rating buttons — only show after reveal */}
      {revealed && (
        <div className="review-card__rating ui-content-enter">
          <p className="review-card__rating-label">Bạn nhớ mức nào?</p>
          <div className="review-card__rating-row">
            {["again", "hard", "good", "easy"].map((ease) => {
              const cfg = easeConfig(ease);
              return (
                <button
                  key={ease}
                  type="button"
                  onClick={() => handleRate(ease)}
                  disabled={isLoading}
                  className={`review-btn ${cfg.cls}`}
                  id={`btn-rate-${ease}`}
                >
                  <span className="review-btn__label">{cfg.label}</span>
                  <span className="review-btn__sub">{cfg.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CompletionScreen ──────────────────────────────────────────────────────────

function CompletionScreen({ total }) {
  return (
    <div className="review-done ui-content-enter">
      <div className="review-done__emoji">🎉</div>
      <h2 className="review-done__title">Xong rồi!</h2>
      <p className="review-done__msg">
        Bạn đã ôn xong <strong>{total}</strong> từ hôm nay. Quay lại ngày mai để tiếp tục.
      </p>
      <div className="review-done__actions">
        <Link to="/dashboard" className="review-done-btn review-done-btn--primary">
          Về Dashboard
        </Link>
        <Link to="/tu-sai" className="review-done-btn review-done-btn--ghost">
          Sổ từ sai
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function TrangOnTapHomNay() {
  const toast = useToast();
  const { setPageDataLoading } = usePageTransition();

  const [allCards, setAllCards] = useState(() => layTatCaSRS());
  // The remote queue always syncs on mount. Starting at true lets the global
  // route overlay hand off to page loading without a blank frame in between.
  const [dangTai, setDangTai] = useState(true);
  const [filterMode, setFilterMode] = useState("due");
  const [deckFilter, setDeckFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [queue, setQueue] = useState([]);
  const [doneCount, setDoneCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [removedIds, setRemovedIds] = useState(new Set());
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [entryOverrides, setEntryOverrides] = useState({});
  const startedAtRef = useRef(new Date().toISOString());
  const daLuuSessionRef = useRef(false);
  const actionLockRef = useRef(false);
  const removedIdsRef = useRef(new Set());

  useLayoutEffect(() => {
    const loadingKey = "review-page";
    setPageDataLoading(loadingKey, dangTai);

    return () => {
      setPageDataLoading(loadingKey, false);
    };
  }, [dangTai, setPageDataLoading]);

  useEffect(() => {
    let mounted = true;

    taiSRSDongBo({ limit: 200 })
      .then((items) => {
        if (mounted) setAllCards(items);
      })
      .finally(() => {
        if (mounted) setDangTai(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const uniqueDecks = useMemo(() => {
    const seen = new Map();
    for (const entry of allCards) {
      const key = String(entry.deckId ?? "");
      if (key && !seen.has(key)) {
        seen.set(key, { deckId: entry.deckId, deckTitle: entry.deckTitle });
      }
    }
    return [...seen.values()];
  }, [allCards]);

  const uniqueSources = useMemo(
    () => [...new Set(allCards.map((entry) => entry.source).filter(Boolean))],
    [allCards]
  );

  const filteredCards = useMemo(() => {
    let ds = allCards;

    if (filterMode === "due") {
      ds = ds.filter((entry) => entry.status === "active" && laDenHan(entry));
    } else if (filterMode === "active") {
      ds = ds.filter((entry) => entry.status === "active");
    }

    if (deckFilter) ds = ds.filter((entry) => String(entry.deckId) === deckFilter);
    if (levelFilter !== "") ds = ds.filter((entry) => String(entry.level ?? 0) === levelFilter);
    if (sourceFilter) ds = ds.filter((entry) => entry.source === sourceFilter);
    ds = ds.filter((entry) => matchReviewSearch(entry, search));

    return [...ds].sort((a, b) => new Date(a.nextReviewAt || 0) - new Date(b.nextReviewAt || 0));
  }, [allCards, filterMode, deckFilter, levelFilter, sourceFilter, search]);

  const entryMap = useMemo(
    () =>
      Object.fromEntries(
        filteredCards.map((card) => [
          card.id,
          { ...card, ...(entryOverrides[card.id] || {}) },
        ])
      ),
    [entryOverrides, filteredCards]
  );

  const visibleFilteredCards = useMemo(
    () => filteredCards.filter((card) => !removedIds.has(String(card.id))),
    [filteredCards, removedIds]
  );

  useLayoutEffect(() => {
    setQueue(
      filteredCards
        .filter((card) => !removedIdsRef.current.has(String(card.id)))
        .map((card) => card.id)
    );
    setDoneCount(0);
    setCorrectCount(0);
    setWrongCount(0);
    startedAtRef.current = new Date().toISOString();
    daLuuSessionRef.current = false;
  }, [filteredCards]);

  // Current card is the first in queue
  const currentId = queue[0];
  const currentEntry = currentId ? entryMap[currentId] : null;
  const isComplete = queue.length === 0 && doneCount > 0;
  const nothingDue = visibleFilteredCards.length === 0;

  // Global SRS stats (for header)
  const srsStats = useMemo(
    () => tinhThongKeSRS(allCards.filter((card) => !removedIds.has(String(card.id)))),
    [allCards, removedIds]
  );

  const handleRate = useCallback(
    async (id, ease) => {
      if (actionLockRef.current) return;

      actionLockRef.current = true;
      setIsLoading(true);
      try {
        const updatedEntry = await capNhatKetQuaOnDongBo(id, ease);
        if (updatedEntry) {
          setEntryOverrides((current) => ({
            ...current,
            [id]: updatedEntry,
          }));
        }
      } catch {
        // Silent — helper already keeps local SRS as fallback.
      }

      // 3. Update queue — remove current card, move "again" to end
      setQueue((prev) => {
        const rest = prev.filter((x) => x !== id);
        if (ease === "again") {
          return [...rest, id]; // retry later in session
        }
        return rest;
      });

      if (ease !== "again") {
        setDoneCount((n) => n + 1);
        setCorrectCount((n) => n + 1);
      } else {
        setWrongCount((n) => n + 1);
      }

      // 4. Toast
      const msgs = {
        again: "📌 Sẽ ôn lại ngay sau!",
        hard:  "💪 Ghi nhận! Ôn lại sau 1 ngày.",
        good:  "👍 Tốt! Ôn lại sau 3 ngày.",
        easy:  "🌟 Xuất sắc! Ôn lại sau 7 ngày.",
      };
      toast.success(msgs[ease] ?? "Đã lưu!");

      actionLockRef.current = false;
      setIsLoading(false);
    },
    [toast]
  );

  const handleRemove = useCallback(
    (id) => {
      if (actionLockRef.current) return;

      xoaKhoiSRSDongBo(id);
      removedIdsRef.current.add(String(id));
      setEntryOverrides((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setQueue((prev) => prev.filter((x) => x !== id));
      setRemovedIds((prev) => new Set([...prev, String(id)]));
      toast.info("Đã xoá khỏi hàng ôn.");
    },
    [toast]
  );

  // Effective done count (excluding removed)
  const effectiveDone = doneCount;
  const remaining = queue.filter((id) => !removedIds.has(id)).length;

  useEffect(() => {
    if (!isComplete || daLuuSessionRef.current) return;

    daLuuSessionRef.current = true;
    const endedAt = new Date().toISOString();
    luuStudySessionHoanThanh({
      deck_id: currentEntry?.deckId ?? filteredCards[0]?.deckId ?? null,
      mode: "review",
      direction: "en-vi",
      total: correctCount + wrongCount,
      correct: correctCount,
      review: wrongCount,
      xp_earned: correctCount * 5,
      started_at: startedAtRef.current,
      ended_at: endedAt,
      duration_seconds: Math.max(
        0,
        Math.round((new Date(endedAt) - new Date(startedAtRef.current)) / 1000)
      ),
    }).catch(() => {
      daLuuSessionRef.current = false;
    });
  }, [correctCount, currentEntry?.deckId, filteredCards, isComplete, wrongCount]);

  function handleClearFilters() {
    setFilterMode("due");
    setDeckFilter("");
    setLevelFilter("");
    setSourceFilter("");
    setSearch("");
  }

  return (
    <div className="review-page ui-content-enter">
      {/* Header */}
      <div className="review-header">
        <div>
          <h1 className="review-title">📅 Ôn tập hôm nay</h1>
          <p className="review-subtitle">
            {nothingDue
              ? "Không có từ nào phù hợp với bộ lọc hiện tại."
              : isComplete
              ? "Đã ôn xong tất cả từ hôm nay!"
              : `${visibleFilteredCards.length} từ trong hàng ôn · SRS queue: ${srsStats.total} từ`}
          </p>
        </div>
        <div className="review-header__actions">
          <Link to="/dashboard" className="review-nav-btn">
            Dashboard
          </Link>
          <Link to="/tu-sai" className="review-nav-btn">
            Sổ từ sai
          </Link>
        </div>
      </div>

      <ReviewFilters
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        deckFilter={deckFilter}
        setDeckFilter={setDeckFilter}
        levelFilter={levelFilter}
        setLevelFilter={setLevelFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        search={search}
        setSearch={setSearch}
        uniqueDecks={uniqueDecks}
        uniqueSources={uniqueSources}
        onClear={handleClearFilters}
      />

      {dangTai && <p className="review-sync-note">Đang đồng bộ lịch ôn...</p>}

      {/* Progress bar */}
      {!nothingDue && !isComplete && (
        <StatsBar
          total={visibleFilteredCards.length}
          done={effectiveDone}
          remaining={remaining}
        />
      )}

      {/* Content */}
      {nothingDue ? (
        <EmptyState
          type="study"
          title="Hôm nay chưa có từ cần ôn"
          message="Hoàn thành một bài Quiz hoặc Tự luận để bắt đầu xây dựng hàng ôn tập của bạn."
          actionLabel="Xem bộ từ"
          actionHref="/decks"
        />
      ) : isComplete ? (
        <CompletionScreen total={effectiveDone} />
      ) : currentEntry ? (
        <ReviewCard
          key={currentId}
          entry={currentEntry}
          onRate={handleRate}
          onRemove={handleRemove}
          isLoading={isLoading}
        />
      ) : null}

      {/* Queue list preview (collapsed) */}
      {!nothingDue && !isComplete && queue.length > 1 && (
        <div className="review-queue-preview">
          <p className="review-queue-preview__label">
            Tiếp theo: <strong>{queue.slice(1, 4).map((id) => entryMap[id]?.word).filter(Boolean).join(", ")}</strong>
            {queue.length > 4 ? ` và ${queue.length - 4} từ nữa…` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

export default TrangOnTapHomNay;
