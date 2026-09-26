/**
 * TrangOnTapHomNay — Daily Review page (SRS).
 *
 * Hiển thị các từ đến hạn ôn (kể cả Lv5) từ SRS queue.
 * Mỗi level ôn bằng một chế độ tự chọn (Thẻ / Trắc nghiệm / Gõ từ), giống luyentu.
 * Thẻ: lật rồi chọn Quên / Thuộc hoặc tự chọn level Lv0–Lv5. Trắc nghiệm, Gõ từ: chấm đúng/sai.
 * 1. Cập nhật SRS local + backend PATCH /reviews/by-card/:cardId/result
 * 2. Từ "Quên" hoặc về Lv0 được đưa xuống cuối hàng để ôn lại trong phiên
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
import { ChatbotTheDangHoc } from "../contexts/ChatbotContext";
import EmptyState from "../components/common/EmptyState";
import DanhSachDapAn, { PhanHoiSaiTracNghiem } from "../components/common/DanhSachDapAn";
import "./TrangOnTapHomNay.css";
import {
  layTatCaSRS,
  capNhatKetQuaOnDongBo,
  moTaKhoangOn,
  xoaKhoiSRSDongBo,
  taiSRSDongBo,
} from "../utils/srsReview";
import { luuStudySessionHoanThanh } from "../services/studySessionApi";
import {
  CHE_DO_THEO_LEVEL_MAC_DINH,
  docCaiDatHocTap,
  luuCaiDatHocTap,
} from "../utils/caiDatHocTap";
import { taoDanhSachCauHoi } from "../utils/cauHoiTracNghiem";
import { chuanHoaDapAn, taoGoiY } from "../utils/phienHoc";

// ── Helpers ───────────────────────────────────────────────────────────────────

function levelLabel(level) {
  if (level >= 5) return { text: "Thành thạo", cls: "review-badge--mastered" };
  if (level >= 3) return { text: "Khá", cls: "review-badge--good" };
  if (level >= 1) return { text: "Cơ bản", cls: "review-badge--ok" };
  return { text: "Mới", cls: "review-badge--new" };
}

const CAC_LEVEL = [0, 1, 2, 3, 4, 5];

const LUA_CHON_CHE_DO_ON = [
  { giaTri: "the", nhan: "Thẻ" },
  { giaTri: "chon", nhan: "Trắc nghiệm" },
  { giaTri: "go", nhan: "Gõ từ" },
];

// Từ Lv3 trở lên: không có gợi ý khi gõ (giống luyentu)
const LEVEL_TAT_GOI_Y = 3;

// Từ phải ôn lại ngay trong phiên: trả lời "Quên" hoặc tự chọn Lv0.
function laOnLaiNgay(ketQua) {
  return ketQua === "wrong" || ketQua === 0;
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
  const duHomNay = ds.filter(laDenHan).length;
  const mastered = ds.filter((entry) => entry.status === "mastered").length;
  return {
    total: ds.length,
    duHomNay,
    active: activeItems.length,
    mastered,
    khoHoc: ds.length - duHomNay,
  };
}

function ReviewFilters({
  filterMode,
  setFilterMode,
  deckFilter,
  setDeckFilter,
  levelFilter,
  setLevelFilter,
  search,
  setSearch,
  uniqueDecks,
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

      {(filterMode !== "due" || deckFilter || levelFilter || search) && (
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

// ── Chế độ ôn theo level ──────────────────────────────────────────────────────

function CheDoTheoLevel({ giaTri, onDoi, onMacDinh }) {
  return (
    <details className="review-level-settings">
      <summary className="review-level-settings__summary">Chế độ ôn theo level</summary>
      <div className="review-level-settings__body">
        {CAC_LEVEL.map((level) => (
          <div key={level} className="review-level-settings__row">
            <span className="review-level-settings__label">Lv{level}</span>
            <div className="ui-chip-row" role="group" aria-label={`Chế độ ôn cho Lv${level}`}>
              {LUA_CHON_CHE_DO_ON.map((muc) => {
                const dangChon = giaTri[level] === muc.giaTri;
                return (
                  <button
                    key={muc.giaTri}
                    type="button"
                    onClick={() => onDoi(level, muc.giaTri)}
                    aria-pressed={dangChon}
                    className={`ui-chip ui-chip--interactive${dangChon ? " ui-chip--primary" : ""}`}
                  >
                    {muc.nhan}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="review-level-settings__note">
          Từ Lv{LEVEL_TAT_GOI_Y} trở lên không có gợi ý khi gõ. Trắc nghiệm cần ít nhất 4 từ trong hàng ôn,
          nếu không sẽ dùng Thẻ.
        </p>
        <button type="button" onClick={onMacDinh} className="review-nav-btn">
          Khôi phục mặc định
        </button>
      </div>
    </details>
  );
}

// ── Thẻ ôn tập ────────────────────────────────────────────────────────────────

function ReviewCardHeader({ entry, onRemove, isLoading }) {
  const badge = levelLabel(entry.level ?? 0);

  return (
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
  );
}

// Enter để sang từ tiếp theo sau khi đã trả lời
function useEnterDeTiepTuc(daTraLoi, onTiepTuc) {
  useEffect(() => {
    if (!daTraLoi) return undefined;

    function xuLy(event) {
      if (event.key === "Enter" && !event.repeat) {
        event.preventDefault();
        onTiepTuc();
      }
    }

    window.addEventListener("keydown", xuLy);
    return () => window.removeEventListener("keydown", xuLy);
  }, [daTraLoi, onTiepTuc]);
}

function KetQuaDungOnTap({ entry, onTiepTuc }) {
  return (
    <div className="review-card__result ui-feedback-pop">
      <span className="ui-dau-cham ui-dau-cham--dung">Chính xác!</span>
      {entry.example && <p className="review-card__example">{entry.example}</p>}
      <button
        type="button"
        onClick={onTiepTuc}
        className="ui-button ui-button--primary px-5 py-2 text-xs font-bold rounded-xl shadow-sm"
      >
        Tiếp tục (Enter ↵)
      </button>
    </div>
  );
}

function ReviewTracNghiem({ entry, dapAnLuaChon, onRate, onRemove, isLoading }) {
  const [daChon, setDaChon] = useState(null);
  const dung = daChon === entry.meaning;

  function tiepTuc() {
    if (daChon === null || isLoading) return;
    onRate(entry.id, dung ? "correct" : "wrong");
  }

  useEnterDeTiepTuc(daChon !== null, tiepTuc);

  return (
    <div className="review-card ui-content-enter">
      <ReviewCardHeader entry={entry} onRemove={onRemove} isLoading={isLoading} />
      <div className="review-card__word-section">
        <p className="review-card__term" lang="en">{entry.word}</p>
        <p className="review-card__prompt">Chọn nghĩa đúng</p>
      </div>
      <div className="review-card__body">
        <DanhSachDapAn
          khoa={entry.id}
          danhSachDapAn={dapAnLuaChon}
          dapAnDung={entry.meaning}
          dapAnDaChon={daChon}
          onChon={setDaChon}
        />
        {daChon !== null &&
          (dung ? (
            <KetQuaDungOnTap entry={entry} onTiepTuc={tiepTuc} />
          ) : (
            <PhanHoiSaiTracNghiem dapAnDung={entry.meaning} onTiepTuc={tiepTuc} />
          ))}
      </div>
    </div>
  );
}

function ReviewGoTu({ entry, choGoiY, onRate, onRemove, isLoading }) {
  const [nhap, setNhap] = useState("");
  const [ketQua, setKetQua] = useState(null); // null | "dung" | "sai"
  const [hienGoiY, setHienGoiY] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function tiepTuc() {
    if (!ketQua || isLoading) return;
    onRate(entry.id, ketQua === "dung" ? "correct" : "wrong");
  }

  // Enter trong ô gõ: lần đầu kiểm tra, lần sau sang từ tiếp theo
  function kiemTra(event) {
    event.preventDefault();
    if (ketQua) {
      tiepTuc();
      return;
    }
    if (!nhap.trim()) {
      inputRef.current?.focus();
      return;
    }
    setKetQua(chuanHoaDapAn(nhap) === chuanHoaDapAn(entry.word) ? "dung" : "sai");
  }

  return (
    <div className="review-card ui-content-enter">
      <ReviewCardHeader entry={entry} onRemove={onRemove} isLoading={isLoading} />
      <div className="review-card__word-section">
        <p className="review-card__term">{entry.meaning}</p>
        <p className="review-card__prompt">Gõ từ tiếng Anh</p>
        {hienGoiY && !ketQua && (
          <p className="review-card__hint" lang="en">{taoGoiY(entry.word)}</p>
        )}
      </div>
      <form className="review-card__body" onSubmit={kiemTra}>
        <input
          ref={inputRef}
          type="text"
          value={nhap}
          onChange={(event) => setNhap(event.target.value)}
          readOnly={Boolean(ketQua)}
          placeholder="Gõ từ tiếng Anh..."
          aria-label="Từ tiếng Anh"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          lang="en"
          className={`review-input${ketQua === "dung" ? " review-input--dung" : ketQua === "sai" ? " review-input--sai" : ""}`}
        />
        {!ketQua ? (
          <div className="review-card__actions">
            {choGoiY && (
              <button
                type="button"
                onClick={() => {
                  setHienGoiY(true);
                  inputRef.current?.focus();
                }}
                disabled={hienGoiY}
                className="review-nav-btn"
              >
                Gợi ý
              </button>
            )}
            <button type="submit" className="ui-button ui-button--primary review-card__submit">
              Kiểm tra
            </button>
          </div>
        ) : ketQua === "dung" ? (
          <KetQuaDungOnTap entry={entry} onTiepTuc={tiepTuc} />
        ) : (
          <PhanHoiSaiTracNghiem dapAnDung={entry.word} onTiepTuc={tiepTuc} />
        )}
      </form>
    </div>
  );
}

function ReviewCard({ entry, onRate, onRemove, isLoading }) {
  const [revealed, setRevealed] = useState(false);

  function handleReveal() {
    setRevealed(true);
  }

  function handleRate(ketQua) {
    if (!revealed || isLoading) return;
    onRate(entry.id, ketQua);
    setRevealed(false); // reset for next card (same component reused)
  }

  const level = entry.level ?? 0;
  const levelKhiThuoc = Math.min(5, level + 1);

  return (
    <div className="review-card ui-content-enter">
      <ReviewCardHeader entry={entry} onRemove={onRemove} isLoading={isLoading} />

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
          <p className="review-card__rating-label">Bạn nhớ từ này không?</p>
          <div className="review-card__rating-row">
            <button
              type="button"
              onClick={() => handleRate("wrong")}
              disabled={isLoading}
              className="review-btn review-btn--again"
              id="btn-rate-wrong"
            >
              <span className="review-btn__label">Quên</span>
              <span className="review-btn__sub">Lv{Math.max(0, level - 1)} · Ôn ngay</span>
            </button>
            <button
              type="button"
              onClick={() => handleRate("correct")}
              disabled={isLoading}
              className="review-btn review-btn--easy"
              id="btn-rate-correct"
            >
              <span className="review-btn__label">Thuộc</span>
              <span className="review-btn__sub">
                Lv{levelKhiThuoc} · {moTaKhoangOn(levelKhiThuoc)}
              </span>
            </button>
          </div>

          <p className="review-card__rating-label review-card__rating-label--level">
            Hoặc tự chọn level
          </p>
          <div className="review-card__level-row">
            {CAC_LEVEL.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => handleRate(lv)}
                disabled={isLoading}
                className={`review-btn review-btn--level ${lv === level ? "review-btn--current" : ""}`}
                id={`btn-rate-level-${lv}`}
              >
                <span className="review-btn__label">Lv{lv}</span>
                <span className="review-btn__sub">{moTaKhoangOn(lv)}</span>
              </button>
            ))}
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
  const { setPageDataLoading, navigateWithLoading } = usePageTransition();

  const [allCards, setAllCards] = useState(() => layTatCaSRS());
  // The remote queue always syncs on mount. Starting at true lets the global
  // route overlay hand off to page loading without a blank frame in between.
  const [dangTai, setDangTai] = useState(true);
  const [filterMode, setFilterMode] = useState("due");
  const [deckFilter, setDeckFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [search, setSearch] = useState("");
  const [queue, setQueue] = useState([]);
  const [doneCount, setDoneCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [removedIds, setRemovedIds] = useState(new Set());
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [cheDoTheoLevel, setCheDoTheoLevel] = useState(
    () => docCaiDatHocTap("onTap").cheDoTheoLevel ?? CHE_DO_THEO_LEVEL_MAC_DINH
  );
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

  const filteredCards = useMemo(() => {
    let ds = allCards;

    if (filterMode === "due") {
      ds = ds.filter(laDenHan);
    } else if (filterMode === "active") {
      ds = ds.filter((entry) => entry.status === "active");
    }

    if (deckFilter) ds = ds.filter((entry) => String(entry.deckId) === deckFilter);
    if (levelFilter !== "") ds = ds.filter((entry) => String(entry.level ?? 0) === levelFilter);
    ds = ds.filter((entry) => matchReviewSearch(entry, search));

    return [...ds].sort((a, b) => new Date(a.nextReviewAt || 0) - new Date(b.nextReviewAt || 0));
  }, [allCards, filterMode, deckFilter, levelFilter, search]);

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

  // Chế độ ôn của từ hiện tại theo level; trắc nghiệm cần ít nhất 4 từ để có đáp án nhiễu
  const poolTracNghiem = useMemo(
    () => allCards.map((entry) => ({ id: entry.id, term_en: entry.word, meaning_vi: entry.meaning })),
    [allCards]
  );
  const levelHienTai = Math.min(5, Math.max(0, currentEntry?.level ?? 0));
  const cheDoTheoCaiDat = cheDoTheoLevel[levelHienTai] ?? "the";
  const cheDoHienTai =
    cheDoTheoCaiDat === "chon" && poolTracNghiem.length < 4 ? "the" : cheDoTheoCaiDat;
  // Số lượt đã trả lời: đổi key mỗi lượt để thẻ hỏi lại cùng từ luôn bắt đầu mới
  const soLuot = correctCount + wrongCount;
  const dapAnLuaChon = useMemo(() => {
    if (!currentEntry || cheDoHienTai !== "chon") return [];
    const [cauHoi] = taoDanhSachCauHoi(
      [{ id: currentEntry.id, term_en: currentEntry.word, meaning_vi: currentEntry.meaning }],
      "en-vi",
      `on-tap-${currentEntry.id}-${soLuot}`,
      poolTracNghiem
    );
    return cauHoi?.danhSachDapAn ?? [];
  }, [cheDoHienTai, currentEntry, poolTracNghiem, soLuot]);

  function doiCheDoLevel(level, cheDo) {
    const moi = cheDoTheoLevel.map((giaTri, index) => (index === level ? cheDo : giaTri));
    setCheDoTheoLevel(moi);
    luuCaiDatHocTap("onTap", { cheDoTheoLevel: moi });
  }

  function macDinhCheDoLevel() {
    setCheDoTheoLevel(CHE_DO_THEO_LEVEL_MAC_DINH);
    luuCaiDatHocTap("onTap", { cheDoTheoLevel: CHE_DO_THEO_LEVEL_MAC_DINH });
  }

  const handleRate = useCallback(
    async (id, ketQua) => {
      if (actionLockRef.current) return;

      actionLockRef.current = true;
      setIsLoading(true);
      let updatedEntry = null;
      try {
        updatedEntry = await capNhatKetQuaOnDongBo(id, ketQua);
        if (updatedEntry) {
          setEntryOverrides((current) => ({
            ...current,
            [id]: updatedEntry,
          }));
        }
      } catch {
        // Silent — helper already keeps local SRS as fallback.
      }

      // 3. Update queue — remove current card, move "Quên"/Lv0 to end
      const onLaiNgay = laOnLaiNgay(ketQua);
      setQueue((prev) => {
        const rest = prev.filter((x) => x !== id);
        if (onLaiNgay) {
          return [...rest, id]; // retry later in session
        }
        return rest;
      });

      if (!onLaiNgay) {
        setDoneCount((n) => n + 1);
        setCorrectCount((n) => n + 1);
      } else {
        setWrongCount((n) => n + 1);
      }

      // 4. Toast
      if (onLaiNgay) {
        toast.success("📌 Sẽ ôn lại ngay sau!");
      } else if (updatedEntry) {
        toast.success(`Lv${updatedEntry.level} · ôn lại sau ${moTaKhoangOn(updatedEntry.level)}.`);
      } else {
        toast.success("Đã lưu!");
      }

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
    setSearch("");
  }

  return (
    <div className="review-page ui-content-enter">
      <ChatbotTheDangHoc the={currentEntry} />
      {/* Header */}
      <div className="review-header">
        <div>
          <h1 className="review-title">Ôn tập hôm nay</h1>
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
        search={search}
        setSearch={setSearch}
        uniqueDecks={uniqueDecks}
        onClear={handleClearFilters}
      />

      <CheDoTheoLevel
        giaTri={cheDoTheoLevel}
        onDoi={doiCheDoLevel}
        onMacDinh={macDinhCheDoLevel}
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
          icon="search"
          title="Hôm nay chưa có từ cần ôn"
          description="Hoàn thành một bài Quiz hoặc Tự luận để bắt đầu xây dựng hàng ôn tập của bạn."
          action="Xem bộ từ"
          onAction={() => navigateWithLoading("/decks")}
        />
      ) : isComplete ? (
        <CompletionScreen total={effectiveDone} />
      ) : currentEntry ? (
        cheDoHienTai === "chon" ? (
          <ReviewTracNghiem
            key={`${currentId}-${soLuot}`}
            entry={currentEntry}
            dapAnLuaChon={dapAnLuaChon}
            onRate={handleRate}
            onRemove={handleRemove}
            isLoading={isLoading}
          />
        ) : cheDoHienTai === "go" ? (
          <ReviewGoTu
            key={`${currentId}-${soLuot}`}
            entry={currentEntry}
            choGoiY={levelHienTai < LEVEL_TAT_GOI_Y}
            onRate={handleRate}
            onRemove={handleRemove}
            isLoading={isLoading}
          />
        ) : (
          <ReviewCard
            key={`${currentId}-${soLuot}`}
            entry={currentEntry}
            onRate={handleRate}
            onRemove={handleRemove}
            isLoading={isLoading}
          />
        )
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
