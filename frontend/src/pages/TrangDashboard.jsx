import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { layDanhSachDeck } from "../services/deckApi";
import { getUserStats } from "../services/userApi";
import { layTienDoDeck } from "../utils/tienDoHocTap";
import { layThongKeTuSai } from "../utils/mistakeNotebook";
import { layThongKeSRS } from "../utils/srsReview";
import { layStudySessionSummary } from "../services/studySessionApi";
import EmptyState from "../components/common/EmptyState";
import DashBackground from "../components/DashBackground";
import DashIcon from "../components/DashIcon";

// ── Helpers ──────────────────────────────────────────────────────────────────

function chaoTheoGio() {
  const gio = new Date().getHours();
  if (gio < 12) return "Chào buổi sáng";
  if (gio < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function layDeckDeNghiTiepTuc(danhSach) {
  if (!danhSach || danhSach.length === 0) return null;

  const dsVoiHoatDong = danhSach
    .map((deck) => {
      const td = layTienDoDeck(deck.id);
      return { ...deck, lastActivityAt: td?.lastActivityAt ?? null };
    })
    .filter((d) => d.lastActivityAt !== null)
    .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));

  if (dsVoiHoatDong.length > 0) return dsVoiHoatDong[0];
  return danhSach[0];
}

function phanTramTienDo(deck) {
  const td = layTienDoDeck(deck.id);
  if (!td || !deck.total_words || deck.total_words === 0) return null;
  const daThuoc = td.flashcard?.remembered ?? td.quiz?.correct ?? 0;
  return Math.round((daThuoc / deck.total_words) * 100);
}

function formatNgayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatRow({ label, value, caption, accent, icon }) {
  return (
    <div className={`dash-stat-row${accent ? " dash-stat-row--accent" : ""}`}>
      {icon && <DashIcon name={icon} size={15} className="dash-stat-row__icon" />}
      <div className="dash-stat-row__main">
        <span className="dash-stat-row__label">{label}</span>
        {caption && <span className="dash-stat-row__caption">{caption}</span>}
      </div>
      <span className="dash-stat-row__value">{value ?? "—"}</span>
    </div>
  );
}

function QuickAction({ to, label, sub, accent, icon }) {
  return (
    <Link to={to} className={`dash-quick-action${accent ? " dash-quick-action--accent" : ""}`}>
      {icon && <DashIcon name={icon} size={16} className="dash-quick-action__icon" />}
      <span className="dash-quick-action__text">
        <span className="dash-quick-action__label">{label}</span>
        {sub && <span className="dash-quick-action__sub">{sub}</span>}
      </span>
      <span className="dash-quick-action__arrow" aria-hidden="true">→</span>
    </Link>
  );
}

