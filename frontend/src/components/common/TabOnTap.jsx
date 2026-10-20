import { Link, useLocation } from "react-router-dom";

// Ba nhóm việc của mục Ôn tập, cùng một hàng tab trên cả ba trang để chuyển qua lại một chạm
const CAC_NHOM = [
  { to: "/review", nhan: "Từ đến hạn" },
  { to: "/khoa-hoc/on-tap", nhan: "Câu bài tập sai" },
  { to: "/tu-sai", nhan: "Từ hay nhầm" },
];

/** TabOnTap — hàng tab chung của mục Ôn tập: Từ đến hạn · Câu bài tập sai · Từ hay nhầm */
export default function TabOnTap() {
  const { pathname } = useLocation();
  return (
    <nav className="ui-filter-tabs ui-filter-tabs--deck tab-on-tap" aria-label="Nhóm ôn tập">
      {CAC_NHOM.map((nhom) => (
        <Link
          key={nhom.to}
          to={nhom.to}
          className="ui-filter-tab"
          aria-current={pathname === nhom.to ? "page" : undefined}
          aria-pressed={pathname === nhom.to}
        >
          {nhom.nhan}
        </Link>
      ))}
    </nav>
  );
}
