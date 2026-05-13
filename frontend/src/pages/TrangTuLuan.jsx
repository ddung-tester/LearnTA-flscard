import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import StudySettingsPopover from "../components/common/StudySettingsPopover";
import RewardTikTokEffect, { CAU_HINH_REWARD_QUIZ } from "../components/RewardTikTokEffect";
import ComboDisplay from "../components/common/ComboDisplay";
import useCombo from "../hooks/useCombo";
import { locTuYeuThich } from "../data/duLieuMau";
import RewardProgressBar from "../components/common/RewardProgressBar";
import ToggleSwitch from "../components/common/ToggleSwitch";
import ModeSwitch from "../components/common/ModeSwitch";
import { layDeckTheoId } from "../services/deckApi";
import { layCardsTheoDeck } from "../services/cardApi";
import {
  ketThucStudySession,
  luuQuizResult,
  luuStudyAnswers,
  taoStudySession,
} from "../services/studyApi";

const DS_CHE_DO = [
  { key: "vi-en", nhan: "Nghĩa → Từ", shortLabel: "Nghĩa → Từ" },
  { key: "en-vi", nhan: "Từ → Nghĩa", shortLabel: "Từ → Nghĩa" },
];

function chuanHoa(t) { return t.trim().toLowerCase().replace(/\s+/g, " "); }

