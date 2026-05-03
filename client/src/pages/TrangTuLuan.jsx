import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import RewardTikTokEffect, {
  CAU_HINH_REWARD_QUIZ,
} from "../components/RewardTikTokEffect";
import { layBoTheoId, layTheoBoId } from "../data/duLieuMau";

const DS_CHE_DO = [
  {
    key: "vi-en",
    nhan: "Vietnamese → English",
    moTa: "Xem tiếng Việt, gõ từ tiếng Anh",
    labelCauHoi: "VIETNAMESE",
    labelTraLoi: "Gõ từ tiếng Anh",
  },
  {
    key: "en-vi",
    nhan: "English → Vietnamese",
    moTa: "Xem tiếng Anh, gõ nghĩa tiếng Việt",
    labelCauHoi: "ENGLISH",
    labelTraLoi: "Gõ nghĩa tiếng Việt",
  },
];

/**
 * Chuan hoa chuoi de so sanh: lowercase, trim, bo dau khoang trang thua.
 */
function chuanHoa(chuoi) {
  return chuoi.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Tron mang ngau nhien (Fisher-Yates).
 */
function tronMang(danhSach) {
  const ketQua = [...danhSach];
  for (let i = ketQua.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ketQua[i], ketQua[j]] = [ketQua[j], ketQua[i]];
  }
  return ketQua;
}