function DeckMiniCard({ deck }) {
  const phanTram = phanTramTienDo(deck);
  return (
    <Link to={`/decks/${deck.id}`} className="dash-deck-mini">
      <div className="dash-deck-mini__top">
        <p className="dash-deck-mini__title">{deck.title}</p>
        {deck.total_words > 0 && (
          <span className="dash-deck-mini__count">{deck.total_words} từ</span>
        )}
      </div>
      <p className="dash-deck-mini__status">
        {phanTram !== null ? "Đang học" : "Chưa bắt đầu"}
      </p>
      {phanTram !== null && (
        <div className="dash-deck-mini__progress-bar-wrap" aria-label={`${phanTram}% hoàn thành`}>
          <div
            className="dash-deck-mini__progress-bar-fill"
            style={{ width: `${phanTram}%` }}
          />
        </div>
      )}
      <div className="dash-deck-mini__footer">
        <span className="dash-deck-mini__sub">
          {phanTram !== null ? `${phanTram}% hoàn thành` : "Bắt đầu học ngay"}
        </span>
        <span className="dash-deck-mini__cta">Học tiếp →</span>
      </div>
    </Link>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function TrangDashboard() {
  const { user } = useAuth();
  const [decks, setDecks] = useState(null);
  const [stats, setStats] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [loi, setLoi] = useState(false);

  const mistakeStats = useMemo(() => layThongKeTuSai(), []);
  const srsStats = useMemo(() => layThongKeSRS(), []);

  useEffect(() => {
    Promise.all([layDanhSachDeck(), getUserStats(), layStudySessionSummary()])
      .then(([ds, st, sessionData]) => {
        setDecks(ds);
        setStats(st);
        setSessionSummary(sessionData);
      })
      .catch(() => {
        setDecks([]);
        setLoi(true);
      });
  }, []);

  const dangTai = decks === null;
  const khongCoBo = !dangTai && decks.length === 0;
  const tongTu = decks ? decks.reduce((sum, d) => sum + (d.total_words ?? 0), 0) : 0;
  const deckDeNghi = decks ? layDeckDeNghiTiepTuc(decks) : null;
  const dsBo = decks ? decks.slice(0, 5) : [];
  const todayActivity = (sessionSummary?.last_7_days_activity ?? []).find(
    (item) => String(item.date).slice(0, 10) === formatNgayKey()
  );

  const ten = user?.fullname?.split(" ").pop() || "bạn";
  const chao = chaoTheoGio();
  const currentStreak = stats?.current_streak ?? 0;
  const longestStreak = stats?.longest_streak ?? 0;
  const todaySessions = todayActivity?.session_count ?? 0;

  return (
    <>
      <DashBackground />
      <div className="ui-content-enter ui-page-stack dash-page">

      {/* ── A. Hero ── */}
      <section className="dash-welcome" aria-label="Tổng quan học tập">
        <div className="dash-welcome__left">
          <h1 className="dash-welcome__greeting">
            {chao}, <span className="dash-welcome__name">{ten}</span>
          </h1>
          <p className="dash-welcome__sub">
            {currentStreak > 0
              ? "Sẵn sàng ôn lại một chút hôm nay chưa?"
              : "Bắt đầu ngày học mới của bạn."}
          </p>

          {/* Streak chips */}
          <div className="dash-welcome__chips" role="list">
            <span className="dash-welcome__chip" role="listitem">
              <DashIcon name="flame" size={13} />
              Streak {currentStreak} ngày
            </span>
            {longestStreak > 0 && (
              <span className="dash-welcome__chip dash-welcome__chip--muted" role="listitem">
                Dài nhất {longestStreak} ngày
              </span>
            )}
            {todaySessions > 0 && (
              <span className="dash-welcome__chip dash-welcome__chip--muted" role="listitem">
                <DashIcon name="review" size={13} />
                {todaySessions} phiên hôm nay
              </span>
            )}
          </div>

          {/* CTAs */}
          <div className="dash-welcome__actions">
            {deckDeNghi ? (
              <Link
                to={`/decks/${deckDeNghi.id}`}
                className="ui-button ui-button--primary dash-cta-primary"
              >
                Tiếp tục học
              </Link>
            ) : (
              <Link
                to="/dashboard"
                className="ui-button ui-button--primary dash-cta-primary"
              >
                Xem bộ từ
              </Link>
            )}
            <Link
              to="/dashboard"
              className="ui-button ui-button--ghost dash-cta-secondary"
            >
              Xem bộ từ
            </Link>
          </div>
        </div>

        {/* Today focus panel */}
        <div className="dash-welcome__right" aria-label="Ôn tập hôm nay">
          <p className="dash-welcome__focus-label">Hôm nay nên ôn</p>
          <p className="dash-welcome__focus-value">
            {srsStats.duHomNay > 0 ? `${srsStats.duHomNay} từ` : "Không có"}
          </p>
          <p className="dash-welcome__focus-status">
            {srsStats.duHomNay > 0 ? "Cần ôn hôm nay" : "Bạn đang ổn"}
          </p>
          {srsStats.duHomNay > 0 && (
            <Link to="/review" className="dash-welcome__focus-cta">
              Ôn ngay →
            </Link>
          )}
        </div>
      </section>

      {/* ── Body grid ── */}
      <div className="dash-body-grid">

        {/* ── Left column ── */}
        <div className="dash-body-main">

          {/* ── B. Continue learning ── */}
          {!khongCoBo && (
            <section className="dash-section">
              <h2 className="dash-section__title">Tiếp tục học</h2>
              {dangTai ? (
                <div className="dash-continue-card dash-continue-card--loading">
                  <div className="skeleton-shimmer" style={{ height: "0.75rem", width: "35%", marginBottom: "0.625rem" }} />
                  <div className="skeleton-shimmer" style={{ height: "1.5rem", width: "60%", marginBottom: "0.5rem" }} />
                  <div className="skeleton-shimmer" style={{ height: "0.85rem", width: "80%", marginBottom: "1.25rem" }} />
                  <div className="skeleton-shimmer" style={{ height: "2.5rem", width: "9rem", borderRadius: "0.5rem" }} />
                </div>
              ) : deckDeNghi ? (
                <div className="dash-continue-card">
                  <p className="dash-continue-card__eyebrow">Bài học tiếp theo</p>
                  <div className="dash-continue-card__meta">
                    <p className="dash-continue-card__name">{deckDeNghi.title}</p>
                    {deckDeNghi.total_words > 0 && (
                      <span className="dash-continue-card__count">
                        {deckDeNghi.total_words} từ
                      </span>
                    )}
                  </div>
                  <p className="dash-continue-card__desc">
                    {deckDeNghi.description || "Bắt đầu với Flashcard hoặc kiểm tra nhanh bằng Quiz."}
                  </p>
                  {(() => {
                    const pct = phanTramTienDo(deckDeNghi);
                    return pct !== null ? (
                      <div className="dash-continue-card__progress">
                        <div className="dash-continue-card__progress-bar">
                          <div
                            className="dash-continue-card__progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="dash-continue-card__progress-label">{pct}%</span>
                      </div>
                    ) : null;
                  })()}
                  <div className="dash-continue-card__actions">
                    <Link
                      to={`/decks/${deckDeNghi.id}/flashcard`}
                      className="ui-button ui-button--primary"
                    >
                      Học Flashcard
                    </Link>
                    <Link
                      to={`/decks/${deckDeNghi.id}/quiz`}
                      className="ui-button ui-button--ghost"
                    >
                      Làm Quiz
                    </Link>
                  </div>
                  <Link
                    to={`/decks/${deckDeNghi.id}`}
                    className="dash-continue-card__detail-link"
                  >
                    Xem chi tiết bộ từ
                  </Link>
                </div>
              ) : null}
            </section>
          )}

          {/* ── C. Deck list ── */}
          <section className="dash-section">
            <div className="dash-section__header">
              <h2 className="dash-section__title">Bộ từ của bạn</h2>
            </div>

            {dangTai ? (
              <div className="dash-deck-grid">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="dash-deck-mini dash-deck-mini--loading">
                    <div className="skeleton-shimmer" style={{ height: "1rem", width: "70%", marginBottom: "0.4rem" }} />
                    <div className="skeleton-shimmer" style={{ height: "0.7rem", width: "35%", marginBottom: "0.75rem" }} />
                    <div className="skeleton-shimmer" style={{ height: "0.25rem", width: "100%", borderRadius: "999px" }} />
                  </div>
                ))}
              </div>
            ) : khongCoBo ? (
              <EmptyState
                type="deck"
                title="Chưa có bộ từ nào"
                message="Tạo bộ từ đầu tiên để bắt đầu học."
                actionLabel="Tạo bộ từ"
                actionHref="/dashboard"
              />
            ) : (
              <div className="dash-deck-grid">
                {dsBo.map((deck) => (
                  <DeckMiniCard key={deck.id} deck={deck} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Right column (sidebar) ── */}
        <div className="dash-body-side">

          {/* ── D. Overview panel ── */}
          <section className="dash-section">
            <div className="dash-overview-card">
              <p className="dash-overview-card__title">Tổng quan học tập</p>
              {dangTai ? (
                <div className="dash-overview-card__body">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="dash-stat-row dash-stat-row--loading">
                      <div className="skeleton-shimmer" style={{ width: "3rem", height: "1.125rem" }} />
                      <div className="skeleton-shimmer" style={{ width: "5rem", height: "0.7rem" }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-overview-card__body">
                  <StatRow icon="decks" label="Bộ từ" value={decks.length} caption="Đang học" />
                  <StatRow icon="vocab" label="Tổng từ" value={tongTu} caption="Trong thư viện" />
                  <StatRow
                    icon="flame"
                    label="Streak"
                    value={`${currentStreak} ngày`}
                    caption={longestStreak > 0 ? `Dài nhất ${longestStreak} ngày` : "Bắt đầu chuỗi mới"}
                    accent={currentStreak > 0}
                  />
                  <StatRow icon="star" label="XP" value={stats?.total_xp ?? 0} caption="Tổng tích lũy" />
                  <StatRow
                    icon="review"
                    label="Ôn tập"
                    value={`${srsStats.duHomNay} từ`}
                    caption={srsStats.duHomNay > 0 ? "Cần ôn hôm nay" : "Hôm nay bạn đang ổn"}
                    accent={srsStats.duHomNay > 0}
                  />
                  <StatRow
                    icon="mastered"
                    label="Thành thạo"
                    value={`${srsStats.mastered} từ`}
                    caption={srsStats.mastered > 0 ? "Đã mastered" : "Tiếp tục học để mở khóa"}
                  />
                </div>
              )}
            </div>
          </section>

          {/* ── E. Quick actions ── */}
          <section className="dash-section">
            <h2 className="dash-section__title">Truy cập nhanh</h2>
            {srsStats.duHomNay > 0 && (
              <Link to="/review" className="dash-review-cta" id="dash-review-cta">
                <span className="dash-review-cta__body">
                  <strong>{srsStats.duHomNay} từ cần ôn hôm nay</strong>
                  <span>Bắt đầu ôn tập ngay</span>
                </span>
                <span className="dash-review-cta__arrow" aria-hidden="true">→</span>
              </Link>
            )}
            <div className="dash-quick-grid">
              <QuickAction icon="decks" to="/dashboard" label="Quản lý bộ từ" sub="Xem và chỉnh sửa các bộ từ" />
              <QuickAction
                icon="notebook"
                to="/tu-sai"
                label={mistakeStats.active > 0 ? `Sổ từ sai (${mistakeStats.active})` : "Sổ từ sai"}
                sub="Xem lại những từ bạn hay nhầm"
              />
              <QuickAction
                icon="review"
                to="/review"
                label={srsStats.duHomNay > 0 ? `Ôn tập (${srsStats.duHomNay})` : "Ôn tập hôm nay"}
                sub="Luyện các từ đang đến hạn"
                accent={srsStats.duHomNay > 0}
              />
              <QuickAction icon="stats" to="/stats" label="Thống kê" sub="Xem tiến độ học tập" />
            </div>
          </section>

        </div>
      </div>

      {loi && (
        <p className="dash-error-note">
          Không tải được dữ liệu. Vui lòng làm mới trang.
        </p>
      )}
      </div>
    </>
  );
}

export default TrangDashboard;
