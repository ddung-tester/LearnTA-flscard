import { useCallback, useEffect, useRef } from "react";
import { banPhaoGiay, rungMay } from "../../utils/hieuUng";
import { phatAm } from "../../utils/amThanh";
import { chiSoTuPhim } from "../../utils/phienHoc";
import useNetBut from "../../hooks/useNetBut";
import ThanhTiepTuc from "./ThanhTiepTuc";

// Chọn sai: gạch đáp án đã chọn, khoanh đáp án đúng (sau khi nút lắc xong)
const NET_DAP_AN_DUNG = { type: "circle", color: "#2f8a4c", treMs: 480, padding: 7 };
const NET_DAP_AN_SAI = { type: "strike-through", color: "#c2412d", treMs: 380, padding: 2 };

function ChuDapAn({ net, children }) {
  const ref = useRef(null);
  useNetBut(ref, Boolean(net), net ?? {});
  return (
    <span ref={ref} className="break-words">
      {children}
    </span>
  );
}

function laVungNhapLieu(el) {
  return Boolean(el?.closest?.("input, textarea, select, [contenteditable='true']"));
}

/**
 * DanhSachDapAn — các nút đáp án trắc nghiệm dùng chung (Trắc nghiệm, Ngữ cảnh, Hỗn hợp).
 * Sau khi chọn: tô đáp án đúng, đánh dấu đáp án đã chọn nếu sai, làm mờ phần còn lại.
 * Phím 1–N chọn đáp án. Đúng: pháo giấy bắn từ nút + rung nhẹ; sai: rung + nét bút gạch/khoanh.
 */
export default function DanhSachDapAn({
  danhSachDapAn,
  dapAnDung,
  dapAnDaChon,
  onChon,
  dangRoiDi = false,
  khoa,
  // Trang cha chưa tự phát tiếng "đúng" (Quiz/Tự luận đã có tiếng riêng)
  coAmDung = false,
}) {
  const daTraLoi = dapAnDaChon !== null;
  const nutDungRef = useRef(null);
  const danhSachRef = useRef(null);

  // Bỏ focus khỏi nút đáp án trước khi chọn: nút đang focus mà bị disabled trong lúc commit thì Chrome phải
  // tính style ngay, rồi React "khôi phục focus" bằng cách đọc scroll của mọi phần tử cha — ép layout cả trang
  // đúng lúc vừa chèn khối phản hồi (khựng ~40ms trên điện thoại). Kết quả cuối như cũ: nút disabled vốn mất focus.
  const chon = useCallback(
    (dapAn) => {
      const dangFocus = document.activeElement;
      if (dangFocus instanceof HTMLElement && danhSachRef.current?.contains(dangFocus)) dangFocus.blur();
      onChon(dapAn);
    },
    [onChon]
  );

  useEffect(() => {
    if (daTraLoi || dangRoiDi) return undefined;

    function xuLyPhim(event) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (laVungNhapLieu(event.target)) return;
      const chiSo = chiSoTuPhim(event.key, danhSachDapAn.length);
      if (chiSo < 0) return;
      event.preventDefault();
      chon(danhSachDapAn[chiSo]);
    }

    window.addEventListener("keydown", xuLyPhim);
    return () => window.removeEventListener("keydown", xuLyPhim);
  }, [daTraLoi, dangRoiDi, danhSachDapAn, chon]);

  useEffect(() => {
    if (!daTraLoi) return;
    if (dapAnDaChon === dapAnDung) {
      banPhaoGiay(nutDungRef.current, "nho");
      rungMay("dung");
      if (coAmDung) phatAm("dung");
    } else {
      rungMay("sai");
      phatAm("sai");
    }
  }, [daTraLoi, dapAnDaChon, dapAnDung, coAmDung]);

  return (
    <div
      ref={danhSachRef}
      className={`ui-question-flow ui-quiz-answer-list space-y-3 mb-6 ${dangRoiDi ? "ui-question-flow--leaving" : ""}`}
    >
      {danhSachDapAn.map((dapAn, index) => {
        const laDapAnDaChon = dapAn === dapAnDaChon;
        const laDapAnDung = dapAn === dapAnDung;

        let lopTrangThai =
          "border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu)] hover:border-[var(--mau-chinh)]/40 hover:bg-[var(--mau-mat-hover)]";

        if (daTraLoi) {
          if (laDapAnDung) {
            lopTrangThai = "ui-answer-correct text-[var(--mau-chu)]";
          } else if (laDapAnDaChon) {
            lopTrangThai = "ui-answer-wrong text-[var(--mau-chu)]";
          } else {
            lopTrangThai = "border-[var(--mau-vien)] bg-[var(--mau-mat)] text-[var(--mau-chu-phu)] opacity-50";
          }
        }

        return (
          <button
            key={`${khoa}-${index}-${dapAn}`}
            ref={laDapAnDung ? nutDungRef : undefined}
            style={{ "--thu-tu": index }}
            type="button"
            onClick={() => chon(dapAn)}
            disabled={daTraLoi}
            className={`ui-reading-card ui-dap-an-3d min-h-12 w-full rounded-lg border px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] transition-colors ${lopTrangThai}`}
          >
            <kbd className="ui-answer-phim" aria-hidden="true">
              {index + 1}
            </kbd>
            <ChuDapAn
              net={
                daTraLoi && dapAnDaChon !== dapAnDung
                  ? laDapAnDung
                    ? NET_DAP_AN_DUNG
                    : laDapAnDaChon
                      ? NET_DAP_AN_SAI
                      : null
                  : null
              }
            >
              {dapAn}
            </ChuDapAn>
            {daTraLoi && (laDapAnDung || laDapAnDaChon) && (
              <svg
                className="ui-answer-dau"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                role="img"
                aria-label={laDapAnDung ? "Đáp án đúng" : "Đáp án bạn chọn, chưa đúng"}
              >
                {laDapAnDung ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * PhanHoiSaiTracNghiem — thông báo đáp án đúng sau khi chọn sai, kèm nút Tiếp tục
 * (điện thoại: thanh dính đáy). tuChuyenMs: trang tự chuyển câu sau chừng này → hiện vạch đếm ngược.
 */
export function PhanHoiSaiTracNghiem({ dapAnDung, onTiepTuc, tuChuyenMs = 0 }) {
  return (
    <div className="ui-feedback-pop ui-quiz-feedback mt-4 mb-6">
      <ThanhTiepTuc dung={false} onTiepTuc={onTiepTuc} demNguocMs={tuChuyenMs}>
        <span className="ui-thanh-tiep-tuc__nhan">Chưa đúng</span>
        <span className="ui-thanh-tiep-tuc__dap-an">
          Đáp án: <strong>{dapAnDung}</strong>
        </span>
      </ThanhTiepTuc>
    </div>
  );
}
