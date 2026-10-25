import { Link } from "react-router-dom";

// Icon nét (24×24, cùng nét với icon khác của app), không dùng emoji
const ICON = {
  "/dashboard": (
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  ),
  "/khoa-hoc": (
    <>
      <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
    </>
  ),
  "/decks": (
    <>
      <rect x="3" y="7" width="14" height="14" rx="2" />
      <path d="M7 3h12a2 2 0 0 1 2 2v12" />
    </>
  ),
  "/review": (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
};

/**
 * ThanhTabDay — 4 mục chính ở đáy màn trên điện thoại (≤640px, đã đăng nhập, ngoài trang học):
 * ngón cái với tới, header gọn một hàng. Cùng danh sách tab và luật "đang mở" với menu trên header.
 */
export default function ThanhTabDay({ dsTab, laTabDangMo, soTuDenHan }) {
  return (
    <nav className="thanh-tab-day" aria-label="Điều hướng chính">
      {dsTab.map((tab) => {
        const dangMo = laTabDangMo(tab);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={dangMo ? "page" : undefined}
            className={`thanh-tab-day__muc${dangMo ? " thanh-tab-day__muc--mo" : ""}`}
          >
            <span className="thanh-tab-day__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {ICON[tab.to]}
              </svg>
              {tab.coSoDenHan && soTuDenHan > 0 && (
                <span className="thanh-tab-day__so">{soTuDenHan > 99 ? "99+" : soTuDenHan}</span>
              )}
            </span>
            <span className="thanh-tab-day__nhan">
              {tab.nhan}
              {tab.coSoDenHan && soTuDenHan > 0 && <span className="sr-only"> ({soTuDenHan} mục đến hạn ôn)</span>}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
