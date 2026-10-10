import { Component } from "react";
import { baoLoi, laLoiTaiFileJs } from "../../utils/baoLoi";

/**
 * LoiGiaoDien — chặn lỗi render (và lỗi tải trang) để không thành trang trắng:
 * hiện khung báo lỗi gọn với nút tải lại, đồng thời gửi lỗi về server.
 */
export default class LoiGiaoDien extends Component {
  state = { loi: null };

  static getDerivedStateFromError(loi) {
    return { loi };
  }

  componentDidCatch(loi, info) {
    baoLoi("render", loi, info?.componentStack || "");
  }

  render() {
    if (!this.state.loi) return this.props.children;
    const banMoi = laLoiTaiFileJs(this.state.loi);
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <section className="ui-form-panel max-w-md text-center" role="alert">
          <h1 className="text-xl font-bold">{banMoi ? "Ứng dụng vừa được cập nhật" : "Có lỗi xảy ra"}</h1>
          <p className="mt-2 text-[var(--mau-chu-phu)]">
            {banMoi
              ? "Tải lại trang để dùng bản mới nhất."
              : "Trang gặp lỗi ngoài ý muốn. Tải lại trang để tiếp tục; kết quả học đã lưu không bị mất."}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              className="ui-button ui-button--primary rounded-xl px-5 py-2.5 font-semibold"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
            <a className="ui-button ui-button--ghost rounded-xl px-5 py-2.5 font-semibold" href="/">
              Về trang chủ
            </a>
          </div>
        </section>
      </div>
    );
  }
}
