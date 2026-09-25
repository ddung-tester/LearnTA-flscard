import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useAuth } from "../contexts/AuthContext";

const THE_MAU = [
  {
    en: "deploy",
    vi: "triển khai",
    viDu: "We deploy to production every Friday.",
  },
  {
    en: "refactor",
    vi: "tái cấu trúc",
    viDu: "Refactor this function before adding new features.",
  },
  {
    en: "deadline",
    vi: "hạn chót",
    viDu: "The deadline for the release is next Monday.",
  },
  {
    en: "bug",
    vi: "lỗi phần mềm",
    viDu: "I found a bug in the login form.",
  },
];

// Vị trí từng tầng trong xấp: 0 là thẻ trên cùng
const VI_TRI_TANG = [
  { y: 0, rotate: -2, scale: 1 },
  { y: 16, rotate: 3.5, scale: 0.955 },
  { y: 30, rotate: -4.5, scale: 0.91 },
  { y: 42, rotate: 6, scale: 0.87 },
];

const NGUONG_NEM = 90;

/**
 * TheMau — một thẻ trong xấp demo ở trang chủ.
 * Lớp ngoài giữ vị trí tầng trong xấp, lớp trong nhận thao tác kéo.
 */
function TheMau({ the, tang, soThe, daLat, onLat, onNem, giam, daChiaXong, onChiaXong }) {
  const x = useMotionValue(0);
  const nghieng = useTransform(x, [-300, 0, 300], [-16, 0, 16]);
  const daKeoRef = useRef(false);
  const laTrenCung = tang === 0;
  const viTri = VI_TRI_TANG[tang] ?? VI_TRI_TANG[VI_TRI_TANG.length - 1];

  // Thẻ vừa bị ném xuống đáy xấp: trượt từ ngoài vào lại dưới xấp
  useEffect(() => {
    if (!laTrenCung && x.get() !== 0) {
      animate(x, 0, giam ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 26 });
    }
  }, [laTrenCung, giam, x]);

  function xuLyThaTay(_, info) {
    const doDoi = info.offset.x;
    const vanToc = info.velocity.x;
    const huong = doDoi < 0 ? -1 : 1;
    const duManh =
      Math.abs(doDoi) > NGUONG_NEM || (Math.abs(doDoi) > 40 && Math.abs(vanToc) > 600);

    if (!duManh) {
      animate(x, 0, { type: "spring", stiffness: 520, damping: 32 });
      return;
    }

    animate(x, huong * 460, giam ? { duration: 0 } : { duration: 0.28, ease: [0.4, 0, 0.7, 0.2] })
      .then(onNem);
  }

  return (
    <motion.div
      className="home-the"
      style={{ zIndex: soThe - tang }}
      initial={giam ? false : { y: 320, rotate: 0, scale: 0.9, opacity: 0 }}
      animate={{ ...viTri, opacity: 1 }}
      transition={
        giam
          ? { duration: 0 }
          : {
              type: "spring",
              stiffness: 240,
              damping: 26,
              // Lần đầu: chia thẻ từ đáy lên, mỗi thẻ cách nhau một nhịp
              delay: daChiaXong ? 0 : 0.25 + (soThe - 1 - tang) * 0.12,
            }
      }
      onAnimationComplete={laTrenCung && !daChiaXong ? onChiaXong : undefined}
    >
      <motion.div
        className="home-the__keo"
        style={{ x, rotate: giam ? 0 : nghieng }}
        drag={laTrenCung ? "x" : false}
        dragMomentum={false}
        whileDrag={giam ? undefined : { scale: 1.03 }}
        onPointerDown={() => {
          daKeoRef.current = false;
        }}
        onDragStart={() => {
          daKeoRef.current = true;
        }}
        onDragEnd={xuLyThaTay}
        onClickCapture={(event) => {
          if (daKeoRef.current) {
            event.stopPropagation();
            event.preventDefault();
            daKeoRef.current = false;
          }
        }}
      >
        <button
          type="button"
          className="home-the__nut"
          onClick={onLat}
          disabled={!laTrenCung}
          tabIndex={laTrenCung ? 0 : -1}
          aria-hidden={!laTrenCung}
          aria-pressed={laTrenCung ? daLat : undefined}
          aria-label={laTrenCung ? `Lật thẻ "${the.en}"` : undefined}
        >
          <motion.span
            className="home-the__lat"
            initial={false}
            animate={{ rotateY: laTrenCung && daLat ? 180 : 0 }}
            transition={giam ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 24 }}
          >
            <span className="fc-mat fc-mat--truoc home-the__mat">
              <span className="fc-mat__tu" lang="en">{the.en}</span>
            </span>
            <span className="fc-mat fc-mat--sau home-the__mat home-the__mat--sau">
              <span className="fc-mat__tu">{the.vi}</span>
              <span className="home-the__vi-du" lang="en">{the.viDu}</span>
            </span>
          </motion.span>
        </button>
      </motion.div>
    </motion.div>
  );
}

