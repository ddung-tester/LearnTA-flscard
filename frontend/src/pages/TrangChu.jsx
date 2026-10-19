import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  animate,
  m,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import useNghieng3D from "../hooks/useNghieng3D";
import { laMayYeu } from "../utils/mayYeu";

// Hero WebGL (three.js, chunk riêng): chỉ tải khi máy vẽ được WebGL, không phải máy yếu/tiết kiệm dữ liệu và không hạn chế chuyển động
const CanhThe3D = lazy(() => import("../components/home/CanhThe3D"));
// Phần kể chuyện theo cuộn (gsap, chunk riêng) nằm dưới màn đầu
const CauChuyenCuon = lazy(() => import("../components/home/CauChuyenCuon"));

function coTheDung3D() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  if (laMayYeu()) return false;
  try {
    const cv = document.createElement("canvas");
    return Boolean(cv.getContext("webgl2") || cv.getContext("webgl"));
  } catch {
    return false;
  }
}

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
function TheMau({
  the,
  tang,
  soThe,
  daLat,
  onLat,
  dangNem,
  onBatDauNem,
  onNem,
  giam,
  daChiaXong,
  onChiaXong,
  onKeo,
}) {
  const x = useMotionValue(0);
  const nghieng = useTransform(x, [-300, 0, 300], [-16, 0, 16]);
  const daKeoRef = useRef(false);
  const laTrenCung = tang === 0;
  // Thẻ đang bay ra không nhận thao tác nữa, để không bị giữ lại lưng chừng
  const dangBay = laTrenCung && dangNem;
  const viTri = VI_TRI_TANG[tang] ?? VI_TRI_TANG[VI_TRI_TANG.length - 1];

  // Thẻ vừa bị ném xuống đáy xấp: trượt từ ngoài vào lại dưới xấp
  useEffect(() => {
    if (!laTrenCung && x.get() !== 0) {
      animate(x, 0, giam ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 26 });
    }
  }, [laTrenCung, giam, x]);

  function xuLyThaTay(_, info) {
    onKeo(false);
    const doDoi = info.offset.x;
    const vanToc = info.velocity.x;
    const huong = doDoi < 0 ? -1 : 1;
    const duManh =
      Math.abs(doDoi) > NGUONG_NEM || (Math.abs(doDoi) > 40 && Math.abs(vanToc) > 600);

    if (!duManh) {
      animate(x, 0, { type: "spring", stiffness: 520, damping: 32 });
      return;
    }

    onBatDauNem(huong);
    animate(x, huong * 460, giam ? { duration: 0 } : { duration: 0.28, ease: [0.4, 0, 0.7, 0.2] })
      .then(onNem);
  }

  return (
    <m.div
      className="home-the"
      style={{ zIndex: soThe - tang, pointerEvents: dangBay ? "none" : undefined }}
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
      <m.div
        className="home-the__keo"
        style={{ x, rotate: giam ? 0 : nghieng }}
        drag={laTrenCung && !dangBay ? "x" : false}
        dragMomentum={false}
        whileDrag={giam ? undefined : { scale: 1.03 }}
        onPointerDown={() => {
          daKeoRef.current = false;
        }}
        onDragStart={() => {
          daKeoRef.current = true;
          onKeo(true);
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
          {/* Lật bằng CSS transition (chạy trên compositor), không để JS tính từng khung khi cảnh 3D đang chiếm main thread */}
          <span className="home-the__lat" data-lat={laTrenCung && daLat ? "" : undefined}>
            <span className="fc-mat fc-mat--truoc home-the__mat">
              <span className="fc-mat__tu" lang="en">{the.en}</span>
            </span>
            <span className="fc-mat fc-mat--sau home-the__mat home-the__mat--sau">
              <span className="fc-mat__tu">{the.vi}</span>
              <span className="home-the__vi-du" lang="en">{the.viDu}</span>
            </span>
          </span>
        </button>
      </m.div>
    </m.div>
  );
}

/**
 * TrangChu — cửa vào ứng dụng.
 * Điểm nhấn duy nhất: một xấp thẻ thật để thử lật và kéo, giống hệt trang Flashcard.
 */
function TrangChu() {
  const { isAuthenticated } = useAuth();
  const giam = useReducedMotion();
  // Đang kéo thẻ: tắt nghiêng xấp + dừng bồng bềnh, để thẻ bám đúng ngón tay/con trỏ
  const [dangKeo, setDangKeo] = useState(false);
  const { nghiengRef: xapRef, onPointerMove: nghiengXap, onPointerLeave: thoiNghiengXap } = useNghieng3D({
    doNghieng: 9,
    tat: dangKeo,
  });
  const [thuTu, setThuTu] = useState(() => THE_MAU.map((_, i) => i));
  const [daLat, setDaLat] = useState(false);
  const [daChiaXong, setDaChiaXong] = useState(false);
  const [dangNem, setDangNem] = useState(false);
  const [dung3D] = useState(coTheDung3D);
  // Mỗi lần ném thẻ: một cơn gió thổi đàn thẻ 3D theo hướng ném
  const [gio, setGio] = useState({ huong: 1, lan: 0 });
  // Cuộn qua màn đầu: hero 3D mờ đi và ngừng vẽ
  const manDauRef = useRef(null);
  const [quaManDau, setQuaManDau] = useState(false);

  useEffect(() => {
    const manDau = manDauRef.current;
    if (!manDau) return undefined;
    const quanSat = new IntersectionObserver(([muc]) => setQuaManDau(!muc.isIntersecting), { threshold: 0.3 });
    quanSat.observe(manDau);
    return () => quanSat.disconnect();
  }, []);

  function thoiGio(huong) {
    setGio((truoc) => ({ huong, lan: truoc.lan + 1 }));
  }

  const startPath = isAuthenticated ? "/dashboard" : "/login";
  const startState = isAuthenticated ? undefined : { from: { pathname: "/decks" } };

  function chuyenTheTrenCungXuongDay() {
    setThuTu((hienTai) => [...hienTai.slice(1), hienTai[0]]);
    setDaLat(false);
    setDangNem(false);
  }

  return (
    <main className="home-trang">
      {dung3D && (
        <Suspense fallback={null}>
          <CanhThe3D gio={gio} tamDung={quaManDau} />
        </Suspense>
      )}
      <div ref={manDauRef} className="home-man-dau">
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
              <Link to="/khoa-hoc" className="ui-button ui-button--ghost home-loi__nut-phu">
                Xem lộ trình học
              </Link>
            </div>
          </div>

          <div className="home-xap" data-dang-keo={dangKeo ? "" : undefined}>
            <div
              ref={xapRef}
              onPointerMove={nghiengXap}
              onPointerLeave={thoiNghiengXap}
              className="home-xap__khung ui-nghieng-3d ui-nghieng-3d--khong-sang"
            >
              {/* Giữ nguyên thứ tự DOM (chồng thẻ bằng zIndex): đổi chỗ node giữa chừng làm hỏng thao tác kéo */}
              {THE_MAU.map((the, chiSoThe) => (
                <TheMau
                  key={the.en}
                  the={the}
                  tang={thuTu.indexOf(chiSoThe)}
                  soThe={THE_MAU.length}
                  daLat={daLat}
                  onLat={() => setDaLat((dangLat) => !dangLat)}
                  dangNem={dangNem}
                  onBatDauNem={(huong) => {
                    setDangNem(true);
                    thoiGio(huong);
                  }}
                  onNem={chuyenTheTrenCungXuongDay}
                  giam={giam}
                  daChiaXong={daChiaXong}
                  onChiaXong={() => setDaChiaXong(true)}
                  onKeo={setDangKeo}
                />
              ))}
            </div>
            <div className="home-xap__goi-y">
              <span>Nhấn để lật thẻ, kéo sang bên để đổi thẻ.</span>
              <button
                type="button"
                className="home-xap__doi"
                onClick={() => {
                  chuyenTheTrenCungXuongDay();
                  thoiGio(-1);
                }}
                disabled={dangNem}
              >
                Thẻ khác
              </button>
            </div>
          </div>
        </section>
        <p className="home-cuon-xuong" aria-hidden="true">
          <span>Cuộn xuống để xem cách học ↓</span>
        </p>
      </div>

      <Suspense fallback={null}>
        <CauChuyenCuon startPath={startPath} startState={startState} />
      </Suspense>
    </main>
  );
}

export default TrangChu;
