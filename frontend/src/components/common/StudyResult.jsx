/**
 * StudyResult — Màn hình kết quả chung cho Quiz và Tự luận.
 *
 * Props:
 *   deckTitle: tên bộ từ
 *   deckId: id để link quay về
 *   tongSoCau: tổng số câu
 *   soCauDung: số câu đúng
 *   soCauSai: số câu sai
 *   maxCombo: combo cao nhất (tùy chọn)
 *   loiLuu: thông báo lỗi lưu (tùy chọn)
 *   onLamLai: callback làm lại
 *   onHocLaiTuSai: callback học lại từ sai (tùy chọn)
 *   danhSachCardSai: mảng card sai (tùy chọn)
 *   mode: "quiz" | "tuluan"
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { luuTuSaiDongBo, danhDauDaOnDongBo } from "../../utils/mistakeNotebook";
import { ghiNhanDungVaoSRSDongBo } from "../../utils/srsReview";

function AnimatedNumber({ value, duration = 800 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    let startTime = null;
    let frame;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayValue(Math.round(eased * value));

      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{displayValue}</>;
}

function ScoreRing({ percent, size = 100, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const color =
    percent >= 80
      ? "var(--mau-thanh-cong)"
      : percent >= 50
        ? "var(--mau-canh-bao)"
        : "var(--mau-loi)";

  return (
    <svg
      width={size}
      height={size}
      className="study-result__ring"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--mau-vien)"
        strokeWidth={strokeWidth}
        opacity="0.3"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="study-result__ring-progress"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={size * 0.26}
        fontWeight="700"
        fontFamily="var(--font-sans)"
      >
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

function StudyResult({
  deckTitle,
  deckId,
  tongSoCau,
  soCauDung,
  soCauSai = 0,
  maxCombo = 0,
  loiLuu,
  onLamLai,
  onHocLaiTuSai,
  danhSachCardSai = [],
  danhSachCardDung = [], // mảng card đúng — dùng để cập nhật SRS mastery
  mode = "quiz",
}) {
  const tiLeDung = tongSoCau > 0 ? Math.round((soCauDung / tongSoCau) * 100) : 0;

  // Lưu kết quả vào Mistake Notebook + SRS khi màn hình kết quả xuất hiện
  useEffect(() => {
    const deckInfo = { deckId, deckTitle, source: mode };

    // 1. Lưu từ sai → Mistake Notebook (cũng tự động queue vào SRS qua mistakeNotebook.js)
    if (danhSachCardSai.length > 0) {
      luuTuSaiDongBo(danhSachCardSai, deckInfo);
    }

    // 2. Ghi nhận từ đúng → tăng SRS level
    if (danhSachCardDung.length > 0) {
      ghiNhanDungVaoSRSDongBo(danhSachCardDung, deckInfo);

      // 3. Nếu từ đúng đã đạt mastered → đánh dấu reviewed trong Mistake Notebook
      //    (nếu có trong notebook). Không xóa entry — chỉ đánh dấu.
      //    Dùng capNhatKetQuaOn làm signal check — nhưng để tránh re-import vóng tròn,
      //    ta không import layTatCaSRS. Thay vào đó dùng localStorage direct check.
      //    → Đơn giản: chỉ mark reviewed nếu ti lệ đúng cao (>= 80%)
      if (tiLeDung >= 80 && danhSachCardSai.length === 0) {
        // Toàn bộ session đúng → mark tất cả card đúng trong notebook là reviewed
        for (const card of danhSachCardDung) {
          danhDauDaOnDongBo(String(card.id));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // chỉ chạy 1 lần khi mount

  const loiKhen =
    tiLeDung === 100
      ? "Hoàn hảo! 🎉"
      : tiLeDung >= 80
        ? "Tuyệt vời! 🔥"
        : tiLeDung >= 60
          ? "Khá tốt! 👍"
          : tiLeDung >= 40
            ? "Cần ôn thêm 💪"
            : "Hãy thử lại nhé 📖";

  const tenLoai = mode === "quiz" ? "trắc nghiệm" : "tự luận";

  return (
    <div className="study-result">
      <Link
        to={`/decks/${deckId}`}
        className="ui-back-link ui-back-link--quiet"
      >
        &larr; {deckTitle}
      </Link>

      <section className="study-result__card">
        <p className="study-result__tag">Tổng kết {tenLoai}</p>
        <h2 className="study-result__title">{loiKhen}</h2>

        {loiLuu && (
          <p className="study-result__error">
            Không thể lưu kết quả. Kết quả trên màn hình vẫn được giữ.
          </p>
        )}

        <div className="study-result__ring-wrap">
          <ScoreRing percent={tiLeDung} size={120} strokeWidth={10} />
        </div>

        <div className="ui-stat-grid mx-auto max-w-xl">
          <div className="ui-stat-card border border-[var(--mau-vien)] bg-[var(--mau-mat-2)]">
            <p className="ui-stat-label mb-1">Tổng câu</p>
            <p className="ui-stat-value text-[var(--mau-chu)]">
              <AnimatedNumber value={tongSoCau} />
            </p>
          </div>
          <div className="ui-stat-card border border-[var(--mau-thanh-cong)]/30 bg-[var(--mau-thanh-cong)]/5">
            <p className="ui-stat-label mb-1">Đúng</p>
            <p className="ui-stat-value text-[var(--mau-thanh-cong)]">
              <AnimatedNumber value={soCauDung} />
            </p>
          </div>
          {soCauSai > 0 && (
            <div className="ui-stat-card border border-[var(--mau-loi)]/30 bg-[var(--mau-loi)]/5">
              <p className="ui-stat-label mb-1">Sai</p>
              <p className="ui-stat-value text-[var(--mau-loi)]">
                <AnimatedNumber value={soCauSai} />
              </p>
            </div>
          )}
          {maxCombo > 1 && (
            <div className="ui-stat-card border border-[var(--mau-chinh)]/30 bg-[var(--mau-chinh)]/5">
              <p className="ui-stat-label mb-1">Max combo</p>
              <p className="ui-stat-value text-[var(--mau-chinh)]">
                <AnimatedNumber value={maxCombo} />
              </p>
            </div>
          )}
        </div>

        <div className="study-result__actions">
          <button
            type="button"
            onClick={onLamLai}
            className="ui-button ui-button--ghost study-result__btn"
          >
            Làm lại
          </button>
          {soCauSai > 0 && onHocLaiTuSai && (
            <button
              type="button"
              onClick={onHocLaiTuSai}
              className="ui-button ui-button--primary study-result__btn study-result__btn--review"
            >
              Ôn lại {soCauSai} từ sai
            </button>
          )}
        </div>
      </section>

      {/* Danh sách từ sai */}
      {soCauSai > 0 && danhSachCardSai.length > 0 && (
        <section className="study-result__wrong-list">
          <div className="study-result__wrong-header">
            <svg viewBox="0 0 24 24" className="study-result__wrong-icon" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{soCauSai} từ cần ôn lại</span>
          </div>
          <ul className="ui-card-list">
            {danhSachCardSai.map((card, i) => (
              <li
                key={card.id}
                className="ui-reading-card ui-word-row border border-[var(--mau-loi)]/30 rounded-xl bg-[var(--mau-mat)] px-4 py-3.5"
              >
                <div className="ui-word-row__inner">
                  <div className="ui-word-main">
                    <span className="ui-word-index">{i + 1}</span>
                    <div className="ui-word-pair">
                      <div className="flex items-center gap-1 w-full min-w-0">
                        <span className="ui-word-card ui-word-card--term flex-1">
                          {card.term_en}
                        </span>
                      </div>
                      <span className="ui-word-card ui-word-card--meaning">
                        {card.meaning_vi}
                      </span>
                    </div>
                  </div>
                </div>
                {card.example_sentence && (
                  <p className="ui-word-example">{card.example_sentence}</p>
                )}
              </li>
            ))}
          </ul>
          <div className="study-result__notebook-link">
            <Link to="/tu-sai" className="ui-link text-sm font-medium text-[var(--mau-chinh)] hover:underline">
              📓 Xem sổ từ sai của bạn →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

export default StudyResult;