/**
 * TrangChu — cửa vào ứng dụng.
 * Điểm nhấn duy nhất: một xấp thẻ thật để thử lật và kéo, giống hệt trang Flashcard.
 */
function TrangChu() {
  const { isAuthenticated } = useAuth();
  const giam = useReducedMotion();
  const [thuTu, setThuTu] = useState(() => THE_MAU.map((_, i) => i));
  const [daLat, setDaLat] = useState(false);
  const [daChiaXong, setDaChiaXong] = useState(false);

  const startPath = isAuthenticated ? "/dashboard" : "/login";
  const startState = isAuthenticated ? undefined : { from: { pathname: "/decks" } };

  function chuyenTheTrenCungXuongDay() {
    setThuTu((hienTai) => [...hienTai.slice(1), hienTai[0]]);
    setDaLat(false);
  }

  return (
    <main className="home-trang">
      <header className="home-dau">
        <span className="dash-nav__brand">
          <span className="dash-nav__brand-mark" aria-hidden="true" />
          Streak Drop
        </span>
        <Link to={isAuthenticated ? "/dashboard" : "/login"} className="dash-nav__link">
          {isAuthenticated ? "Vào Dashboard" : "Đăng nhập"}
        </Link>
      </header>

      <section className="home-than">
        <div className="home-loi">
          <h1 className="home-loi__tieu-de">Học từ vựng tiếng Anh, mỗi lần một thẻ.</h1>
          <p className="home-loi__mo-ta">
            Tạo bộ từ của riêng bạn, lật thẻ để ghi nhớ, rồi tự kiểm tra bằng trắc nghiệm
            và tự luận. Từ nào hay quên sẽ tự quay lại đúng lúc cần ôn.
          </p>
          <div className="home-loi__hanh-dong">
            <Link
              to={startPath}
              state={startState}
              className="ui-button ui-button--primary home-loi__nut-chinh"
            >
              Bắt đầu học ngay
            </Link>
            <Link to="/decks" className="ui-button ui-button--ghost home-loi__nut-phu">
              Xem bộ từ mẫu
            </Link>
          </div>
        </div>

        <div className="home-xap">
          <div className="home-xap__khung">
            {thuTu
              .map((chiSoThe, tang) => (
                <TheMau
                  key={THE_MAU[chiSoThe].en}
                  the={THE_MAU[chiSoThe]}
                  tang={tang}
                  soThe={THE_MAU.length}
                  daLat={daLat}
                  onLat={() => setDaLat((dangLat) => !dangLat)}
                  onNem={chuyenTheTrenCungXuongDay}
                  giam={giam}
                  daChiaXong={daChiaXong}
                  onChiaXong={() => setDaChiaXong(true)}
                />
              ))
              .reverse()}
          </div>
          <div className="home-xap__goi-y">
            <span>Nhấn để lật thẻ, kéo sang bên để đổi thẻ.</span>
            <button
              type="button"
              className="home-xap__doi"
              onClick={chuyenTheTrenCungXuongDay}
            >
              Thẻ khác
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default TrangChu;
