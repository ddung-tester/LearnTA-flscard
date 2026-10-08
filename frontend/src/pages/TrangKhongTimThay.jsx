import { Link } from "react-router-dom";

export default function TrangKhongTimThay() {
  return (
    <div className="ui-study-empty-wrap">
      <section className="ui-study-empty-card">
        <h1 className="ui-study-empty-card__title">Không tìm thấy trang</h1>
        <p className="ui-study-empty-card__copy">Đường dẫn này không tồn tại hoặc đã thay đổi.</p>
        <div className="ui-study-empty-card__actions">
          <Link to="/" className="ui-button ui-button--primary ui-study-empty-card__button">Về trang chủ</Link>
          <Link to="/decks" className="ui-button ui-button--ghost ui-study-empty-card__button">Xem bộ từ</Link>
        </div>
      </section>
    </div>
  );
}
