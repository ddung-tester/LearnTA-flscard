/**
 * GachVeTay — nét gạch chân vẽ tay (bút mực đỏ lề vở) đặt trong tiêu đề trang.
 * Tiêu đề chứa nó cần class `ui-tieu-de-ve-tay`. Nét được vẽ dần khi trang vừa hiện
 * (xem styles/hieu-ung.css), giảm chuyển động thì hiện sẵn.
 */
function GachVeTay() {
  return (
    <svg className="ui-gach-ve-tay" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength="1" d="M2 9.5C38 5.5 74 11 112 7s62-3.5 86-.5" />
      <path pathLength="1" d="M14 12.5c46-3 104-2 168-3.5" />
    </svg>
  );
}

export default GachVeTay;
