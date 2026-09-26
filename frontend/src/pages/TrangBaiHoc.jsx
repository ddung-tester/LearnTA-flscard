import { useEffect, useLayoutEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { usePageTransition } from "../contexts/PageTransitionContext";
import BaiTapKhoaHoc from "../components/BaiTapKhoaHoc";
import useTTS from "../hooks/useTTS";
import { layBaiHoc } from "../services/courseApi";
import { tenLoaiTu } from "../utils/baiTapKhoaHoc";

const CAC_TAB = [
  { key: "ly-thuyet", nhan: "Lý thuyết" },
  { key: "tu-vung", nhan: "Từ vựng" },
  { key: "bai-tap", nhan: "Bài tập" },
];

function NutDoc({ text, onDoc }) {
  return (
    <button
      type="button"
      className="khoa-hoc-nut-doc"
      onClick={() => onDoc(text)}
      aria-label={`Đọc: ${text}`}
      title="Nghe phát âm"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    </button>
  );
}

function LyThuyet({ content, onDoc }) {
  const { grammar = [], notes = [] } = content || {};
  return (
    <div className="khoa-hoc-ly-thuyet">
      {grammar.map((muc, index) => (
        <section key={muc.id || index} className="khoa-hoc-muc">
          <h3 className="khoa-hoc-muc__tieu-de">
            {index + 1}. {muc.title}
          </h3>
          {muc.pattern && <p className="khoa-hoc-muc__cong-thuc">{muc.pattern}</p>}
          {muc.rules?.length > 0 && (
            <ul className="khoa-hoc-muc__quy-tac">
              {muc.rules.map((quyTac) => (
                <li key={quyTac}>{quyTac}</li>
              ))}
            </ul>
          )}
          {muc.examples?.length > 0 && (
            <ul className="khoa-hoc-muc__vi-du">
              {muc.examples.map((viDu) => (
                <li key={viDu.en}>
                  <NutDoc text={viDu.en} onDoc={onDoc} />
                  <span>
                    <span className="khoa-hoc-muc__vi-du-en">{viDu.en}</span>
                    {viDu.vi && <span className="khoa-hoc-muc__vi-du-vi">{viDu.vi}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {notes.length > 0 && (
        <section className="khoa-hoc-ghi-nho">
          <h3 className="khoa-hoc-ghi-nho__tieu-de">Ghi nhớ</h3>
          <ul>
            {notes.map((ghiChu) => (
              <li key={ghiChu}>{ghiChu}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TuVung({ words, deckId, onDoc }) {
  return (
    <div className="khoa-hoc-tu-vung">
      {deckId && (
        <div className="flex flex-wrap gap-2">
          <Link to={`/decks/${deckId}/flashcard`} className="ui-button ui-button--primary px-4 py-2.5">
            Học Flashcard
          </Link>
          <Link to={`/practice?bo=${deckId}`} className="ui-button ui-button--ghost px-4 py-2.5">
            Luyện tập
          </Link>
          <Link to={`/decks/${deckId}`} className="ui-button ui-button--ghost px-4 py-2.5">
            Xem bộ từ
          </Link>
        </div>
      )}
      {words.length === 0 ? (
        <p className="text-sm text-[var(--mau-chu-phu)]">Bài này chưa có từ vựng.</p>
      ) : (
        <ul className="khoa-hoc-ds-tu">
          {words.map((tu) => (
            <li key={tu.id} className="khoa-hoc-tu">
              <NutDoc text={tu.term_en} onDoc={onDoc} />
              <div className="khoa-hoc-tu__noi-dung">
                <p>
                  <span className="khoa-hoc-tu__tu">{tu.term_en}</span>
                  {tu.pronunciation && <span className="khoa-hoc-tu__phien-am">{tu.pronunciation}</span>}
                  {tu.part_of_speech && (
                    <span className="ui-chip ui-chip--small">{tenLoaiTu(tu.part_of_speech)}</span>
                  )}
                </p>
                <p className="khoa-hoc-tu__nghia">{tu.meaning_vi}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * TrangBaiHoc — một bài của khoá học riêng: Lý thuyết · Từ vựng · Bài tập.
 * Tab nằm trên URL (?tab=) để quay lại từ Flashcard/Luyện tập vẫn đúng tab.
 */
function TrangBaiHoc() {
  const { courseId, soBai } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setPageDataLoading } = usePageTransition();
  const { speak } = useTTS();
  const khoa = `${courseId}/${soBai}`;
  const [trangThai, setTrangThai] = useState({ khoa: null, bai: null, loi: "" });
  const dangTai = trangThai.khoa !== khoa;
  const tab = CAC_TAB.some((muc) => muc.key === searchParams.get("tab")) ? searchParams.get("tab") : "ly-thuyet";

  useLayoutEffect(() => {
    setPageDataLoading("course-lesson", dangTai);
    return () => setPageDataLoading("course-lesson", false);
  }, [dangTai, setPageDataLoading]);

  useEffect(() => {
    let conHieuLuc = true;
    layBaiHoc(courseId, soBai)
      .then((bai) => {
        if (conHieuLuc) setTrangThai({ khoa, bai, loi: "" });
      })
      .catch((error) => {
        if (conHieuLuc) setTrangThai({ khoa, bai: null, loi: error.message });
      });
    return () => {
      conHieuLuc = false;
    };
  }, [courseId, soBai, khoa]);

  if (dangTai) return null;

  const { bai } = trangThai;
  if (!bai) {
    return (
      <div className="ui-page-stack">
        <Link to="/khoa-hoc" className="ui-back-link ui-back-link--quiet">&larr; Khoá học</Link>
        <p className="text-sm text-[var(--mau-chu-phu)]">Không tìm thấy bài học này.</p>
      </div>
    );
  }

  const docTiengAnh = (text) => speak(text, "en-US");
  const soCau = { "bai-tap": bai.questions.length, "tu-vung": bai.words.length };

  return (
    <div className="ui-page-stack">
      <Link to="/khoa-hoc" className="ui-back-link ui-back-link--quiet">&larr; {bai.course.title}</Link>

      <div className="ui-page-header">
        <div className="ui-page-header__title">
          <p className="khoa-hoc-so-bai">Bài {bai.lesson.lesson_number}</p>
          <h2 className="text-2xl font-semibold text-[var(--mau-chu)]">{bai.lesson.title}</h2>
        </div>
      </div>

      <div className="ui-filter-tabs khoa-hoc-tabs" role="tablist" aria-label="Nội dung bài học">
        {CAC_TAB.map((muc) => (
          <button
            key={muc.key}
            type="button"
            role="tab"
            aria-selected={tab === muc.key}
            aria-pressed={tab === muc.key}
            className="ui-filter-tab"
            onClick={() => setSearchParams({ tab: muc.key }, { replace: true })}
          >
            {muc.nhan}
            {soCau[muc.key] !== undefined && <span className="khoa-hoc-tab__dem">{soCau[muc.key]}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "ly-thuyet" && <LyThuyet content={bai.lesson.content} onDoc={docTiengAnh} />}
        {tab === "tu-vung" && <TuVung words={bai.words} deckId={bai.lesson.deck_id} onDoc={docTiengAnh} />}
        {tab === "bai-tap" && <BaiTapKhoaHoc key={bai.lesson.id} cauHoi={bai.questions} />}
      </div>

      <nav className="khoa-hoc-dieu-huong" aria-label="Chuyển bài">
        {bai.prev_lesson ? (
          <Link to={`/khoa-hoc/${bai.course.id}/bai/${bai.prev_lesson}`} className="ui-button ui-button--ghost px-4 py-2.5">
            &larr; Bài {bai.prev_lesson}
          </Link>
        ) : (
          <span />
        )}
        {bai.next_lesson && (
          <Link to={`/khoa-hoc/${bai.course.id}/bai/${bai.next_lesson}`} className="ui-button ui-button--ghost px-4 py-2.5">
            Bài {bai.next_lesson} &rarr;
          </Link>
        )}
      </nav>
    </div>
  );
}

export default TrangBaiHoc;
