import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import RewardTikTokEffect, {
  CAU_HINH_REWARD_QUIZ,
} from "../components/RewardTikTokEffect";
import { layBoTheoId, layTheoBoId } from "../data/duLieuMau";
import { luuTienDoQuiz } from "../utils/tienDoHocTap";

function tronMang(danhSach) {
  return [...danhSach].sort(() => Math.random() - 0.5);
}

function taoDanhSachCauHoi(danhSachThe) {
  if (!danhSachThe || danhSachThe.length < 4) return [];

  return danhSachThe.map((the) => {
    const dapAnDung = the.meaning_vi;
    const dapAnNhieu = tronMang(
      danhSachThe
        .filter((theKhac) => theKhac.id !== the.id)
        .map((theKhac) => theKhac.meaning_vi)
    ).slice(0, 3);

    return {
      id: the.id,
      cauHoi: the.term_en,
      dapAnDung,
      danhSachDapAn: tronMang([dapAnDung, ...dapAnNhieu]),
    };
  });
}

function TrangQuiz() {
  const { deckId } = useParams();
  const boId = Number(deckId);
  const bo = layBoTheoId(boId);
  const danhSachThe = layTheoBoId(boId);

  const [lanLam, setLanLam] = useState(0);
  const [chiSo, setChiSo] = useState(0);
  const [dapAnDaChon, setDapAnDaChon] = useState(null);
  const [soCauDung, setSoCauDung] = useState(0);
  const [daHoanThanh, setDaHoanThanh] = useState(false);
  const [hienReward, setHienReward] = useState(false);
  const [diemRewardGanNhat, setDiemRewardGanNhat] = useState(0);
  const [lanReward, setLanReward] = useState(0);
  const [batReward, setBatReward] = useState(true);
  const [soCauDungNhanThuong, setSoCauDungNhanThuong] = useState(
    CAU_HINH_REWARD_QUIZ.triggerCount
  );

  const danhSachCauHoi = useMemo(
    () => taoDanhSachCauHoi(danhSachThe),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boId, lanLam]
  );

  function lamLai() {
    setLanLam((giaTri) => giaTri + 1);
    setChiSo(0);
    setDapAnDaChon(null);
    setSoCauDung(0);
    setDaHoanThanh(false);
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

  function chonDapAn(dapAn) {
    if (dapAnDaChon !== null) return;

    setDapAnDaChon(dapAn);
    if (dapAn === danhSachCauHoi[chiSo].dapAnDung) {
      setSoCauDung((diemHienTai) => {
        const diemMoi = diemHienTai + 1;

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
  }

  function sangCauTiepTheo() {
    if (chiSo + 1 >= danhSachCauHoi.length) {
      setDaHoanThanh(true);
      return;
    }

    setChiSo((chiSoHienTai) => chiSoHienTai + 1);
    setDapAnDaChon(null);
  }

  useEffect(() => {
    if (dapAnDaChon === null || daHoanThanh) return undefined;

    const timer = setTimeout(() => {
      sangCauTiepTheo();
    }, 2000);

    return () => clearTimeout(timer);
  }, [dapAnDaChon, daHoanThanh]);

  useEffect(() => {
    if (!bo || !daHoanThanh || danhSachCauHoi.length === 0) return;

    luuTienDoQuiz(boId, {
      correct: soCauDung,
      review: danhSachCauHoi.length - soCauDung,
      total: danhSachCauHoi.length,
    });
  }, [bo, boId, daHoanThanh, danhSachCauHoi.length, soCauDung]);

  useEffect(() => {
    if (!hienReward) return undefined;

    const timer = setTimeout(() => {
      setHienReward(false);
    }, CAU_HINH_REWARD_QUIZ.duration);

    return () => clearTimeout(timer);
  }, [hienReward, lanReward]);

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
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          Quay về danh sách
        </Link>
      </div>
    );
  }

  if (danhSachThe.length < 4) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-3">
          Quiz trắc nghiệm
        </p>
        <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-3">
          Cần ít nhất 4 từ để làm quiz
        </h2>
        <p className="text-[var(--mau-chu-phu)] mb-6">
          Mỗi câu cần 1 đáp án đúng và 3 đáp án nhiễu.
        </p>
        <Link
          to={`/decks/${boId}`}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          Quay lại bộ từ
        </Link>
      </div>
    );
  }

  if (daHoanThanh) {
    const soCanOn = danhSachCauHoi.length - soCauDung;

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
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] ${
              batReward
                ? "border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/10 text-[var(--mau-chinh)]"
                : "border-[var(--mau-vien)] text-[var(--mau-chu-phu)]"
            }`}
          >
            Reward {batReward ? "Bật" : "Tắt"}
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <label
            htmlFor="moc-reward-summary"
            className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)]"
          >
            Số câu đúng để có phần thưởng
          </label>
          <input
            id="moc-reward-summary"
            type="number"
            min="1"
            value={soCauDungNhanThuong}
            onChange={capNhatMocReward}
            className="w-full sm:w-24 rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-nen)] px-3 py-2 text-sm text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
          />
        </div>

        <section className="mt-6 border border-[var(--mau-vien)] rounded-xl bg-[var(--mau-nen)] px-5 py-8 text-center">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chinh)] mb-3">
            Tổng kết quiz
          </p>
          <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-3">
            Bạn nhớ đúng {soCauDung}/{danhSachCauHoi.length} từ
          </h2>
          <p className="text-[var(--mau-chu-phu)] mb-8">
            Cần ôn lại:{" "}
            <span className="font-semibold text-[var(--mau-phu)]">
              {soCanOn} từ
            </span>
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={lamLai}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-white font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-opacity"
            >
              Làm lại
            </button>
            <Link
              to={`/decks/${boId}`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
            >
              Quay lại bộ từ
            </Link>
            <Link
              to={`/decks/${boId}/flashcard`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
            >
              Ôn bằng Flashcard
            </Link>
          </div>
        </section>
        </div>
      </>
    );
  }

  const cauHienTai = danhSachCauHoi[chiSo];
  const daTraLoi = dapAnDaChon !== null;
  const traLoiDung = dapAnDaChon === cauHienTai.dapAnDung;
  const tienDo = ((chiSo + 1) / danhSachCauHoi.length) * 100;

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
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] ${
            batReward
              ? "border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/10 text-[var(--mau-chinh)]"
              : "border-[var(--mau-vien)] text-[var(--mau-chu-phu)]"
          }`}
        >
          Reward {batReward ? "Bật" : "Tắt"}
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <label
          htmlFor="moc-reward"
          className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)]"
        >
          Số câu đúng để có phần thưởng
        </label>
        <input
          id="moc-reward"
          type="number"
          min="1"
          value={soCauDungNhanThuong}
          onChange={capNhatMocReward}
          className="w-full sm:w-24 rounded-lg border border-[var(--mau-vien)] bg-[var(--mau-nen)] px-3 py-2 text-sm text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
        />
      </div>

      <div className="mt-5 mb-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)]">
            Câu {chiSo + 1}/{danhSachCauHoi.length}
          </span>
          <span className="text-right text-xs font-mono uppercase tracking-wider text-[var(--mau-chinh)]">
            English → Vietnamese
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--mau-vien)]/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--mau-chinh)] transition-all duration-200"
            style={{ width: `${tienDo}%` }}
          />
        </div>
      </div>

      <section className="text-center mb-7 py-6 sm:py-7">
        <h2 className="break-words text-3xl font-semibold leading-relaxed text-[var(--mau-chu)] sm:text-4xl">
          {cauHienTai.cauHoi}
        </h2>
      </section>

      <div className="space-y-3 mb-6">
        {cauHienTai.danhSachDapAn.map((dapAn, index) => {
          const laDapAnDung = dapAn === cauHienTai.dapAnDung;
          const laDapAnNguoiDungChon = dapAn === dapAnDaChon;

          let lopTrangThai =
            "border-[var(--mau-vien)] text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 hover:bg-[var(--mau-chinh)]/[0.03]";

          if (daTraLoi && laDapAnDung) {
            lopTrangThai = "border-[var(--mau-chinh)] bg-[var(--mau-chinh)]/10 text-[var(--mau-chu)]";
          } else if (daTraLoi && laDapAnNguoiDungChon && !laDapAnDung) {
            lopTrangThai = "border-[var(--mau-phu)] bg-[var(--mau-phu)]/10 text-[var(--mau-chu)]";
          } else if (daTraLoi) {
            lopTrangThai = "border-[var(--mau-vien)] text-[var(--mau-chu-phu)] opacity-60";
          }

          return (
            <button
              key={`${cauHienTai.id}-${dapAn}`}
              type="button"
              onClick={() => chonDapAn(dapAn)}
              disabled={daTraLoi}
              className={`min-h-12 w-full rounded-lg border px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] disabled:cursor-default transition-colors ${lopTrangThai}`}
            >
              <span className="text-xs font-mono text-[var(--mau-chu-phu)] mr-3">
                {index + 1}
              </span>
              <span className="break-words">{dapAn}</span>
            </button>
          );
        })}
      </div>

      {daTraLoi && (
        <div className="text-center">
          <p
            className={`text-sm font-medium mb-4 ${
              traLoiDung ? "text-[var(--mau-chinh)]" : "text-[var(--mau-phu)]"
            }`}
          >
            {traLoiDung
              ? "Chính xác. Câu tiếp theo nhé..."
              : `Chưa đúng. Đáp án đúng là: ${cauHienTai.dapAnDung}`}
          </p>
        </div>
      )}
      </div>
    </>
  );
}

export default TrangQuiz;
