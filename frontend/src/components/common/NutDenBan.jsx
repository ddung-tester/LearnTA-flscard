import { useSyncExternalStore } from "react";
import { datGiaoDien, layGiaoDien, theoDoiGiaoDien } from "../../utils/giaoDien";
import { phatAm } from "../../utils/amThanh";

/** Nút đèn bàn trên header: bật/tắt chế độ tối "đèn bàn học" (lưu trên máy này). */
function NutDenBan() {
  const dangBat = useSyncExternalStore(theoDoiGiaoDien, layGiaoDien, () => "sang") === "den-ban";

  function doi() {
    datGiaoDien(dangBat ? "sang" : "den-ban");
    phatAm("congTac");
  }

  return (
    <button
      type="button"
      onClick={doi}
      aria-pressed={dangBat}
      aria-label={dangBat ? "Tắt đèn bàn (giao diện sáng)" : "Bật đèn bàn (giao diện tối)"}
      title={dangBat ? "Giao diện sáng" : "Đèn bàn học (tối)"}
      className="ui-icon-action dash-nav__am-thanh dash-nav__den-ban"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Đèn bàn: chân, cần, chao đèn; bật thì có tia sáng */}
        <path d="M5 21h9" />
        <path d="M9 21 7 13l5-5" />
        <path d="m10.5 6.5 5-3 4 6-5.5 1.5z" fill={dangBat ? "currentColor" : "none"} />
        {dangBat && <path d="M15 13.5 14 16m3.5-3 1.5 2m.5-4.5 2.5.5" />}
      </svg>
    </button>
  );
}

export default NutDenBan;
