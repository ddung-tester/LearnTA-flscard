import { Link, useSearchParams } from "react-router-dom";

// Ba nhóm việc của mục Ôn tập trong cùng trang /review (?loai=), chuyển qua lại một chạm.
// data-replace: đổi nhóm không thêm mục lịch sử — Back ra khỏi mục Ôn tập luôn
const CAC_NHOM = [
  { loai: null, to: "/review", nhan: "Từ đến hạn" },
  { loai: "cau", to: "/review?loai=cau", nhan: "Câu bài tập sai" },
  { loai: "nham", to: "/review?loai=nham", nhan: "Từ hay nhầm" },
];

/** TabOnTap — hàng tab chung của mục Ôn tập: Từ đến hạn · Câu bài tập sai · Từ hay nhầm */
export default function TabOnTap() {
  const [searchParams] = useSearchParams();
  const loaiDangMo = searchParams.get("loai");
  return (
    <nav className="ui-filter-tabs ui-filter-tabs--deck tab-on-tap" aria-label="Nhóm ôn tập">
      {CAC_NHOM.map((nhom) => {
        const dangMo = (loaiDangMo ?? null) === nhom.loai;
        return (
          <Link
            key={nhom.to}
            to={nhom.to}
            replace
            data-replace
            className="ui-filter-tab"
            aria-current={dangMo ? "page" : undefined}
            aria-pressed={dangMo}
          >
            {nhom.nhan}
          </Link>
        );
      })}
    </nav>
  );
}