function TrangTuLuan() {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const bo = layBoTheoId(boId);
  const danhSachGoc = layTheoBoId(boId);

  const [cheDo, setCheDo] = useState("vi-en");
  const [daBatDau, setDaBatDau] = useState(false);
  const [lanLam, setLanLam] = useState(0);
  const [chiSo, setChiSo] = useState(0);
  const [cauTraLoi, setCauTraLoi] = useState("");
  const [daKiemTra, setDaKiemTra] = useState(false);
  const [ketQuaDung, setKetQuaDung] = useState(false);
  const [soCauDung, setSoCauDung] = useState(0);
  const [daHoanThanh, setDaHoanThanh] = useState(false);
  const [danhSachKetQua, setDanhSachKetQua] = useState([]);
  const [hienReward, setHienReward] = useState(false);
  const [diemRewardGanNhat, setDiemRewardGanNhat] = useState(0);
  const [lanReward, setLanReward] = useState(0);
  const [batReward, setBatReward] = useState(true);
  const [soCauDungNhanThuong, setSoCauDungNhanThuong] = useState(
    CAU_HINH_REWARD_QUIZ.triggerCount
  );

  const inputRef = useRef(null);

  const cheDoHienTai =
    DS_CHE_DO.find((item) => item.key === cheDo) ?? DS_CHE_DO[0];

  // Tron danh sach the moi lan lam hoac doi che do
  const danhSachThe = useMemo(
    () => tronMang(danhSachGoc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boId, lanLam, cheDo]
  );

  // Auto-focus vao input khi sang cau moi
  useEffect(() => {
    if (!daHoanThanh && !daKiemTra && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chiSo, daHoanThanh, daKiemTra]);

  // Auto sang cau tiep theo khi tra loi dung:
  // - Neu dang phat reward video: doi video tat xong roi moi sang (800ms sau)
  // - Neu khong co reward: sang sau 2s
  useEffect(() => {
    if (!daKiemTra || !ketQuaDung || daHoanThanh) return undefined;
    if (hienReward) return undefined; // cho video xong

    const delay = lanReward > 0 ? 800 : 2000;
    const timer = setTimeout(() => {
      sangCauTiepTheo();
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daKiemTra, ketQuaDung, daHoanThanh, hienReward]);

  // Nhan Enter de sang cau tiep khi da bo qua hoac tra loi sai
  useEffect(() => {
    if (!daKiemTra || ketQuaDung || daHoanThanh) return undefined;

    function xuLyEnter(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        sangCauTiepTheo();
      }
    }

    window.addEventListener("keydown", xuLyEnter);
    return () => window.removeEventListener("keydown", xuLyEnter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daKiemTra, ketQuaDung, daHoanThanh]);

  // Auto-hide reward sau duration
  useEffect(() => {
    if (!hienReward) return undefined;

    const timer = setTimeout(() => {
      setHienReward(false);
    }, CAU_HINH_REWARD_QUIZ.duration);

    return () => clearTimeout(timer);
  }, [hienReward, lanReward]);

  function layCauHoi(the) {
    return cheDo === "vi-en" ? the.meaning_vi : the.term_en;
  }

  function layDapAnDung(the) {
    return cheDo === "vi-en" ? the.term_en : the.meaning_vi;
  }

  function kiemTraDapAn(event) {
    event.preventDefault();
    if (daKiemTra || danhSachThe.length === 0) return;

    const theHienTai = danhSachThe[chiSo];
    const dapAnDung = layDapAnDung(theHienTai);
    const dung = chuanHoa(cauTraLoi) === chuanHoa(dapAnDung);

    setDaKiemTra(true);
    setKetQuaDung(dung);

    if (dung) {
      setSoCauDung((hienTai) => {
        const diemMoi = hienTai + 1;

        if (
          batReward &&
          diemMoi >= soCauDungNhanThuong &&
          diemMoi % soCauDungNhanThuong === 0 &&
          diemMoi !== diemRewardGanNhat
        ) {
          setDiemRewardGanNhat(diemMoi);
          setLanReward((lanHienTai) => lanHienTai + 1);
          setHienReward(true);
        }

        return diemMoi;
      });
    }

    setDanhSachKetQua((hienTai) => [
      ...hienTai,
      {
        id: theHienTai.id,
        cauHoi: layCauHoi(theHienTai),
        dapAnDung,
        cauTraLoi: cauTraLoi.trim(),
        dung,
      },
    ]);
  }

  function sangCauTiepTheo() {
    if (chiSo + 1 >= danhSachThe.length) {
      setDaHoanThanh(true);
      return;
    }

    setChiSo((hienTai) => hienTai + 1);
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
  }

  function boQua() {
    if (daKiemTra) return;

    const theHienTai = danhSachThe[chiSo];
    const dapAnDung = layDapAnDung(theHienTai);

    setDanhSachKetQua((hienTai) => [
      ...hienTai,
      {
        id: theHienTai.id,
        cauHoi: layCauHoi(theHienTai),
        dapAnDung,
        cauTraLoi: "",
        dung: false,
      },
    ]);

    setDaKiemTra(true);
    setKetQuaDung(false);
  }

  function lamLai() {
    // Quay ve man hinh chon che do
    setDaBatDau(false);
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setDanhSachKetQua([]);
    setHienReward(false);
    setDiemRewardGanNhat(0);
    setLanReward(0);
  }

  function batDauLam(key) {
    setCheDo(key);
    setDaBatDau(true);
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setCauTraLoi("");
    setDaKiemTra(false);
    setKetQuaDung(false);
    setSoCauDung(0);
    setDaHoanThanh(false);
    setDanhSachKetQua([]);
    setHienReward(false);
    setDiemRewardGanNhat(0);
    setLanReward(0);
  }

  function doiCheDoReward() {
    setBatReward((dangBat) => {
      if (dangBat) setHienReward(false);
      return !dangBat;
    });
  }

  function capNhatMocReward(event) {
    const giaTriMoi = Math.max(1, Number(event.target.value) || 1);
    setSoCauDungNhanThuong(giaTriMoi);
    setDiemRewardGanNhat(0);
    setHienReward(false);
  }



  // ========== KHONG TIM THAY BO ==========
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
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] transition-colors"
        >
          Quay về danh sách
        </Link>
      </div>
    );
  }

  // ========== CHUA CO TU NAO ==========
  if (danhSachGoc.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-3">
          Tự luận
        </p>
        <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-3">
          Bộ từ này chưa có từ nào
        </h2>
        <p className="text-[var(--mau-chu-phu)] mb-6">
          Thêm một vài cặp từ Anh Việt trước khi bắt đầu luyện tập.
        </p>
        <Link
          to={`/decks/${boId}`}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] transition-colors"
        >
          Quay lại bộ từ
        </Link>
      </div>
    );
  }

  // ========== CHON CHE DO (chua bat dau) ==========
  if (!daBatDau) {
    return (
      <div className="mx-auto max-w-xl">
        <Link
          to={`/decks/${boId}`}
          className="text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
        >
          &larr; {bo.title}
        </Link>

        <div className="mt-10 text-center mb-8">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chinh)] mb-3">
            Tự luận
          </p>
          <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-2">
            Chọn chế độ làm bài
          </h2>

        </div>

        <div className="grid grid-cols-1 gap-3">
          {DS_CHE_DO.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => batDauLam(item.key)}
              className="group text-left rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-6 py-5 shadow-[var(--bong-card)] hover:border-[var(--mau-chinh)] hover:bg-[var(--mau-mat-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
            >
              <span className="flex items-center justify-between">
                <span>
                  <span className="block text-base font-semibold text-[var(--mau-chu)] mb-1 group-hover:text-[var(--mau-chinh)] transition-colors">
                    {item.nhan}
                  </span>
                  <span className="block text-sm text-[var(--mau-chu-phu)]">
                    {item.moTa}
                  </span>
                </span>
                <span className="shrink-0 ml-4 text-[var(--mau-vien)] group-hover:text-[var(--mau-chinh)] transition-colors text-xl">
                  &rarr;
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ========== DA HOAN THANH ==========
  if (daHoanThanh) {
    const soSai = danhSachThe.length - soCauDung;
    const danhSachSai = danhSachKetQua.filter((item) => !item.dung);

    return (
      <>
        <RewardTikTokEffect
          active={batReward && hienReward}
          lanKichHoat={lanReward}
          config={CAU_HINH_REWARD_QUIZ}
        />
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to={`/decks/${boId}`}
              className="text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
            >
              &larr; {bo.title}
            </Link>
            <button
              type="button"
              aria-pressed={batReward}
              onClick={doiCheDoReward}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] ${batReward
                ? "border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/10 text-[var(--mau-chinh)]"
                : "border-[var(--mau-vien)] text-[var(--mau-chu-phu)]"
                }`}
            >
              Reward {batReward ? "Bật" : "Tắt"}
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <label
              htmlFor="moc-reward-tuluan-summary"
              className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)]"
            >
              Số câu đúng để có phần thưởng
            </label>
            <input
              id="moc-reward-tuluan-summary"
              type="number"
              min="1"
              value={soCauDungNhanThuong}
              onChange={capNhatMocReward}
              className="w-full sm:w-24 rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2 text-sm text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
            />
          </div>

          <section className="mt-6 border border-[var(--mau-vien)] rounded-xl bg-[var(--mau-mat)] px-5 py-8 text-center shadow-[var(--bong-card)]">
            <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-2">
              Bạn đúng {soCauDung}/{danhSachThe.length} từ
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-8 text-left">
              <div className="border border-[var(--mau-vien)] rounded-lg bg-[var(--mau-mat-2)] px-4 py-3">
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
                  Tổng câu
                </p>
                <p className="text-2xl font-mono font-bold text-[var(--mau-chu)]">
                  {danhSachThe.length}
                </p>
              </div>
              <div className="border border-[var(--mau-thanh-cong)]/30 bg-[var(--mau-thanh-cong)]/5 rounded-lg px-4 py-3">
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
                  Đúng
                </p>
                <p className="text-2xl font-mono font-bold text-[var(--mau-thanh-cong)]">
                  {soCauDung}
                </p>
              </div>
              <div className="border border-[var(--mau-loi)]/35 bg-[var(--mau-loi)]/10 rounded-lg px-4 py-3">
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
                  Sai
                </p>
                <p className="text-2xl font-mono font-bold text-[var(--mau-loi)]">
                  {soSai}
                </p>
              </div>
            </div>

            {danhSachSai.length > 0 && (
              <div className="text-left mb-8">
                <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-loi)] mb-3">
                  Các từ cần ôn lại
                </p>
                <ul className="space-y-2">
                  {danhSachSai.map((item) => (
                    <li
                      key={item.id}
                      className="border border-[var(--mau-loi)]/25 bg-[var(--mau-loi)]/5 rounded-lg px-4 py-3"
                    >
                      <p className="font-semibold text-[var(--mau-chu)]">
                        {item.cauHoi}
                      </p>
                      <p className="text-sm text-[var(--mau-chu-phu)] mt-1">
                        Đáp án đúng:{" "}
                        <span className="font-medium text-[var(--mau-chinh)]">
                          {item.dapAnDung}
                        </span>
                      </p>
                      {item.cauTraLoi && (
                        <p className="text-sm text-[var(--mau-chu-phu)] mt-0.5">
                          Bạn gõ:{" "}
                          <span className="font-medium text-[var(--mau-loi)]">
                            {item.cauTraLoi}
                          </span>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                type="button"
                onClick={lamLai}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
              >
                Làm lại
              </button>
              <Link
                to={`/decks/${boId}`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors text-center"
              >
                Quay lại bộ từ
              </Link>
              <Link
                to={`/decks/${boId}/flashcard`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors text-center"
              >
                Ôn bằng Flashcard
              </Link>
            </div>
          </section>
        </div>
      </>
    );
  }

  // ========== MAN HINH CHINH ==========
  const theHienTai = danhSachThe[chiSo];
  const cauHoi = layCauHoi(theHienTai);
  const dapAnDung = layDapAnDung(theHienTai);
  const tienDo = ((chiSo + 1) / danhSachThe.length) * 100;

  return (
    <>
      <RewardTikTokEffect
        active={batReward && hienReward}
        lanKichHoat={lanReward}
        config={CAU_HINH_REWARD_QUIZ}
      />
      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to={`/decks/${boId}`}
            className="text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
          >
            &larr; {bo.title}
          </Link>
          <button
            type="button"
            aria-pressed={batReward}
            onClick={doiCheDoReward}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] ${batReward
              ? "border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/10 text-[var(--mau-chinh)]"
              : "border-[var(--mau-vien)] text-[var(--mau-chu-phu)]"
              }`}
          >
            Reward {batReward ? "Bật" : "Tắt"}
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <label
            htmlFor="moc-reward-tuluan"
            className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)]"
          >
            Số câu đúng để có phần thưởng
          </label>
          <input
            id="moc-reward-tuluan"
            type="number"
            min="1"
            value={soCauDungNhanThuong}
            onChange={capNhatMocReward}
            className="w-full sm:w-24 rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-input)] px-3 py-2 text-sm text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
          />
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)]">
              Câu {chiSo + 1}/{danhSachThe.length}
            </span>
            <span className="text-right text-xs font-mono uppercase tracking-wider text-[var(--mau-chinh)]">
              {cheDoHienTai.nhan}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--mau-mat-2)] overflow-hidden border border-[var(--mau-vien)]">
            <div
              className="h-full rounded-full bg-[var(--mau-chinh)] transition-all duration-200"
              style={{ width: `${tienDo}%` }}
            />
          </div>
        </div>

        {/* Cau hoi */}
        <section className="text-center mb-7 rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-5 py-8 shadow-[var(--bong-card)] sm:py-9">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-4">
            {cheDoHienTai.labelCauHoi}
          </p>
          <h2 className="break-words text-3xl font-semibold leading-relaxed text-[var(--mau-chu)] sm:text-4xl">
            {cauHoi}
          </h2>
        </section>

        {/* Form nhap dap an */}
        <form onSubmit={kiemTraDapAn} className="mb-6">
          <label
            htmlFor="cau-tra-loi"
            className="block text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-2"
          >
            {cheDoHienTai.labelTraLoi}
          </label>
          <input
            ref={inputRef}
            id="cau-tra-loi"
            type="text"
            value={cauTraLoi}
            onChange={(e) => setCauTraLoi(e.target.value)}
            disabled={daKiemTra}
            autoComplete="off"
            spellCheck="false"
            placeholder="Nhập câu trả lời..."
            className={`w-full rounded-lg border px-4 py-3.5 text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] disabled:opacity-70 disabled:cursor-default transition-colors ${daKiemTra && ketQuaDung
              ? "border-[var(--mau-thanh-cong)] bg-[var(--mau-thanh-cong)]/5"
              : daKiemTra && !ketQuaDung
                ? "border-[var(--mau-loi)] bg-[var(--mau-loi)]/5"
                : "border-[var(--mau-vien)] bg-[var(--mau-input)]"
              }`}
          />
          {!daKiemTra && (
            <div className="flex gap-2 mt-3 justify-end">
              <button
                type="button"
                onClick={boQua}
                className="px-5 py-2.5 rounded-lg border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
              >
                Bỏ qua
              </button>
              <button
                type="submit"
                disabled={!cauTraLoi.trim()}
                className="px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
              >
                Kiểm tra
              </button>
            </div>
          )}
        </form>

        {/* Feedback */}
        {daKiemTra && (
          <div className="text-center mb-6">
            {ketQuaDung ? (
              <p className="text-sm font-medium text-[var(--mau-thanh-cong)] mb-4">
                ✓ Chính xác! Câu tiếp theo nhé...
              </p>
            ) : (
              <div className="mb-4">
                <p className="text-sm font-medium text-[var(--mau-loi)] mb-2">
                  ✗ Chưa đúng
                </p>
                <p className="text-sm text-[var(--mau-chu-phu)]">
                  Đáp án đúng:{" "}
                  <span className="font-semibold text-[var(--mau-chinh)]">
                    {dapAnDung}
                  </span>
                </p>
              </div>
            )}

            {!ketQuaDung && (
              <button
                type="button"
                onClick={sangCauTiepTheo}
                className="px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
              >
                {chiSo + 1 >= danhSachThe.length ? "Xem kết quả" : "Câu tiếp theo →"}
              </button>
            )}
          </div>
        )}

        {/* Diem hien tai */}
        <div className="flex items-center justify-center gap-6 text-sm text-[var(--mau-chu-phu)] border-t border-[var(--mau-vien)]/60 pt-5">
          <span>
            Đúng:{" "}
            <span className="font-mono font-bold text-[var(--mau-thanh-cong)]">
              {soCauDung}
            </span>
          </span>
          <span>
            Sai:{" "}
            <span className="font-mono font-bold text-[var(--mau-loi)]">
              {danhSachKetQua.filter((item) => !item.dung).length}
            </span>
          </span>
        </div>
      </div>
    </>
  );
}

export default TrangTuLuan;
