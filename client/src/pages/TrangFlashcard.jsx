import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { layBoTheoId, layTheoBoId } from "../data/duLieuMau";
import { luuTienDoFlashcard } from "../utils/tienDoHocTap";

const DS_CHE_DO = [
  {
    key: "en-vi",
    nhan: "English → Vietnamese",
    matTruoc: "ENGLISH",
    matSau: "VIETNAMESE",
  },
  {
    key: "vi-en",
    nhan: "Vietnamese → English",
    matTruoc: "VIETNAMESE",
    matSau: "ENGLISH",
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
  const bo = layBoTheoId(boId);
  const danhSach = layTheoBoId(boId);

  const [chiSo, setChiSo] = useState(0);
  const [daLat, setDaLat] = useState(false);
  const [cheDo, setCheDo] = useState("en-vi");
  const [ketQua, setKetQua] = useState({});
  const [daKetThuc, setDaKetThuc] = useState(false);

  const cheDoHienTai = DS_CHE_DO.find((item) => item.key === cheDo) ?? DS_CHE_DO[0];

  const thongKe = useMemo(() => {
    const danhSachKetQua = Object.values(ketQua);
    const soDaNho = danhSachKetQua.filter((ketQuaThe) => ketQuaThe === "remembered").length;
    const soCanOn = danhSachKetQua.filter((ketQuaThe) => ketQuaThe === "review").length;

    return {
      soDaNho,
      soCanOn,
      soConLai: Math.max(0, danhSach.length - danhSachKetQua.length),
      soDaHoc: danhSachKetQua.length,
    };
  }, [danhSach.length, ketQua]);

  function latThe() {
    if (daKetThuc) return;
    setDaLat((dangLat) => !dangLat);
  }

  function diChuyen(buoc) {
    if (daKetThuc) return;

    setChiSo((chiSoHienTai) => {
      const chiSoMoi = chiSoHienTai + buoc;
      if (chiSoMoi < 0 || chiSoMoi >= danhSach.length) return chiSoHienTai;
      return chiSoMoi;
    });
    setDaLat(false);
  }

  function datCheDo(key) {
    setCheDo(key);
    setDaLat(false);
  }

  function danhDauThe(trangThai) {
    const the = danhSach[chiSo];
    if (!the) return;

    const ketQuaMoi = {
      ...ketQua,
      [the.id]: trangThai,
    };

    setKetQua(ketQuaMoi);
    setDaLat(false);

    const daHocTatCa = Object.keys(ketQuaMoi).length >= danhSach.length;
    if (daHocTatCa) {
      const danhSachKetQua = Object.values(ketQuaMoi);
      luuTienDoFlashcard(boId, {
        remembered: danhSachKetQua.filter((ketQuaThe) => ketQuaThe === "remembered").length,
        review: danhSachKetQua.filter((ketQuaThe) => ketQuaThe === "review").length,
        total: danhSach.length,
      });
      setDaKetThuc(true);
      return;
    }

    if (chiSo < danhSach.length - 1) {
      setChiSo(chiSo + 1);
      return;
    }

    const chiSoChuaHoc = danhSach.findIndex((item) => !ketQuaMoi[item.id]);
    if (chiSoChuaHoc >= 0) {
      setChiSo(chiSoChuaHoc);
    }
  }

  function hocLai() {
    setChiSo(0);
    setDaLat(false);
    setKetQua({});
    setDaKetThuc(false);
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

  if (danhSach.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-3">
          Flashcard
        </p>
        <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-3">
          Bộ từ này chưa có từ nào
        </h2>
        <p className="text-[var(--mau-chu-phu)] mb-6">
          Thêm một vài cặp từ Anh Việt trước khi bắt đầu học flashcard.
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

  if (daKetThuc) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link
          to={`/decks/${boId}`}
          className="text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
        >
          &larr; {bo.title}
        </Link>

        <section className="mt-6 border border-[var(--mau-vien)] rounded-xl bg-[var(--mau-mat)] px-5 py-8 text-center shadow-[var(--bong-card)]">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chinh)] mb-3">
            Hoàn thành phiên học
          </p>
          <h2 className="text-2xl font-semibold text-[var(--mau-chu)] mb-2">
            Bạn đã ôn hết {danhSach.length} thẻ
          </h2>
          <p className="text-[var(--mau-chu-phu)] max-w-md mx-auto">
            Đây là tóm tắt nhanh của phiên này. Streak Drop sẽ là lớp thưởng trong giai đoạn sau.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-8 text-left">
            <div className="border border-[var(--mau-vien)] rounded-lg px-4 py-3">
              <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
                Tổng thẻ
              </p>
              <p className="text-2xl font-mono font-bold text-[var(--mau-chu)]">
                {danhSach.length}
              </p>
            </div>
            <div className="border border-[var(--mau-thanh-cong)]/30 bg-[var(--mau-thanh-cong)]/5 rounded-lg px-4 py-3">
              <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
                Nhớ rồi
              </p>
              <p className="text-2xl font-mono font-bold text-[var(--mau-thanh-cong)]">
                {thongKe.soDaNho}
              </p>
            </div>
            <div className="border border-[var(--mau-phu)]/35 bg-[var(--mau-phu)]/10 rounded-lg px-4 py-3">
              <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
                Chưa nhớ
              </p>
              <p className="text-2xl font-mono font-bold text-[var(--mau-phu)]">
                {thongKe.soCanOn}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={hocLai}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
            >
              Học lại
            </button>
            <Link
              to={`/decks/${boId}`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
            >
              Quay lại bộ từ
            </Link>
            <Link
              to={`/decks/${boId}/quiz`}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[var(--mau-vien)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
            >
              Làm Quiz
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const theHienTai = danhSach[chiSo];
  const matTruoc = cheDo === "en-vi" ? theHienTai.term_en : theHienTai.meaning_vi;
  const matSau = cheDo === "en-vi" ? theHienTai.meaning_vi : theHienTai.term_en;
  const trangThaiThe = ketQua[theHienTai.id];

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        to={`/decks/${boId}`}
        className="text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] transition-colors"
      >
        &larr; {bo.title}
      </Link>

      <div className="mt-4 mb-5">
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-2">
          Chế độ học
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DS_CHE_DO.map((item) => {
            const dangChon = cheDo === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => datCheDo(item.key)}
                aria-pressed={dangChon}
                className={`text-left rounded-lg border px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors ${dangChon
                    ? "border-[var(--mau-chinh)] bg-[var(--mau-mat-2)] text-[var(--mau-chu)]"
                    : "border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 hover:bg-[var(--mau-mat-hover)]"
                  }`}
              >
                <span className="block text-xs font-mono uppercase tracking-wider">
                  {item.nhan}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)]">
          {chiSo + 1} / {danhSach.length}
        </span>
        <span className="text-right text-xs font-mono uppercase tracking-wider text-[var(--mau-chinh)]">
          {cheDoHienTai.nhan}
        </span>
      </div>

      <div className="[perspective:1200px] mb-5">
        <button
          type="button"
          onClick={latThe}
          aria-pressed={daLat}
          className="relative w-full aspect-[3/2] min-h-56 sm:min-h-72 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
        >
          <div
            className={`absolute inset-0 rounded-xl transition-transform duration-300 [transform-style:preserve-3d] ${daLat ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"
              }`}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-[var(--mau-vien)] bg-[var(--mau-mat)] px-4 py-6 shadow-[var(--bong-card)] [backface-visibility:hidden] hover:bg-[var(--mau-mat-hover)] transition-colors sm:px-7 sm:py-8">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-8">
                {cheDoHienTai.matTruoc}
              </span>
              <span className="max-w-full break-words text-center text-2xl font-semibold leading-relaxed text-[var(--mau-chu)] sm:text-3xl">
                {matTruoc}
              </span>
              <span className="text-xs text-[var(--mau-chu-phu)] mt-8">
                Click hoặc nhấn Space để lật thẻ
              </span>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-[var(--mau-chinh)]/35 bg-[var(--mau-mat-2)] px-4 py-6 shadow-[var(--bong-card)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:px-7 sm:py-8">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chinh)] mb-8">
                {cheDoHienTai.matSau}
              </span>
              <span className="max-w-full break-words text-center text-2xl font-semibold leading-relaxed text-[var(--mau-chu)] sm:text-3xl">
                {matSau}
              </span>
              {theHienTai.example_sentence && (
                <p className="mt-6 max-w-md break-words text-center text-sm italic text-[var(--mau-chu-phu)]">
                  {theHienTai.example_sentence}
                </p>
              )}
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 mb-5">
        <div className="border border-[var(--mau-thanh-cong)]/30 bg-[var(--mau-thanh-cong)]/5 rounded-lg px-3 py-3 sm:px-4">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
            Nhớ rồi
          </p>
          <p className="text-xl font-mono font-bold text-[var(--mau-thanh-cong)]">
            {thongKe.soDaNho}
          </p>
        </div>
        <div className="border border-[var(--mau-phu)]/35 bg-[var(--mau-phu)]/10 rounded-lg px-3 py-3 sm:px-4">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
            Chưa nhớ
          </p>
          <p className="text-xl font-mono font-bold text-[var(--mau-phu)]">
            {thongKe.soCanOn}
          </p>
        </div>
        <div className="border border-[var(--mau-vien)] rounded-lg bg-[var(--mau-mat)] px-3 py-3 sm:px-4">
          <p className="text-xs font-mono uppercase tracking-wider text-[var(--mau-chu-phu)] mb-1">
            Còn lại
          </p>
          <p className="text-xl font-mono font-bold text-[var(--mau-chu)]">
            {thongKe.soConLai}
          </p>
        </div>
      </div>

      {daLat && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => danhDauThe("remembered")}
            className="px-5 py-3 rounded-lg bg-[var(--mau-chinh)] text-[var(--mau-chu-tren-chinh)] font-semibold hover:bg-[var(--mau-chinh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
          >
            Nhớ rồi
          </button>
          <button
            type="button"
            onClick={() => danhDauThe("review")}
            className="px-5 py-3 rounded-lg border border-[var(--mau-phu)] bg-[var(--mau-phu)]/10 text-[var(--mau-chu)] font-medium hover:bg-[var(--mau-phu)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-phu)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
          >
            Chưa nhớ
          </button>
        </div>
      )}

      {trangThaiThe && (
        <p className="text-sm text-center text-[var(--mau-chu-phu)] mb-5">
          Thẻ này đã được đánh dấu:{" "}
          <span className={trangThaiThe === "remembered" ? "text-[var(--mau-thanh-cong)]" : "text-[var(--mau-phu)]"}>
            {trangThaiThe === "remembered" ? "Nhớ rồi" : "Chưa nhớ"}
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => diChuyen(-1)}
          disabled={chiSo === 0}
          className="w-full rounded-lg border border-[var(--mau-vien)] px-4 py-3 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          &larr; Trước
        </button>
        <button
          type="button"
          onClick={() => diChuyen(1)}
          disabled={chiSo === danhSach.length - 1}
          className="w-full rounded-lg border border-[var(--mau-vien)] px-4 py-3 text-sm text-[var(--mau-chu-phu)] hover:text-[var(--mau-chu)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors"
        >
          Sau &rarr;
        </button>
      </div>
    </div>
  );
}

export default TrangFlashcard;
