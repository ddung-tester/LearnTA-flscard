import { useEffect, useState } from "react";
import { motion } from "motion/react";

const LOADING_REVEAL_DELAY_MS = 120;
// Trì hoãn nhỏ khi ẩn overlay: safety net cho double-rAF bridge,
// tránh flicker nếu data-loading key chưa kịp đăng ký trên thiết bị chậm.
const LOADING_HIDE_DELAY_MS = 50;

/**
 * PageLoadingOverlay — màn chờ khi chuyển trang: một thẻ từ vựng lật 3D liên tục (CSS thuần).
 * Giảm chuyển động: thẻ đứng yên (styles/hieu-ung.css).
 * treHien: đang có tờ giấy TheMoRong phủ màn hình thì chờ lâu hơn, trang tải nhanh sẽ không chớp màn chờ.
 */
function PageLoadingOverlay({ hienThi, treHien = LOADING_REVEAL_DELAY_MS }) {
  const [dangHienThi, setDangHienThi] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDangHienThi(hienThi);
    }, hienThi ? treHien : LOADING_HIDE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hienThi, treHien]);

  return (
    <motion.div
      className={`page-loading-overlay${dangHienThi ? " page-loading-overlay--visible" : ""}`}
      initial={false}
      animate={{ opacity: dangHienThi ? 1 : 0 }}
      transition={{
        duration: dangHienThi ? 0.16 : 0.14,
        ease: dangHienThi ? [0.16, 1, 0.3, 1] : [0.4, 0, 1, 1],
      }}
      aria-hidden={!dangHienThi}
    >
      <div className="page-loading-overlay__content">
        {/* Chỉ chạy animation khi overlay đang hiện */}
        {dangHienThi && (
          <div className="ui-the-cho" aria-hidden="true">
            <div className="ui-the-cho__lat">
              <span className="ui-the-cho__mat">Aa</span>
              <span className="ui-the-cho__mat ui-the-cho__mat--sau">Ăâ</span>
            </div>
          </div>
        )}
        <p className="page-loading-overlay__text">Đang tải...</p>
      </div>
    </motion.div>
  );
}

export default PageLoadingOverlay;