function TrangTuLuan() {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const [bo, setBo] = useState(null);
  const [danhSachGoc, setDanhSachGoc] = useState([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState(true);
  const [loiTaiDuLieu, setLoiTaiDuLieu] = useState("");

  const [chiHocTuYeuThich, setChiHocTuYeuThich] = useState(false);
  const [lanLam, setLanLam] = useState(0);
  const [cheDo, setCheDo] = useState("vi-en");
  const [batReward, setBatReward] = useState(true);
  const [soCauDungNhanThuong, setSoCauDungNhanThuong] = useState(5);
  const [batRandom, setBatRandom] = useState(false);

  const [danhSachThe, setDanhSachThe] = useState([]);
  const [chiSo, setChiSo] = useState(0);
  const [cauTraLoi, setCauTraLoi] = useState("");
  const [daKiemTra, setDaKiemTra] = useState(false);
  const [ketQuaDung, setKetQuaDung] = useState(false);
  const [soCauDung, setSoCauDung] = useState(0);
  const [daHoanThanh, setDaHoanThanh] = useState(false);
  const [danhSachKetQua, setDanhSachKetQua] = useState([]);
  const [daBoQua, setDaBoQua] = useState(false);
  const [shakeKey, setShakeKey] = useState(0); // tăng mỗi lần sai để retrigger animation

  const [hienReward, setHienReward] = useState(false);
  const [lanReward, setLanReward] = useState(0);
  const [dangChuyenCau, setDangChuyenCau] = useState(false);
  const [dangChoReward, setDangChoReward] = useState(false);

  const { combo, maxCombo, comboPhase, incrementCombo, resetCombo, resetAll } = useCombo();
  const [rewardProgressPhase, setRewardProgressPhase] = useState("idle");
  const [rewardProgressValue, setRewardProgressValue] = useState(0);
  const [studySessionId, setStudySessionId] = useState(null);
  const [loiLuuKetQua, setLoiLuuKetQua] = useState("");

  const inputRef = useRef(null);
  const rewardProgressTimerRef = useRef(null);
  const questionTransitionTimerRef = useRef(null);
  const progressEndpointRef = useRef(null);
  const amThanhBufferRef = useRef(null);   // Web Audio decoded buffer — phát tức thì
  const audioCtxRef = useRef(null);        // AudioContext dùng chung
  const choHoanThanhRef = useRef(false);   // true khi câu cuối đúng + có reward đang chờ
  const daLuuKetQuaRef = useRef(false);

  async function taiDuLieuTuLuan() {
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
    taiDuLieuTuLuan();
  }, [boId]);

  // Decode âm thanh vào Web Audio buffer một lần khi mount.
  // AudioContext + decodeAudioData → phát ngay lập tức, không lag.
  useEffect(() => {
    let ctx;
    fetch("/sound/bigo.mp3")
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        ctx = new AudioContext();
        audioCtxRef.current = ctx;
        return ctx.decodeAudioData(buf);
      })
      .then((decoded) => {
        amThanhBufferRef.current = decoded;
      })
      .catch(() => {});

    return () => {
      ctx?.close();
      amThanhBufferRef.current = null;
      audioCtxRef.current = null;
    };
  }, []);

  useEffect(() => {
    let ds = chiHocTuYeuThich ? locTuYeuThich(danhSachGoc, true) : danhSachGoc;
    // Shuffle chỉ khi batRandom bật, giữ nguyên thứ tự khi tắt
    setDanhSachThe(batRandom ? [...ds].sort(() => Math.random() - 0.5) : [...ds]);
    setChiSo(0);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setDanhSachKetQua([]);
    setDaKiemTra(false);
    setCauTraLoi("");
    setDangChuyenCau(false);
    setDangChoReward(false);
    setStudySessionId(null);
    setLoiLuuKetQua("");
    daLuuKetQuaRef.current = false;
    resetAll();
  }, [boId, lanLam, chiHocTuYeuThich, batRandom, danhSachGoc]);

  useEffect(() => {
    if (!bo || danhSachThe.length === 0 || daHoanThanh) return;

    let daHuy = false;

    taoStudySession({
      deck_id: boId,
      mode: "written",
      direction: cheDo,
      only_favorite: chiHocTuYeuThich,
      random_order: batRandom,
      total: danhSachThe.length,
    })
      .then((session) => {
        if (!daHuy) setStudySessionId(session.id);
      })
      .catch(() => {
        if (!daHuy) setStudySessionId(null);
      });

    return () => {
      daHuy = true;
    };
  }, [
    bo,
    boId,
    cheDo,
    chiHocTuYeuThich,
    batRandom,
    lanLam,
    danhSachThe.length,
    daHoanThanh,
  ]);


  function xoaTimerProgressReward() { if (rewardProgressTimerRef.current) clearTimeout(rewardProgressTimerRef.current); }
  function xoaTimerChuyenCau() { if (questionTransitionTimerRef.current) clearTimeout(questionTransitionTimerRef.current); }

  function batDauTienTrinhReward(giaTri, coReward) {
    xoaTimerProgressReward();
    setRewardProgressValue(giaTri);
    setRewardProgressPhase("correctPulse");

    if (coReward) {
      setDangChoReward(true);
    } else {
      setDangChoReward(false);
    }

    rewardProgressTimerRef.current = setTimeout(() => {
      if (coReward) {
        setRewardProgressPhase("beamLaunch");
        rewardProgressTimerRef.current = setTimeout(() => {
          setHienReward(true);
          setLanReward(prev => prev + 1);
        }, 600);
      } else {
        setRewardProgressPhase("idle");
      }
    }, 450);
  }

  function xuLyRewardDongXong() {
    xoaTimerProgressReward();
    setDangChoReward(false);
    setRewardProgressPhase("rewardComplete");
    rewardProgressTimerRef.current = setTimeout(() => {
      setRewardProgressPhase("idle");
      setRewardProgressValue(0);
    }, 780);

    if (ketQuaDung && chiSo + 1 >= danhSachThe.length) {
      choHoanThanhRef.current = false;
      setDaHoanThanh(true);
      return;
    }

    // Nếu đây là câu cuối và đang chờ hiện màn hình hoàn thành
    if (choHoanThanhRef.current) {
      choHoanThanhRef.current = false;
      setDaHoanThanh(true);
      return;
    }

    if (ketQuaDung) {
      window.setTimeout(() => {
        chuyenCauMem({ boQuaKhoaReward: true });
      }, 80);
    }
  }

  useEffect(() => {
    if (!daHoanThanh && (!daKiemTra || !ketQuaDung) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chiSo, daHoanThanh, daKiemTra, ketQuaDung]);

  useEffect(() => {
    if (!daKiemTra || daHoanThanh || hienReward || dangChoReward || !ketQuaDung) {
      return undefined;
    }

    const timer = setTimeout(() => chuyenCauMem(), lanReward > 0 ? 1000 : 2000);
    return () => clearTimeout(timer);
  }, [daKiemTra, ketQuaDung, daHoanThanh, hienReward, dangChoReward, lanReward]);

  useEffect(() => {
    if (!bo || !daHoanThanh || danhSachThe.length === 0) return;
    if (daLuuKetQuaRef.current) return;

    daLuuKetQuaRef.current = true;

    async function luuKetQuaLenBackend() {
      const total = danhSachThe.length;
      const review = total - soCauDung;
      const answers = danhSachKetQua.map((ketQua) => ({
        card_id: ketQua.id,
        question_text: ketQua.cauHoi,
        correct_answer: ketQua.dapAnDung,
        user_answer: ketQua.cauTraLoi,
        is_correct: ketQua.dung,
      }));

      try {
        await luuQuizResult({
          deck_id: boId,
          question_type: "written",
          direction: cheDo,
          correct: soCauDung,
          review,
          total,
        });

        if (studySessionId) {
          await ketThucStudySession(studySessionId, {
            correct: soCauDung,
            review,
            total,
            xp_earned: soCauDung * 10,
            max_combo: maxCombo,
          });

          if (answers.length > 0) {
            await luuStudyAnswers(studySessionId, answers);
          }
        }
      } catch (error) {
        setLoiLuuKetQua(error.message);
      }
    }

    luuKetQuaLenBackend();
  }, [
    bo,
    boId,
    cheDo,
    daHoanThanh,
    danhSachKetQua,
    danhSachThe.length,
    maxCombo,
    soCauDung,
    studySessionId,
  ]);

  function layCauHoi(the) { return cheDo === "vi-en" ? the.meaning_vi : the.term_en; }
  function layDapAnDung(the) { return cheDo === "vi-en" ? the.term_en : the.meaning_vi; }

  function kiemTraDapAn(event) {
    event.preventDefault();
    if (
      (daKiemTra && ketQuaDung) ||
      hienReward ||
      dangChoReward ||
      dangChuyenCau ||
      danhSachThe.length === 0
    ) {
      return;
    }

    const theHienTai = danhSachThe[chiSo];
    const dapAnDung = layDapAnDung(theHienTai);
    const dung = chuanHoa(cauTraLoi) === chuanHoa(dapAnDung);

    if (dung) {
      setDaKiemTra(true);
      setKetQuaDung(true);
      setDaBoQua(false);
      phatAmThanhDung();
      setSoCauDung((hienTai) => {
        const diemMoi = hienTai + 1;
        const tienDoMoi = ((diemMoi - 1) % soCauDungNhanThuong) + 1;
        const coReward = batReward && diemMoi % soCauDungNhanThuong === 0;
        batDauTienTrinhReward(tienDoMoi, coReward);
        return diemMoi;
      });
      incrementCombo();
      
      setDanhSachKetQua((hienTai) => [
        ...hienTai,
        { id: theHienTai.id, cauHoi: layCauHoi(theHienTai), dapAnDung, cauTraLoi: cauTraLoi.trim(), dung: true },
      ]);
    } else {
      setDanhSachKetQua((hienTai) => [
        ...hienTai,
        { id: theHienTai.id, cauHoi: layCauHoi(theHienTai), dapAnDung, cauTraLoi: cauTraLoi.trim(), dung: false },
      ]);
      setDaKiemTra(true);
      setKetQuaDung(false);
      setDaBoQua(false);
      setCauTraLoi("");
      setShakeKey((k) => k + 1);
      resetCombo();
      // Dùng setTimeout để chờ React remount input (do key thay đổi) trước khi focus
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function boQua() {
    if (dangChuyenCau || hienReward || dangChoReward) return;
    const theHienTai = danhSachThe[chiSo];
    if (theHienTai) {
      setDanhSachKetQua((hienTai) => [
        ...hienTai,
        {
          id: theHienTai.id,
          cauHoi: layCauHoi(theHienTai),
          dapAnDung: layDapAnDung(theHienTai),
          cauTraLoi: "",
          dung: false,
        },
      ]);
    }
    setDaKiemTra(true);
    setKetQuaDung(false);
    setDaBoQua(true);
    setCauTraLoi("");
    resetCombo();
    inputRef.current?.focus();
  }

  function sangCauTiepTheo() {
    if (ketQuaDung) {
      if (chiSo + 1 >= danhSachThe.length) {
        // Câu cuối: nếu reward đang hiển thị, defer hoàn thành đến sau khi reward đóng
        if (hienReward || dangChoReward) {
          choHoanThanhRef.current = true;
          return;
        }
        setDaHoanThanh(true);
        return;
      }
      setChiSo((h) => h + 1);
    }
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
    setDaBoQua(false);
    setDangChuyenCau(false);
  }

  function chuyenCauMem({ boQuaKhoaReward = false } = {}) {
    if (!boQuaKhoaReward && (hienReward || dangChoReward)) return;

    xoaTimerChuyenCau();
    setDangChuyenCau(true);
    questionTransitionTimerRef.current = setTimeout(() => {
      sangCauTiepTheo();
    }, 220);
  }

  function lamLai() {
    setLanLam((g) => g + 1);
    setChiSo(0);
    setCauTraLoi("");
    setDaKiemTra(false);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setDanhSachKetQua([]);
    setLanReward(0);
    setDangChuyenCau(false);
    setDangChoReward(false);
    resetAll();
    setStudySessionId(null);
    setLoiLuuKetQua("");
    daLuuKetQuaRef.current = false;
  }

  function phatAmThanhDung() {
    try {
      const ctx = audioCtxRef.current;
      const buffer = amThanhBufferRef.current;
      if (!ctx || !buffer) return;

      // Resume context nếu bị treo do browser autoplay policy
      if (ctx.state === "suspended") ctx.resume();

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.9;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
    } catch {}
  }

  function doiCheDoHoc(key) {
    setCheDo(key);
    lamLai();
  }

  function doiCheDoReward() {
    setBatReward((dangBat) => {
      if (dangBat) {
        setHienReward(false);
        setDangChoReward(false);
        xoaTimerProgressReward();
        setRewardProgressPhase("idle");
        setRewardProgressValue(0);
      }

      return !dangBat;
    });
  }

  function doiRandom() {
    setBatRandom((prev) => !prev);
    // useEffect [batRandom] sẽ tự reset danh sách
  }

  function capNhatMocReward(e) {
    const v = Math.max(1, Number(e.target.value) || 1);
    setSoCauDungNhanThuong(v);
  }

  function doiChiHocTuYeuThich() {
    setChiHocTuYeuThich(p => !p);
    setLanLam(g => g + 1);
    setChiSo(0);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setDangChoReward(false);
    resetAll();
  }

  if (dangTaiDuLieu) return (
    <div className="ui-study-empty-wrap">
      <section className="ui-study-empty-card">
        <h2 className="ui-study-empty-card__title">Đang tải dữ liệu...</h2>
      </section>
    </div>
  );

  if (loiTaiDuLieu) return (
    <div className="ui-study-empty-wrap">
      <section className="ui-study-empty-card">
        <h2 className="ui-study-empty-card__title">
          Không thể tải dữ liệu. Kiểm tra backend hoặc thử lại.
        </h2>
        <div className="ui-study-empty-card__actions">
          <button
            type="button"
            onClick={taiDuLieuTuLuan}
            className="ui-button ui-button--primary ui-study-empty-card__button"
          >
            Thử lại
          </button>
        </div>
      </section>
    </div>
  );

  if (!bo) return null;

  if (danhSachGoc.length === 0 || danhSachThe.length === 0) return (
    <div className="ui-study-empty-wrap">
      <section className="ui-study-empty-card">
        <h2 className="ui-study-empty-card__title">Bộ từ này chưa có từ nào</h2>
        <div className="ui-study-empty-card__actions">
          <Link to={`/decks/${boId}`} className="ui-button ui-button--primary ui-study-empty-card__button">Quay lại bộ từ</Link>
        </div>
      </section>
    </div>
  );

  if (daHoanThanh) {
    return (
      <>
        <RewardTikTokEffect active={batReward && hienReward} lanKichHoat={lanReward} config={CAU_HINH_REWARD_QUIZ} progressEndpointRef={progressEndpointRef} onRequestClose={() => setHienReward(false)} onHideComplete={xuLyRewardDongXong} combo={combo} />
        <div className="ui-study-session mx-auto max-w-2xl py-12 text-center">
          <h2 className="text-3xl font-bold mb-6">Hoàn thành! Bạn đúng {soCauDung}/{danhSachThe.length}</h2>
          {loiLuuKetQua && (
            <p className="mb-4 text-sm text-[var(--mau-loi)]">
              Không thể lưu kết quả lên backend. Kết quả trên màn hình vẫn được giữ.
            </p>
          )}
          <button onClick={lamLai} className="ui-button ui-button--primary px-6 py-3 rounded-xl">Làm lại</button>
        </div>
      </>
    );
  }

  const tongSoCauHoi = danhSachThe.length;
  const tienDoReward = (soCauDung / Math.max(1, tongSoCauHoi)) * 100;

  return (
    <>
      <RewardTikTokEffect active={batReward && hienReward} lanKichHoat={lanReward} config={CAU_HINH_REWARD_QUIZ} progressEndpointRef={progressEndpointRef} onRequestClose={() => setHienReward(false)} onHideComplete={xuLyRewardDongXong} combo={combo} />
      <div className="ui-study-session relative z-10 mx-auto max-w-2xl px-4 py-3">
        <div className="ui-study-toolbar mb-4">
          <Link to={`/decks/${boId}`} className="ui-study-back-link">&larr; {bo.title}</Link>
          <StudySettingsPopover label="Cài đặt tự luận">
            <section className="ui-settings-popover__section">
              <p className="ui-settings-popover__title">Học tập</p>
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <span className="ui-settings-popover__label">Ngôn ngữ</span>
                  <span className="ui-settings-popover__hint">Đổi chiều câu hỏi và đáp án</span>
                </div>
                <ModeSwitch
                  value={cheDo}
                  onChange={doiCheDoHoc}
                  options={DS_CHE_DO}
                  ariaLabel="Đổi chế độ tự luận"
                  variant="compact"
                />
              </div>
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <span className="ui-settings-popover__label">Chỉ từ yêu thích</span>
                  <span className="ui-settings-popover__hint">Chỉ hỏi các từ đã thả tim</span>
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
                  <span className="ui-settings-popover__hint">Xáo trộn thứ tự từ khi bắt đầu</span>
                </div>
                <ToggleSwitch
                  checked={batRandom}
                  onChange={doiRandom}
                  ariaLabel={`Ngẫu nhiên ${batRandom ? "bật" : "tắt"}`}
                />
              </div>
            </section>
            <section className="ui-settings-popover__section">
              <p className="ui-settings-popover__title">Phần thưởng</p>
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <span className="ui-settings-popover__label">Reward</span>
                  <span className="ui-settings-popover__hint">Bật hoặc tắt hiệu ứng thưởng</span>
                </div>
                <ToggleSwitch
                  checked={batReward}
                  onChange={doiCheDoReward}
                  ariaLabel={`Reward ${batReward ? "bật" : "tắt"}`}
                />
              </div>
              <div className="ui-settings-popover__row">
                <div className="ui-settings-popover__field">
                  <label htmlFor="moc-reward-tuluan" className="ui-settings-popover__label">
                    Mốc thưởng
                  </label>
                  <span className="ui-settings-popover__hint">Số câu đúng để kích hoạt thưởng</span>
                </div>
                <input
                  id="moc-reward-tuluan"
                  type="number"
                  min="1"
                  value={soCauDungNhanThuong}
                  onChange={capNhatMocReward}
                  className="ui-input--compact rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
                />
              </div>
            </section>
          </StudySettingsPopover>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
             <span className="ui-chip ui-chip--muted ui-chip--small">Câu {chiSo + 1}/{tongSoCauHoi}</span>
          </div>
          <RewardProgressBar
            currentValue={soCauDung}
            totalValue={tongSoCauHoi}
            progressPercent={tienDoReward}
            phase={rewardProgressPhase}
            endpointRef={progressEndpointRef}
            combo={combo}
          />
          <div className="mt-1.5 flex justify-end">
            <ComboDisplay combo={combo} phase={comboPhase} />
          </div>
        </div>

        {/* Card câu hỏi */}
        <section
          key={danhSachThe[chiSo]?.id}
          className={`ui-question-flow mb-6 text-center rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-8 shadow-[var(--bong-card)] sm:py-10 ${dangChuyenCau ? "ui-question-flow--leaving" : ""}`}
        >
          <h2 className="text-3xl font-semibold text-[var(--mau-chu)] sm:text-[2.25rem] leading-snug">
            {layCauHoi(danhSachThe[chiSo])}
          </h2>
        </section>

        <form onSubmit={kiemTraDapAn} className="space-y-3">
          <input
            key={shakeKey}
            ref={inputRef}
            type="text"
            value={cauTraLoi}
            onChange={(e) => setCauTraLoi(e.target.value)}
            disabled={daKiemTra && ketQuaDung}
            placeholder="Nhập đáp án..."
            className={`w-full rounded-xl border p-4 text-xl focus:ring-2 focus:ring-[var(--mau-chinh)] outline-none transition-all ${
              daKiemTra
                ? (ketQuaDung
                  ? "border-green-500 bg-green-50"
                  : "border-red-400 bg-red-50/50 ui-input-shake")
                : "border-[var(--mau-vien)] bg-[var(--mau-input)]"
            }`}
          />

          {/* Chưa kiểm tra: hiện cả 2 nút */}
          {!daKiemTra && (
            <div className="flex gap-3">
              <button type="button" onClick={boQua} className="ui-button ui-button--ghost flex-1 py-3 border rounded-xl">Bỏ qua</button>
              <button type="submit" disabled={!cauTraLoi.trim()} className="ui-button ui-button--primary flex-1 py-3 bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-bold rounded-xl">Kiểm tra</button>
            </div>
          )}

          {/* Trả lời sai (chưa bỏ qua): vẫn hiện cả 2 nút */}
          {daKiemTra && !ketQuaDung && !daBoQua && (
            <div className="flex gap-3">
              <button type="button" onClick={boQua} className="ui-button ui-button--ghost flex-1 py-3 border rounded-xl">Bỏ qua</button>
              <button type="submit" disabled={!cauTraLoi.trim()} className="ui-button ui-button--primary flex-1 py-3 bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-bold rounded-xl">Kiểm tra</button>
            </div>
          )}

          {/* Đã bỏ qua (đang xem đáp án): chỉ nút Kiểm tra full width */}
          {daKiemTra && !ketQuaDung && daBoQua && (
            <button type="submit" disabled={!cauTraLoi.trim()} className="ui-button ui-button--primary w-full py-3 bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-bold rounded-xl">Kiểm tra</button>
          )}

          {/* Đúng rồi: hiện thông báo */}
          {daKiemTra && ketQuaDung && (
            <div className="py-2 text-center">
              <span className="text-[var(--mau-thanh-cong)] font-bold text-lg">Chính xác!</span>
            </div>
          )}
        </form>

        {/* Gợi ý đáp án — CHỈ hiện khi bỏ qua, không hiện khi trả lời sai */}
        {daKiemTra && daBoQua && (
          <div className="mt-4 text-center py-3 rounded-xl border border-[var(--mau-loi)]/15 bg-[var(--mau-loi)]/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--mau-loi)] opacity-50 mb-1">Đáp án đúng</p>
            <span className="text-2xl font-black text-[var(--mau-loi)] tracking-tight">
              {layDapAnDung(danhSachThe[chiSo])}
            </span>
          </div>
        )}
      </div>
    </>
  );
}

export default TrangTuLuan;
