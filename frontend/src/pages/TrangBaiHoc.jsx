import { Fragment, useEffect, useLayoutEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { usePageTransition } from "../contexts/PageTransitionContext";
import BaiTapKhoaHoc from "../components/BaiTapKhoaHoc";
import useTTS from "../hooks/useTTS";
import { layBaiHoc } from "../services/courseApi";
import { tachCongThuc, tenLoaiTu, tongSoBuoiKhoaHoc } from "../utils/baiTapKhoaHoc";
import "./KhoaHoc.css";

// Thứ tự học trong một buổi: từ vựng trước, rồi lý thuyết, cuối cùng làm bài tập
const CAC_BUOC = [
  { key: "tu-vung", nhan: "Từ vựng" },
  { key: "ly-thuyet", nhan: "Lý thuyết" },
  { key: "bai-tap", nhan: "Bài tập" },
];

function IconLoa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function DaiBuoiHoc({ tong, hienTai }) {
  if (!tong || tong < hienTai) return null;
  return (
    <div className="kh-dai-buoi" role="img" aria-label={`Buổi ${hienTai} trên ${tong} buổi`}>
      {Array.from({ length: tong }, (_, i) => (
        <span
          key={i}
          className={`kh-dai-buoi__vach${i + 1 < hienTai ? " kh-dai-buoi__vach--qua" : ""}${i + 1 === hienTai ? " kh-dai-buoi__vach--nay" : ""}`}
        />
      ))}
    </div>
  );
}

function NutSangBuoc({ buoc, onChon, children }) {
  return (
    <div className="kh-sang-buoc">
      <button type="button" className="ui-button ui-button--primary px-5 py-2.5" onClick={() => onChon(buoc)}>
        {children}
      </button>
    </div>
  );
}

function TuVung({ words, deckId, onDoc, onSangBuoc }) {
  if (words.length === 0) {
    return <p className="kh-trong">Buổi này chưa có từ vựng.</p>;
  }
  return (
    <div className="kh-phan">
      <div className="kh-phan__dau">
        <p className="kh-phan__mo-ta">{words.length} từ mới. Bấm vào thẻ để nghe phát âm.</p>
        {deckId && (
          <div className="kh-phan__hanh-dong">
            <Link to={`/decks/${deckId}/flashcard`} className="ui-button ui-button--primary px-4 py-2.5">
              Học bằng thẻ
            </Link>
            <Link to={`/practice?bo=${deckId}`} className="ui-button ui-button--ghost px-4 py-2.5">
              Luyện tập
            </Link>
          </div>
        )}
      </div>

      <ul className="kh-the-tu-luoi">
        {words.map((tu) => (
          <li key={tu.id}>
            <button type="button" className="kh-the-tu" onClick={() => onDoc(tu.term_en)}>
              <span className="kh-the-tu__dong">
                <span className="kh-the-tu__tu" lang="en">{tu.term_en}</span>
                <span className="kh-the-tu__loa">
                  <IconLoa />
                  <span className="sr-only">Nghe phát âm</span>
                </span>
              </span>
              {(tu.pronunciation || tu.part_of_speech) && (
                <span className="kh-the-tu__phu">
                  {tu.pronunciation && <span className="kh-the-tu__phien-am">{tu.pronunciation}</span>}
                  {tu.part_of_speech && <span className="kh-the-tu__loai">{tenLoaiTu(tu.part_of_speech)}</span>}
                </span>
              )}
              <span className="kh-the-tu__nghia">{tu.meaning_vi}</span>
            </button>
          </li>
        ))}
      </ul>

      <NutSangBuoc buoc="ly-thuyet" onChon={onSangBuoc}>
        Học tiếp phần lý thuyết
      </NutSangBuoc>
    </div>
  );
}

function CongThuc({ text }) {
  const cacKhoi = tachCongThuc(text);
  if (cacKhoi.length === 0) return null;
  return (
    <p className="kh-cong-thuc">
      <span className="sr-only">Công thức: {text}</span>
      <span className="kh-cong-thuc__khoi-ghep" aria-hidden="true">
        {cacKhoi.map((khoi, index) => (
          <Fragment key={`${khoi.text}-${index}`}>
            {index > 0 && <span className="kh-cong-thuc__cong">+</span>}
            <span className={`kh-cong-thuc__khoi${khoi.laCho ? " kh-cong-thuc__khoi--cho" : ""}`}>{khoi.text}</span>
          </Fragment>
        ))}
      </span>
    </p>
  );
}

function LyThuyet({ content, onDoc, soCauBaiTap, onSangBuoc }) {
  const { grammar = [], notes = [] } = content || {};
  if (grammar.length === 0 && notes.length === 0) {
    return <p className="kh-trong">Buổi này chưa có lý thuyết.</p>;
  }
  return (
    <div className="kh-phan">
      <article className="kh-vo">
        {grammar.map((muc, index) => (
          <section key={muc.id || index} className="kh-vo__muc" aria-labelledby={`muc-${index}`}>
            <span className="kh-vo__so" aria-hidden="true">{index + 1}</span>
            <h3 id={`muc-${index}`} className="kh-vo__tieu-de">{muc.title}</h3>
            {muc.pattern && <CongThuc text={muc.pattern} />}
            {muc.rules?.length > 0 && (
              <ul className="kh-vo__quy-tac">
                {muc.rules.map((quyTac) => (
                  <li key={quyTac}>{quyTac}</li>
                ))}
              </ul>
            )}
            {muc.examples?.length > 0 && (
              <ul className="kh-vo__vi-du">
                {muc.examples.map((viDu) => (
                  <li key={viDu.en}>
                    <button type="button" className="kh-nut-loa" onClick={() => onDoc(viDu.en)} title="Nghe câu ví dụ">
                      <IconLoa />
                      <span className="sr-only">Nghe: {viDu.en}</span>
                    </button>
                    <span>
                      <span className="kh-vo__vi-du-en" lang="en">{viDu.en}</span>
                      {viDu.vi && <span className="kh-vo__vi-du-vi">{viDu.vi}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
        {notes.length > 0 && (
          <aside className="kh-vo__ghi-nho" aria-labelledby="ghi-nho">
            <h3 id="ghi-nho" className="kh-vo__ghi-nho-tieu-de">Ghi nhớ</h3>
            <ul>
              {notes.map((ghiChu) => (
                <li key={ghiChu}>{ghiChu}</li>
              ))}
            </ul>
          </aside>
        )}
      </article>

      {soCauBaiTap > 0 && (
        <NutSangBuoc buoc="bai-tap" onChon={onSangBuoc}>
          Làm {soCauBaiTap} câu bài tập
        </NutSangBuoc>
      )}
    </div>
  );
}

/**
 * TrangBaiHoc — một buổi của khoá học riêng, học theo thứ tự Từ vựng → Lý thuyết → Bài tập.
 * Bước đang mở nằm trên URL (?tab=) để quay lại từ Flashcard/Luyện tập vẫn đúng chỗ.
 */
function TrangBaiHoc() {
  const { courseId, soBai } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setPageDataLoading } = usePageTransition();
  const { speak } = useTTS();
  const khoa = `${courseId}/${soBai}`;
  const [trangThai, setTrangThai] = useState({ khoa: null, bai: null, loi: "" });
  const dangTai = trangThai.khoa !== khoa;
  const buoc = CAC_BUOC.some((muc) => muc.key === searchParams.get("tab")) ? searchParams.get("tab") : "tu-vung";

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
        <p className="kh-trong">Không mở được buổi học này. Quay về danh sách khoá học để chọn lại.</p>
      </div>
    );
  }

  const soBuoi = bai.lesson.lesson_number;
  const docTiengAnh = (text) => speak(text, "en-US");
  const chuyenBuoc = (key) => {
    setSearchParams({ tab: key }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const moTaBuoc = {
    "tu-vung": `${bai.words.length} từ`,
    "ly-thuyet": `${bai.lesson.content?.grammar?.length || 0} mục`,
    "bai-tap": `${bai.questions.length} câu`,
  };

  return (
    <div className="ui-page-stack kh-trang">
      <Link to="/khoa-hoc" className="ui-back-link ui-back-link--quiet">&larr; {bai.course.title}</Link>

      <header className="kh-dau-bai">
        <p className="kh-dau-bai__so" aria-hidden="true">{soBuoi}</p>
        <div className="kh-dau-bai__chu">
          <p className="kh-dau-bai__nhan">Buổi {soBuoi}</p>
          <h2 className="kh-dau-bai__ten">{bai.lesson.title}</h2>
          <DaiBuoiHoc tong={tongSoBuoiKhoaHoc(bai.course.title, soBuoi)} hienTai={soBuoi} />
        </div>
      </header>

      <div className="kh-buoc" role="tablist" aria-label="Các bước học trong buổi">
        {CAC_BUOC.map((muc, index) => (
          <button
            key={muc.key}
            type="button"
            role="tab"
            id={`buoc-${muc.key}`}
            aria-selected={buoc === muc.key}
            aria-controls="noi-dung-buoc"
            className="kh-buoc__nut"
            onClick={() => chuyenBuoc(muc.key)}
          >
            <span className="kh-buoc__so" aria-hidden="true">{index + 1}</span>
            <span className="kh-buoc__chu">
              <span className="kh-buoc__ten">{muc.nhan}</span>
              <span className="kh-buoc__mo-ta">{moTaBuoc[muc.key]}</span>
            </span>
          </button>
        ))}
      </div>

      <div id="noi-dung-buoc" role="tabpanel" aria-labelledby={`buoc-${buoc}`}>
        {buoc === "tu-vung" && (
          <TuVung words={bai.words} deckId={bai.lesson.deck_id} onDoc={docTiengAnh} onSangBuoc={chuyenBuoc} />
        )}
        {buoc === "ly-thuyet" && (
          <LyThuyet
            content={bai.lesson.content}
            onDoc={docTiengAnh}
            soCauBaiTap={bai.questions.length}
            onSangBuoc={chuyenBuoc}
          />
        )}
        {buoc === "bai-tap" && <BaiTapKhoaHoc key={bai.lesson.id} cauHoi={bai.questions} />}
      </div>

      {(bai.prev_lesson || bai.next_lesson) && (
        <nav className="kh-chuyen-buoi" aria-label="Chuyển buổi">
          {bai.prev_lesson ? (
            <Link to={`/khoa-hoc/${bai.course.id}/bai/${bai.prev_lesson}`} className="ui-button ui-button--ghost px-4 py-2.5">
              Buổi {bai.prev_lesson}
            </Link>
          ) : (
            <span />
          )}
          {bai.next_lesson && (
            <Link to={`/khoa-hoc/${bai.course.id}/bai/${bai.next_lesson}`} className="ui-button ui-button--ghost px-4 py-2.5">
              Buổi {bai.next_lesson}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

export default TrangBaiHoc;
