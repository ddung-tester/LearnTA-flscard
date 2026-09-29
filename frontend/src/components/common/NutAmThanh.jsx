import { useSyncExternalStore } from "react";
import { amThanhDangBat, datAmThanh, phatAm, theoDoiAmThanh } from "../../utils/amThanh";

/** Nút loa trên header: bật/tắt mọi âm thanh hiệu ứng (lưu trên máy này). */
function NutAmThanh() {
  const dangBat = useSyncExternalStore(theoDoiAmThanh, amThanhDangBat, () => true);

  function doi() {
    datAmThanh(!dangBat);
    // Bật lại thì phát một tiếng nhỏ để người dùng biết đã có âm thanh
    if (!dangBat) phatAm("lat");
  }

  return (
    <button
      type="button"
      onClick={doi}
      aria-pressed={dangBat}
      aria-label={dangBat ? "Tắt âm thanh hiệu ứng" : "Bật âm thanh hiệu ứng"}
      title={dangBat ? "Tắt âm thanh" : "Bật âm thanh"}
      className="ui-icon-action dash-nav__am-thanh"
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
        <path d="M11 5 6 9H3v6h3l5 4z" />
        {dangBat ? (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        ) : (
          <path d="m16 9 5 6m0-6-5 6" />
        )}
      </svg>
    </button>
  );
}

export default NutAmThanh;
