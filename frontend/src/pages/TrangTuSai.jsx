import { useState, useCallback, useLayoutEffect, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EmptyState from "../components/common/EmptyState";
import { useToast } from "../contexts/ToastContext";
import {
  layTatCaTuSai,
  danhDauDaOnDongBo,
  xoaTuSaiDongBo,
  xoaTatCaTuSaiDongBo,
  taiTuSaiDongBo,
} from "../utils/mistakeNotebook";
import { usePageTransition } from "../contexts/PageTransitionContext";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatNgay(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function layNhanNguon(source) {
  if (source === "tuluan") return "Tự luận";
  if (source === "quiz") return "Quiz";
  return source ?? "—";
}

function tinhThongKeTuSai(ds) {
  const active = ds.filter((e) => e.status === "active").length;
  const reviewed = ds.filter((e) => e.status === "reviewed").length;
  const hardest = ds.reduce(
    (max, e) => ((e.mistakeCount ?? 0) > (max?.mistakeCount ?? 0) ? e : max),
    null
  );
  return { total: ds.length, active, reviewed, hardest };
}

function matchSearch(entry, search) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [entry.word, entry.meaning, entry.deckTitle]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

function sapXepTuSai(ds, sort) {
  const sorted = [...ds];
  if (sort === "most_mistakes") {
    return sorted.sort((a, b) => (b.mistakeCount ?? 0) - (a.mistakeCount ?? 0));
  }
  if (sort === "deck") {
    return sorted.sort((a, b) => String(a.deckTitle || "").localeCompare(String(b.deckTitle || ""), "vi"));
  }
  if (sort === "az") {
    return sorted.sort((a, b) => String(a.word || "").localeCompare(String(b.word || ""), "en"));
  }
  return sorted.sort((a, b) => new Date(b.lastWrongAt || 0) - new Date(a.lastWrongAt || 0));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatsBar({ stats }) {
  return (
    <div className="tu-sai-stats">
      <div className="tu-sai-stat">
        <span className="tu-sai-stat__val">{stats.total}</span>
        <span className="tu-sai-stat__lbl">Tổng từ sai</span>
      </div>
      <div className="tu-sai-stat tu-sai-stat--active">
        <span className="tu-sai-stat__val">{stats.active}</span>
        <span className="tu-sai-stat__lbl">Đang cần ôn</span>
      </div>
      <div className="tu-sai-stat tu-sai-stat--reviewed">
        <span className="tu-sai-stat__val">{stats.reviewed}</span>
        <span className="tu-sai-stat__lbl">Đã ôn xong</span>
      </div>
      {stats.hardest && (
        <div className="tu-sai-stat tu-sai-stat--hardest">
          <span className="tu-sai-stat__val" title={stats.hardest.word}>
            {stats.hardest.word.length > 12
              ? stats.hardest.word.slice(0, 12) + "…"
              : stats.hardest.word}
          </span>
          <span className="tu-sai-stat__lbl">Khó nhất ({stats.hardest.mistakeCount} lần)</span>
        </div>
      )}
    </div>
  );
}

function FilterBar({
  filter,
  setFilter,
  uniqueDecks,
  deckFilter,
  setDeckFilter,
  search,
  setSearch,
  sort,
  setSort,
  onClear,
}) {
  return (
    <div className="tu-sai-filter-bar">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="tu-sai-search-input"
        placeholder="Tìm từ, nghĩa, bộ từ"
        aria-label="Tìm từ sai"
      />

      <div className="tu-sai-filter-tabs" role="tablist" aria-label="Lọc trạng thái">
        {[
          { val: "all", label: "Tất cả" },
          { val: "active", label: "Cần ôn" },
          { val: "reviewed", label: "Đã ôn" },
        ].map(({ val, label }) => (
          <button
            key={val}
            role="tab"
            aria-selected={filter === val}
            type="button"
            onClick={() => setFilter(val)}
            className={`tu-sai-filter-tab ${filter === val ? "tu-sai-filter-tab--active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {uniqueDecks.length > 1 && (
        <select
          value={deckFilter}
          onChange={(e) => setDeckFilter(e.target.value)}
          className="tu-sai-deck-select"
          aria-label="Lọc theo bộ từ"
        >
          <option value="">Tất cả bộ từ</option>
          {uniqueDecks.map((d) => (
            <option key={d.deckId} value={String(d.deckId)}>
              {d.deckTitle || `Bộ ${d.deckId}`}
            </option>
          ))}
        </select>
      )}

      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        className="tu-sai-deck-select"
        aria-label="Sắp xếp từ sai"
      >
        <option value="last_wrong">Sai gần nhất</option>
        <option value="most_mistakes">Sai nhiều nhất</option>
        <option value="deck">Theo bộ từ</option>
        <option value="az">A-Z</option>
      </select>

      {(filter !== "all" || deckFilter || search || sort !== "last_wrong") && (
        <button type="button" onClick={onClear} className="tu-sai-btn tu-sai-btn--ghost">
          Xoá lọc
        </button>
      )}
    </div>
  );
}

function MistakeCard({ entry, onMarkReviewed, onRemove }) {
  const isReviewed = entry.status === "reviewed";

  return (
    <li className={`tu-sai-card ${isReviewed ? "tu-sai-card--reviewed" : ""}`}>
      <div className="tu-sai-card__top">
        <div className="tu-sai-card__words">
          <span className="tu-sai-card__term">{entry.word}</span>
          <span className="tu-sai-card__meaning">{entry.meaning}</span>
        </div>
        <div className="tu-sai-card__badges">
          {entry.mistakeCount > 1 && (
            <span className="tu-sai-badge tu-sai-badge--count" title="Số lần sai">
              ×{entry.mistakeCount}
            </span>
          )}
          <span className={`tu-sai-badge ${isReviewed ? "tu-sai-badge--ok" : "tu-sai-badge--warn"}`}>
            {isReviewed ? "Đã ôn" : "Cần ôn"}
          </span>
        </div>
      </div>

      {entry.example && (
        <p className="tu-sai-card__example">{entry.example}</p>
      )}

      <div className="tu-sai-card__meta">
        <span className="tu-sai-card__deck">{entry.deckTitle || `Bộ ${entry.deckId}`}</span>
        <span className="tu-sai-card__sep">·</span>
        <span className="tu-sai-card__source">{layNhanNguon(entry.source)}</span>
        <span className="tu-sai-card__sep">·</span>
        <span className="tu-sai-card__date">Sai lần cuối: {formatNgay(entry.lastWrongAt)}</span>
        {entry.lastReviewedAt && (
          <>
            <span className="tu-sai-card__sep">·</span>
            <span className="tu-sai-card__date">Ôn: {formatNgay(entry.lastReviewedAt)}</span>
          </>
        )}
      </div>

      <div className="tu-sai-card__actions">
        <button
          type="button"
          onClick={() => onMarkReviewed(entry.id)}
          className={`tu-sai-btn ${isReviewed ? "tu-sai-btn--ghost" : "tu-sai-btn--primary"}`}
        >
          {isReviewed ? "Ôn lại nữa?" : "✓ Đánh dấu đã ôn"}
        </button>
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="tu-sai-btn tu-sai-btn--danger"
          aria-label={`Xoá từ ${entry.word}`}
        >
          Xoá
        </button>
      </div>
    </li>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function TrangTuSai() {
  const toast = useToast();
  const { setPageDataLoading } = usePageTransition();
  const [searchParams] = useSearchParams();
  const initialDeck = searchParams.get("deckId") ?? "";

  const [allEntries, setAllEntries] = useState(() => layTatCaTuSai());
  const [dangTai, setDangTai] = useState(true);
  const [filter, setFilter] = useState("all");
  const [deckFilter, setDeckFilter] = useState(initialDeck);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("last_wrong");

  const refresh = useCallback(async () => {
    setDangTai(true);
    const ds = await taiTuSaiDongBo();
    setAllEntries(ds);
    setDangTai(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Báo cho PageTransitionContext biết trang đang tải
  useLayoutEffect(() => {
    setPageDataLoading("tu-sai", dangTai);
    return () => {
      setPageDataLoading("tu-sai", false);
    };
  }, [dangTai, setPageDataLoading]);

  const stats = useMemo(() => tinhThongKeTuSai(allEntries), [allEntries]);

  const uniqueDecks = useMemo(() => {
    const seen = new Map();
    for (const e of allEntries) {
      if (!seen.has(String(e.deckId))) {
        seen.set(String(e.deckId), { deckId: e.deckId, deckTitle: e.deckTitle });
      }
    }
    return [...seen.values()];
  }, [allEntries]);

  const filtered = useMemo(() => {
    let ds = allEntries;
    if (filter !== "all") ds = ds.filter((e) => e.status === filter);
    if (deckFilter) ds = ds.filter((e) => String(e.deckId) === deckFilter);
    ds = ds.filter((e) => matchSearch(e, search));
    return sapXepTuSai(ds, sort);
  }, [allEntries, filter, deckFilter, search, sort]);

  async function handleMarkReviewed(id) {
    await danhDauDaOnDongBo(id);
    setAllEntries(layTatCaTuSai());
    toast.success("Đã đánh dấu đã ôn!");
  }

  async function handleRemove(id) {
    await xoaTuSaiDongBo(id);
    setAllEntries(layTatCaTuSai());
    toast.info("Đã xoá từ khỏi sổ.");
  }

  async function handleClearAll() {
    if (!window.confirm("Xoá toàn bộ sổ từ sai? Hành động này không thể hoàn tác.")) return;
    await xoaTatCaTuSaiDongBo();
    setAllEntries([]);
    toast.warning("Đã xoá toàn bộ sổ từ sai.");
  }

  function handleClearFilters() {
    setFilter("all");
    setDeckFilter("");
    setSearch("");
    setSort("last_wrong");
  }

  return (
    <div className="ui-content-enter tu-sai-page">

      {/* Header */}
      <div className="tu-sai-header">
        <div>
          <h1 className="tu-sai-title">📓 Sổ từ sai</h1>
          <p className="tu-sai-subtitle">
            Những từ bạn đã trả lời sai trong Quiz và Tự luận — ôn lại để ghi nhớ tốt hơn.
          </p>
        </div>
        <div className="tu-sai-header__actions">
          <Link to="/decks" className="tu-sai-btn tu-sai-btn--ghost">
            ← Bộ từ
          </Link>
          <Link to="/dashboard" className="tu-sai-btn tu-sai-btn--ghost">
            Dashboard
          </Link>
        </div>
      </div>

      {/* Stats */}
      {allEntries.length > 0 && <StatsBar stats={stats} />}

      {/* Filter */}
      {allEntries.length > 0 && (
        <FilterBar
          filter={filter}
          setFilter={setFilter}
          uniqueDecks={uniqueDecks}
          deckFilter={deckFilter}
          setDeckFilter={setDeckFilter}
          search={search}
          setSearch={setSearch}
          sort={sort}
          setSort={setSort}
          onClear={handleClearFilters}
        />
      )}

      {dangTai && <p className="tu-sai-sync-note">Đang đồng bộ sổ từ sai...</p>}

      {/* Empty state */}
      {allEntries.length === 0 ? (
        <EmptyState
          type="study"
          title="Sổ từ sai trống"
          message="Chưa có từ nào được ghi nhận là sai. Hoàn thành một bài Quiz hoặc Tự luận để bắt đầu."
          actionLabel="Xem bộ từ"
          actionHref="/decks"
        />
      ) : filtered.length === 0 ? (
        <div className="tu-sai-empty-filter">
          <p>Không có từ nào phù hợp với bộ lọc này.</p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="tu-sai-btn tu-sai-btn--ghost"
          >
            Xoá bộ lọc
          </button>
        </div>
      ) : (
        <ul className="tu-sai-list">
          {filtered.map((entry) => (
            <MistakeCard
              key={entry.id}
              entry={entry}
              onMarkReviewed={handleMarkReviewed}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}

      {/* Danger zone */}
      {allEntries.length > 0 && (
        <div className="tu-sai-danger-zone">
          <button
            type="button"
            onClick={handleClearAll}
            className="tu-sai-btn tu-sai-btn--danger-outline"
          >
            Xoá toàn bộ sổ từ sai
          </button>
        </div>
      )}
    </div>
  );
}

export default TrangTuSai;
