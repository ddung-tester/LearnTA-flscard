/**
 * TheTrangThaiPhien — thẻ giữa màn hình cho trạng thái đang tải / lỗi / rỗng của trang học.
 * children: các nút hành động.
 */
export default function TheTrangThaiPhien({ eyebrow, tieuDe, moTa, children }) {
  return (
    <div className="ui-study-empty-wrap">
      <section className="ui-study-empty-card">
        {eyebrow && <p className="ui-study-empty-card__eyebrow">{eyebrow}</p>}
        <h2 className="ui-study-empty-card__title">{tieuDe}</h2>
        {moTa && <p className="ui-study-empty-card__copy">{moTa}</p>}
        {children && <div className="ui-study-empty-card__actions">{children}</div>}
      </section>
    </div>
  );
}
