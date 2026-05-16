import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useParams, Link } from "react-router-dom";
import ModeSwitch from "../components/common/ModeSwitch";
import StudySettingsPopover from "../components/common/StudySettingsPopover";
import ToggleSwitch from "../components/common/ToggleSwitch";
import RewardTikTokEffect, {
  CAU_HINH_REWARD_QUIZ,
} from "../components/RewardTikTokEffect";
import { locTuYeuThich } from "../data/duLieuMau";
import { layDeckTheoId } from "../services/deckApi";
import { layCardsTheoDeck } from "../services/cardApi";
import { taoStudySession } from "../services/studyApi";
import {
  clampProgressPercent,
  getProgressColor,
} from "../utils/progressColor";

const DS_CHE_DO = [
  {
    key: "vi-en",
    nhan: "Vietnamese → English",
    shortLabel: "VI → EN",
  },
  {
    key: "en-vi",
    nhan: "English → Vietnamese",
    shortLabel: "EN → VI",
  },
];

function laVungNhapLieu(element) {
  if (!element) return false;
  const tenThe = element.tagName?.toLowerCase();
  return (
    tenThe === "input" ||
    tenThe === "textarea" ||
    tenThe === "select" ||
    element.isContentEditable
  );
}

function TrangFlashcard() {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const [bo, setBo] = useState(null);
  const [danhSachGoc, setDanhSachGoc] = useState([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");
  const sessionKeyRef = useRef("");

  const [chiSo, setChiSo] = useState(0);
  const [daLat, setDaLat] = useState(false);
  const [cheDo, setCheDo] = useState("vi-en");
  const [chiHocTuYeuThich, setChiHocTuYeuThich] = useState(false);
  const [batRandom, setBatRandom] = useState(false);
  const [lanTron, setLanTron] = useState(0); // tăng để trigger re-shuffle
  const [hienReward, setHienReward] = useState(false);
  const [lanReward, setLanReward] = useState(0);
  const [diemReward, setDiemReward] = useState(0);
  const [batReward, setBatReward] = useState(true);
  const giamChuyenDong = useReducedMotion();
  const cacTheDaTinhDiemRef = useRef(new Set());
  const rewardTimerRef = useRef(null);
  const progressEndpointRef = useRef(null);

  function xoaTimerReward() {
    if (rewardTimerRef.current) {
      clearTimeout(rewardTimerRef.current);
      rewardTimerRef.current = null;
    }
  }

  function datLaiReward() {
    xoaTimerReward();
    cacTheDaTinhDiemRef.current = new Set();
    setDiemReward(0);
    setHienReward(false);
    setLanReward(0);
  }

  async function taiDuLieuHoc() {
    setDangTaiDuLieu(true);
    setLoiTaiDuLieu("");

    try {
      const [deck, cards] = await Promise.all([
        layDeckTheoId(boId),
        layCardsTheoDeck(boId),
      ]);

      setBo(deck);
      setDanhSachGoc(cards);
    } catch (error) {
      setBo(null);
      setDanhSachGoc([]);
      setLoiTaiDuLieu(error.message);
    } finally {
      setDangTaiDuLieu(false);
    }
  }

  useEffect(() => {
    setChiSo(0);
    setDaLat(false);
    setChiHocTuYeuThich(false);
    sessionKeyRef.current = "";
    datLaiReward();
    taiDuLieuHoc();
  }, [boId]);

  const danhSachLoc = useMemo(
    () => locTuYeuThich(danhSachGoc, chiHocTuYeuThich),
    [danhSachGoc, chiHocTuYeuThich]
  );
  // useMemo để chỉ re-shuffle khi lanTron hoặc danh sách nguồn thay đổi
  const danhSach = useMemo(() => {
    if (!batRandom) return danhSachLoc;
    return [...danhSachLoc].sort(() => Math.random() - 0.5);
  }, [batRandom, lanTron, danhSachLoc]);

  function ghiNhanDiemReward() {
    if (!batReward || !danhSach[chiSo]) return;

    const rewardKey = `${cheDo}-${danhSach[chiSo].id}`;
    if (cacTheDaTinhDiemRef.current.has(rewardKey)) return;

    cacTheDaTinhDiemRef.current.add(rewardKey);
    setDiemReward((diemHienTai) => {
      const diemMoi = diemHienTai + 1;

      if (diemMoi % CAU_HINH_REWARD_QUIZ.triggerCount === 0) {
        xoaTimerReward();
        rewardTimerRef.current = setTimeout(() => {
          setLanReward((lanHienTai) => lanHienTai + 1);
          setHienReward(true);
        }, 560);
      }

      return diemMoi;
    });
  }

  useEffect(
    () => () => {
      xoaTimerReward();
    },
    []
  );

  useEffect(() => {
    if (!bo || danhSach.length === 0) return;

    const sessionKey = `${boId}-${cheDo}-${chiHocTuYeuThich}-${batRandom}-${lanTron}-${danhSach.length}`;
    if (sessionKeyRef.current === sessionKey) return;
    sessionKeyRef.current = sessionKey;

    taoStudySession({
      deck_id: boId,
      mode: "flashcard",
      direction: cheDo,
      only_favorite: chiHocTuYeuThich,
      random_order: batRandom,
      total: danhSach.length,
    }).catch(() => {
      sessionKeyRef.current = "";
    });
  }, [bo, boId, cheDo, chiHocTuYeuThich, batRandom, lanTron, danhSach.length]);

  function latThe() {
    setDaLat((dangLat) => {
      const seLatMatSau = !dangLat;
      if (seLatMatSau) {
        ghiNhanDiemReward();
      }

      return seLatMatSau;
    });
  }

  function diChuyen(buoc) {
    setChiSo((chiSoHienTai) => {
      const chiSoMoi = chiSoHienTai + buoc;
      if (chiSoMoi < 0 || chiSoMoi >= danhSach.length) return chiSoHienTai;
      return chiSoMoi;
    });
    setDaLat(false);
  }

  function doiCheDoHoc(key) {
    if (key === cheDo) return;
    setCheDo(key);
    setChiSo(0);
    setDaLat(false);
    datLaiReward();
  }

  function doiChiHocTuYeuThich() {
    setChiHocTuYeuThich((dangBat) => !dangBat);
    setChiSo(0);
    setDaLat(false);
    datLaiReward();
  }

  function doiRandom() {
    setBatRandom((prev) => {
      const moi = !prev;
      if (moi) setLanTron((n) => n + 1); // trigger shuffle mới
      return moi;
    });
    setChiSo(0);
    setDaLat(false);
    datLaiReward();
  }

  function doiCheDoReward() {
    setBatReward((dangBat) => {
      if (dangBat) {
        datLaiReward();
      }

      return !dangBat;
    });
  }

  useEffect(() => {
    function xuLyPhim(e) {
      if (laVungNhapLieu(e.target)) return;

      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        latThe();
        return;
      }

      if (e.key === "ArrowRight") {
        diChuyen(1);
      } else if (e.key === "ArrowLeft") {
        diChuyen(-1);
      }
    }

    window.addEventListener("keydown", xuLyPhim);
    return () => window.removeEventListener("keydown", xuLyPhim);
  });

  if (dangTaiDuLieu) {
    return (
      <div className="ui-study-empty-wrap">
        <section className="ui-study-empty-card">
          <h2 className="ui-study-empty-card__title">Đang tải dữ liệu...</h2>
        </section>
      </div>
    );
  }

  if (loiTaiDuLieu) {
    return (
      <div className="ui-study-empty-wrap">
        <section className="ui-study-empty-card">
          <h2 className="ui-study-empty-card__title">
            Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.
          </h2>
          <div className="ui-study-empty-card__actions">
            <button
              type="button"
              onClick={taiDuLieuHoc}
              className="ui-button ui-button--primary ui-study-empty-card__button"
            >
              Thử lại
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!bo) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-phu)] mb-3">
          Không tìm thấy
        </p>
        <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-3">
          Bộ từ này không tồn tại
        </h2>
        <p className="text-[var(--mau-chu-phu)] mb-6">
          Kiểm tra lại đường dẫn hoặc quay về danh sách bộ từ để chọn một bộ khác.
        </p>
        <Link
          to="/decks"
          className="ui-button ui-button--primary inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] transition-colors"
        >
          Quay về danh sách
        </Link>
      </div>
    );
  }

  if (danhSachGoc.length === 0 || danhSach.length === 0) {
    const dangThieuTuYeuThich = danhSachGoc.length > 0 && danhSach.length === 0;

    return (
      <div className="ui-study-empty-wrap">
        <section className="ui-study-empty-card">
          <p className="ui-study-empty-card__eyebrow">
            Flashcard
          </p>
          <h2 className="ui-study-empty-card__title">
            {dangThieuTuYeuThich ? "Chưa có từ yêu thích" : "Bộ từ này chưa có từ nào"}
          </h2>
          <p className="ui-study-empty-card__copy">
            {dangThieuTuYeuThich
              ? "Tắt lọc yêu thích hoặc đánh dấu vài từ trước khi học."
              : "Thêm một vài cặp từ Anh Việt trước khi bắt đầu."}
          </p>
          <div className="ui-study-empty-card__actions">
            {dangThieuTuYeuThich && (
              <button
                type="button"
                onClick={doiChiHocTuYeuThich}
                className="ui-button ui-button--ghost ui-study-empty-card__button"
              >
                Tắt lọc yêu thích
              </button>
            )}
            <Link
              to={`/decks/${boId}`}
              className="ui-button ui-button--primary ui-study-empty-card__button"
            >
              Quay lại bộ từ
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const theHienTai = danhSach[chiSo];
  const matTruoc = cheDo === "en-vi" ? theHienTai.term_en : theHienTai.meaning_vi;
  const matSau = cheDo === "en-vi" ? theHienTai.meaning_vi : theHienTai.term_en;
  const tienDo = ((chiSo + 1) / danhSach.length) * 100;
  const tienDoAnToan = clampProgressPercent(tienDo);
  const tiLeTienDo = tienDoAnToan / 100;
  const mauTienDo = getProgressColor(tienDoAnToan);
  const thietLapLatThe = giamChuyenDong
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.16, 1, 0.3, 1] };

  return (
    <>
      <RewardTikTokEffect
        active={batReward && hienReward}
        lanKichHoat={lanReward}
        config={CAU_HINH_REWARD_QUIZ}
        progressEndpointRef={progressEndpointRef}
        onRequestClose={() => setHienReward(false)}
        onHideComplete={() => setHienReward(false)}
        combo={diemReward}
      />
      <div className="ui-study-session ui-study-session--compact ui-flashcard-session mx-auto flex max-w-3xl flex-col gap-4">
      <div className="ui-study-toolbar">
        <div>
          <Link
            to={`/decks/${boId}`}
            className="ui-study-back-link"
          >
            &larr; {bo.title}
          </Link>
        </div>
        <div className="ui-control-cluster">
          <StudySettingsPopover label="Cài đặt flashcard">
            <section className="ui-settings-popover__section">
              <p className="ui-settings-popover__title">Học tập</p>
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <span className="ui-settings-popover__label">Ngôn ngữ</span>
                  <span className="ui-settings-popover__hint">Đổi mặt trước và mặt sau</span>
                </div>
                <ModeSwitch
                  value={cheDo}
                  onChange={doiCheDoHoc}
                  options={DS_CHE_DO}
                  ariaLabel="Đổi chế độ flashcard"
                  variant="compact"
                />
              </div>
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <span className="ui-settings-popover__label">Chỉ học từ yêu thích</span>
                  <span className="ui-settings-popover__hint">Flashcard chỉ lấy từ đã thả tim</span>
                </div>
                <ToggleSwitch
                  checked={chiHocTuYeuThich}
                  onChange={doiChiHocTuYeuThich}
                  ariaLabel={`Chỉ học từ yêu thích ${chiHocTuYeuThich ? "bật" : "tắt"}`}
                />
              </div>
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <span className="ui-settings-popover__label">Thứ tự ngẫu nhiên</span>
                  <span className="ui-settings-popover__hint">Xáo trộn thứ tự thẻ mỗi lần học</span>
                </div>
                <ToggleSwitch
                  checked={batRandom}
                  onChange={doiRandom}
                  ariaLabel={`Ngẫu nhiên ${batRandom ? "bật" : "tắt"}`}
                />
              </div>
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <span className="ui-settings-popover__label">Reward</span>
                  <span className="ui-settings-popover__hint">
                    Thưởng sau mỗi {CAU_HINH_REWARD_QUIZ.triggerCount} thẻ đã lật
                  </span>
                </div>
                <ToggleSwitch
                  checked={batReward}
                  onChange={doiCheDoReward}
                  ariaLabel={`Reward ${batReward ? "bật" : "tắt"}`}
                />
              </div>
            </section>
          </StudySettingsPopover>
        </div>
      </div>

      <div
        className="ui-section-stack ui-flashcard-progress"
        style={{ "--progress-current-color": mauTienDo }}
      >
        <div className="ui-study-progress__meta mb-2 flex items-center justify-between gap-3 text-xs font-medium">
          <span>Tiến độ</span>
          <span>{Math.round(tienDoAnToan)}%</span>
        </div>
        <div className="ui-study-progress">
          <div
            className="ui-progress-fill ui-study-progress__fill"
            style={{
              "--progress-scale": tiLeTienDo,
              "--progress-gradient-scale": Math.max(tiLeTienDo, 0.01),
              width: `${tienDoAnToan}%`,
            }}
          />
        </div>
      </div>

      <div
        key={`${cheDo}-${chiSo}`}
        className="ui-content-enter ui-flashcard-stage [perspective:1200px] flex-1 min-h-0"
      >
        <button
          type="button"
          onClick={latThe}
          aria-pressed={daLat}
          className="ui-card-interactive ui-flashcard-card relative h-full min-h-[19rem] w-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] sm:min-h-[24rem]"
        >
          <motion.div
            className="ui-flashcard-card__inner absolute inset-0 rounded-xl"
            initial={false}
            animate={{ rotateY: daLat ? 180 : 0 }}
            transition={thietLapLatThe}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-7 shadow-[var(--bong-card)] [backface-visibility:hidden] hover:bg-[var(--mau-mat-hover)] transition-colors sm:px-8 sm:py-9">
              <span className="max-w-full break-words text-center text-2xl font-semibold leading-relaxed text-[var(--mau-chu)] sm:text-3xl">
                {matTruoc}
              </span>
              <span className="text-xs text-[var(--mau-chu-phu)] mt-8">
                Click hoặc nhấn Space để lật thẻ
              </span>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-[var(--mau-chinh)]/35 bg-[var(--mau-mat-2)] px-5 py-7 shadow-[var(--bong-card)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:px-8 sm:py-9">
              <span className="max-w-full break-words text-center text-2xl font-semibold leading-relaxed text-[var(--mau-chu)] sm:text-3xl">
                {matSau}
              </span>
              {theHienTai.example_sentence && (
                <p className="mt-6 max-w-md break-words text-center text-sm italic text-[var(--mau-chu-phu)]">
                  {theHienTai.example_sentence}
                </p>
              )}
            </div>
          </motion.div>
        </button>
      </div>

      <div className="ui-flashcard-nav grid grid-cols-2 gap-3 pb-1">
        <button
          type="button"
          onClick={() => diChuyen(-1)}
          disabled={chiSo === 0}
          className="ui-button ui-button--ghost w-full rounded-lg border border-[var(--mau-vien)] px-4 py-3 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          &larr; Trước
        </button>
        <button
          type="button"
          onClick={() => diChuyen(1)}
          disabled={chiSo === danhSach.length - 1}
          className="ui-button ui-button--ghost w-full rounded-lg border border-[var(--mau-vien)] px-4 py-3 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          Sau &rarr;
        </button>
      </div>
      </div>
    </>
  );
}

export default TrangFlashcard;
