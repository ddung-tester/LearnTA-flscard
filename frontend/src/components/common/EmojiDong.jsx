import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { kyTuEmoji, timEmoji } from "../../utils/timEmoji";
import { taiLottie, taiThuVienLottie } from "../../utils/taiEmoji";

const Lottie = lazy(taiThuVienLottie);

/**
 * EmojiDong — hình minh hoạ động cho một từ tiếng Anh (Noto Emoji Animation, © Google, CC BY 4.0).
 * Từ không có trong bảng ghép thì không vẽ gì. Đang tải / lỗi mạng: hiện emoji chữ của máy.
 * Giảm chuyển động: đứng yên ở khung đầu.
 */
function EmojiDong({ tu, className = "" }) {
  const ma = useMemo(() => timEmoji(tu), [tu]);
  const giamChuyenDong = useReducedMotion();
  const [daTai, setDaTai] = useState({ ma: null, json: null });

  useEffect(() => {
    if (!ma) return undefined;
    let daHuy = false;
    taiLottie(ma)
      .then((json) => {
        if (!daHuy) setDaTai({ ma, json });
      })
      .catch(() => {});
    return () => {
      daHuy = true;
    };
  }, [ma]);

  if (!ma) return null;
  const json = daTai.ma === ma ? daTai.json : null;
  const kyTu = <span className="ui-emoji-dong__ky-tu">{kyTuEmoji(ma)}</span>;

  return (
    <span className={`ui-emoji-dong ${className}`} aria-hidden="true" title="Noto Emoji © Google · CC BY 4.0">
      {json ? (
        <Suspense fallback={kyTu}>
          <Lottie animationData={json} loop autoplay={!giamChuyenDong} className="ui-emoji-dong__hinh" />
        </Suspense>
      ) : (
        kyTu
      )}
    </span>
  );
}

export default EmojiDong;
