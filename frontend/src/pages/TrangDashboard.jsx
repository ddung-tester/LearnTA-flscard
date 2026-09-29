import { useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { layDanhSachDeck } from "../services/deckApi";
import { getUserStats } from "../services/userApi";
import { layTienDoDeck } from "../utils/tienDoHocTap";
import { layThongKeTuSai, taiTuSaiDongBo } from "../utils/mistakeNotebook";
import { layThongKeSRS, taiSRSDongBo } from "../utils/srsReview";
import { layStudySessionSummary } from "../services/studySessionApi";
import { layDanhSachKhoaHoc } from "../services/courseApi";
import { tienDoBuoiHoc, timBuoiTiepTheo, tongHopKhoaHoc, tongSoBuoiKhoaHoc } from "../utils/baiTapKhoaHoc";
import EmptyState from "../components/common/EmptyState";
import DashIcon from "../components/DashIcon";
import { usePageTransition } from "../contexts/PageTransitionContext";

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
  return Math.min(100, Math.max(0, Math.round((daThuoc / deck.total_words) * 100)));
}

function formatNgayKey(date = new Date()) {
  const vietnamTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vietnamTime.toISOString().slice(0, 10);
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

function BuocBuoi({ ten, xong = false, chiTiet }) {
  return (
    <li className={`dash-buoc__muc${xong ? " dash-buoc__muc--xong" : ""}`}>
      <span className="dash-buoc__dau" aria-hidden="true">{xong ? "✓" : ""}</span>
      <span className="dash-buoc__ten">{ten}</span>
      <span className="dash-buoc__chi-tiet">
        {chiTiet}
        {xong && <span className="sr-only"> (xong)</span>}
      </span>
    </li>
  );
}

function TheViec({ to, so, donVi, nhan }) {
  return (
    <Link to={to} className={`dash-viec__the${so > 0 ? " dash-viec__the--co" : ""}`}>
      <span className="dash-viec__so">{so > 0 ? `${so} ${donVi}` : "Không có"}</span>
      <span className="dash-viec__nhan">{nhan}</span>
    </Link>
  );
}

/** Tối đa 4 buổi có nội dung quanh buổi đang học: 1 buổi trước, buổi đang học và các buổi sau */
function buoiGanDay(lessons, buoiTiep) {
  const theoSo = [...lessons].sort((a, b) => a.lesson_number - b.lesson_number);
  const viTri = Math.max(0, theoSo.indexOf(buoiTiep));
  const batDau = Math.max(0, Math.min(viTri - 1, theoSo.length - 4));
  return theoSo.slice(batDau, batDau + 4);
}

function DeckMiniCard({ deck }) {
  const phanTram = phanTramTienDo(deck);
  return (
    <Link to={`/decks/${deck.id}`} className="dash-deck-mini" data-mo-rong>
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
  const { setPageDataLoading, navigateWithLoading } = usePageTransition();
  const [decks, setDecks] = useState(null);
  const [stats, setStats] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [loi, setLoi] = useState(false);

  const [mistakeStats, setMistakeStats] = useState(() => layThongKeTuSai());
  const [srsStats, setSrsStats] = useState(() => layThongKeSRS());
  // Khoá học riêng: tải riêng, không chặn phần còn lại của dashboard
  const [khoaHoc, setKhoaHoc] = useState([]);

  useEffect(() => {
    let active = true;
    layDanhSachKhoaHoc()
      .then((ds) => {
        if (active) setKhoaHoc(ds);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([
      layDanhSachDeck(),
      getUserStats(),
      layStudySessionSummary(),
      taiTuSaiDongBo({ limit: 200 }),
      taiSRSDongBo({ limit: 200 }),
    ])
      .then(([ds, st, sessionData]) => {
        if (!active) return;
        setDecks(ds);
        setStats(st);
        setSessionSummary(sessionData);
        setMistakeStats(layThongKeTuSai());
        setSrsStats(layThongKeSRS());
      })
      .catch(() => {
        if (!active) return;
        setDecks([]);
        setLoi(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const dangTai = decks === null;

  // Báo cho PageTransitionContext biết trang đang tải dữ liệu
  // để overlay không tắt sớm trước khi data về
  useLayoutEffect(() => {
    setPageDataLoading("dashboard", dangTai);
    return () => {
      setPageDataLoading("dashboard", false);
    };
  }, [dangTai, setPageDataLoading]);

  const khongCoBo = !dangTai && decks.length === 0;
  const tongTu = decks ? decks.reduce((sum, d) => sum + (d.total_words ?? 0), 0) : 0;
  const deckDeNghi = decks ? layDeckDeNghiTiepTuc(decks) : null;
  const dsBo = decks ? decks.slice(0, 5) : [];
  const soCauCanOn = khoaHoc.reduce((tong, khoa) => tong + tongHopKhoaHoc(khoa).cauCanOn, 0);
  const todayActivity = (sessionSummary?.last_7_days_activity ?? []).find(
    (item) => String(item.date).slice(0, 10) === formatNgayKey()
  );

  const ten = user?.fullname?.split(" ").pop() || "bạn";
  const chao = chaoTheoGio();
  const currentStreak = stats?.current_streak ?? 0;
  const longestStreak = stats?.longest_streak ?? 0;
  const todaySessions = todayActivity?.session_count ?? 0;

  // Khoá học là trục chính: buổi cần học tiếp của khoá đầu tiên
  const khoaChinh = khoaHoc[0] ?? null;
  const buoiTiep = khoaChinh ? timBuoiTiepTheo(khoaChinh.lessons) : null;
  const tienDoBuoi = buoiTiep ? tienDoBuoiHoc(buoiTiep) : null;
  const tongBuoi = khoaChinh
    ? tongSoBuoiKhoaHoc(khoaChinh.title, Math.max(0, ...khoaChinh.lessons.map((bai) => bai.lesson_number)))
    : 0;
  const soBuoiXong = khoaChinh ? khoaChinh.lessons.filter((bai) => tienDoBuoiHoc(bai).xong).length : 0;
  // Vào đúng bước còn dở: chưa học hết từ thì Từ vựng, rồi mới tới Bài tập
  const buocTiep = tienDoBuoi && tienDoBuoi.tuDaHoc < tienDoBuoi.tongTu ? "tu-vung" : "bai-tap";

  return (
    <>
      <div className="ui-content-enter ui-page-stack dash-page">

      {/* ── A. Hôm nay: buổi học tiếp theo của khoá ── */}
      {khoaChinh ? (
        <section className="dash-hom-nay" aria-labelledby="dash-buoi-tiep">
          <div className="dash-hom-nay__chinh">
            <p className="dash-hom-nay__eyebrow">
              {chao}, {ten} · {khoaChinh.title}
              {currentStreak > 0 && (
                <span className="dash-hom-nay__streak">
                  <DashIcon name="flame" size={13} /> {currentStreak} ngày
                </span>
              )}
            </p>
            {buoiTiep ? (
              <>
                <h1 id="dash-buoi-tiep" className="dash-hom-nay__tieu-de">
                  <span className="dash-hom-nay__so-buoi">Buổi {buoiTiep.lesson_number}</span>
                  {buoiTiep.title}
                </h1>
                <ol className="dash-buoc" aria-label="Các bước của buổi">
                  <BuocBuoi
                    ten="Từ vựng"
                    xong={tienDoBuoi.tongTu > 0 && tienDoBuoi.tuDaHoc >= tienDoBuoi.tongTu}
                    chiTiet={`${tienDoBuoi.tuDaHoc}/${tienDoBuoi.tongTu} từ đã học`}
                  />
                  <BuocBuoi ten="Lý thuyết" chiTiet="Đọc trước khi làm bài" />
                  <BuocBuoi
                    ten="Bài tập"
                    xong={tienDoBuoi.tongCau > 0 && tienDoBuoi.cauDung >= tienDoBuoi.tongCau}
                    chiTiet={`${tienDoBuoi.cauDung}/${tienDoBuoi.tongCau} câu đúng`}
                  />
                </ol>
                <Link
                  to={`/khoa-hoc/${khoaChinh.id}/bai/${buoiTiep.lesson_number}?tab=${buocTiep}`}
                  className="ui-button ui-button--primary dash-cta-primary"
                >
                  {tienDoBuoi.daBatDau ? "Học tiếp" : "Bắt đầu"} Buổi {buoiTiep.lesson_number}
                </Link>
              </>
            ) : (
              <>
                <h1 id="dash-buoi-tiep" className="dash-hom-nay__tieu-de">
                  Đã xong {khoaChinh.lessons.length} buổi hiện có
                </h1>
                <Link to="/khoa-hoc" className="ui-button ui-button--primary dash-cta-primary">
                  Xem khoá học
                </Link>
              </>
            )}
          </div>

          <div className="dash-hom-nay__lich">
            <p className="dash-hom-nay__lich-nhan">
              {tongBuoi} buổi · xong {soBuoiXong}
            </p>
            <ol className="dash-lich" aria-label={`${tongBuoi} buổi của khoá, xong ${soBuoiXong} buổi`}>
              {Array.from({ length: tongBuoi }, (_, i) => {
                const bai = khoaChinh.lessons.find((muc) => muc.lesson_number === i + 1);
                const trangThai = !bai
                  ? ""
                  : tienDoBuoiHoc(bai).xong
                    ? " dash-lich__o--xong"
                    : bai === buoiTiep
                      ? " dash-lich__o--tiep"
                      : " dash-lich__o--co";
                return (
                  <li key={i} style={{ "--thu-tu": i }}>
                    {bai ? (
                      <Link
                        to={`/khoa-hoc/${khoaChinh.id}/bai/${bai.lesson_number}`}
                        className={`dash-lich__o${trangThai}`}
                        data-mo-rong
                        title={`Buổi ${i + 1}: ${bai.title}`}
                      >
                        <span className="sr-only">Buổi {i + 1}</span>
                      </Link>
                    ) : (
                      <span className="dash-lich__o" title={`Buổi ${i + 1}: chưa có nội dung`} />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      ) : (
        <section className="dash-hom-nay" aria-labelledby="dash-chao">
          <div className="dash-hom-nay__chinh">
            <p className="dash-hom-nay__eyebrow">
              Streak {currentStreak} ngày{todaySessions > 0 ? ` · ${todaySessions} phiên hôm nay` : ""}
            </p>
            <h1 id="dash-chao" className="dash-hom-nay__tieu-de">
              {chao}, {ten}
            </h1>
            <Link
              to={deckDeNghi ? `/decks/${deckDeNghi.id}` : "/decks"}
              className="ui-button ui-button--primary dash-cta-primary"
            >
              {deckDeNghi ? `Học tiếp: ${deckDeNghi.title}` : "Xem từ vựng"}
            </Link>
          </div>
        </section>
      )}

      {/* ── B. Việc cần làm hôm nay ── */}
      <section aria-labelledby="dash-viec-can-lam">
        <h2 id="dash-viec-can-lam" className="dash-section__title">Cần ôn hôm nay</h2>
        <div className="dash-viec">
          <TheViec to="/review" so={srsStats.duHomNay} donVi="từ" nhan="Từ đến hạn ôn" />
          {khoaChinh && (
            <TheViec to="/khoa-hoc/on-tap" so={soCauCanOn} donVi="câu" nhan="Câu bài tập làm sai" />
          )}
          <TheViec to="/tu-sai" so={mistakeStats.active} donVi="từ" nhan="Từ hay nhầm" />
        </div>
      </section>

      {/* ── Body grid ── */}
      <div className="dash-body-grid">
        <div className="dash-body-main">
          {/* ── C. Từ vựng theo buổi ── */}
          {khoaChinh && (
            <section className="dash-section">
              <div className="dash-section__header">
                <h2 className="dash-section__title">Từ vựng theo buổi</h2>
                <Link to="/decks?tab=buoi" className="dash-xem-them">Xem cả {tongBuoi} buổi →</Link>
              </div>
              <ul className="dash-tu-buoi">
                {buoiGanDay(khoaChinh.lessons, buoiTiep).map((bai) => {
                  const tienDo = tienDoBuoiHoc(bai);
                  const phanTram = tienDo.tongTu > 0 ? Math.round((tienDo.tuDaHoc / tienDo.tongTu) * 100) : 0;
                  return (
                    <li key={bai.lesson_number}>
                      <Link to={bai.deck_id ? `/decks/${bai.deck_id}` : "/decks?tab=buoi"} className="dash-tu-buoi__dong">
                        <span className="dash-tu-buoi__so">Buổi {bai.lesson_number}</span>
                        <span className="dash-tu-buoi__ten">{bai.title}</span>
                        <span className="dash-tu-buoi__thanh" aria-hidden="true">
                          <span style={{ width: `${phanTram}%` }} />
                        </span>
                        <span className="dash-tu-buoi__dem">
                          {tienDo.tuDaHoc}/{tienDo.tongTu} từ
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* ── D. Bộ của tôi ── */}
          <section className="dash-section">
            <div className="dash-section__header">
              <h2 className="dash-section__title">Bộ từ của tôi</h2>
              <Link to="/decks?tab=cua-toi&create=1" className="dash-xem-them">+ Thêm bộ từ</Link>
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
                icon="deck"
                title="Chưa có bộ từ nào"
                description="Tự tạo bộ từ cho những từ bạn gặp ngoài khoá học."
                action="Tạo bộ từ"
                onAction={() => navigateWithLoading("/decks?tab=cua-toi&create=1")}
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

        {/* ── E. Tổng quan ── */}
        <div className="dash-body-side">
          <section className="dash-section">
            <div className="dash-overview-card">
              <p className="dash-overview-card__title">Tổng quan</p>
              {dangTai ? (
                <div className="dash-overview-card__body">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="dash-stat-row dash-stat-row--loading">
                      <div className="skeleton-shimmer" style={{ width: "3rem", height: "1.125rem" }} />
                      <div className="skeleton-shimmer" style={{ width: "5rem", height: "0.7rem" }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-overview-card__body">
                  <StatRow
                    icon="flame"
                    label="Streak"
                    value={`${currentStreak} ngày`}
                    caption={longestStreak > 0 ? `Dài nhất ${longestStreak} ngày` : "Bắt đầu chuỗi mới"}
                    accent={currentStreak > 0}
                  />
                  {khoaChinh && (
                    <StatRow
                      icon="calendar"
                      label="Khoá học"
                      value={`${soBuoiXong}/${tongBuoi}`}
                      caption="Buổi đã xong"
                    />
                  )}
                  <StatRow icon="mastered" label="Đã thuộc" value={`${srsStats.mastered} từ`} caption="Mọi nguồn từ vựng" />
                  <StatRow icon="vocab" label="Bộ của tôi" value={`${tongTu} từ`} caption={`${decks.length} bộ`} />
                  <StatRow icon="star" label="XP" value={stats?.total_xp ?? 0} caption="Tổng tích luỹ" />
                </div>
              )}
              <Link to="/stats" className="dash-xem-them dash-overview-card__link">Xem thống kê →</Link>
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
