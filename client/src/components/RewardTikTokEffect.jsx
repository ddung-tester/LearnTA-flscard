import { useEffect, useRef, useState } from "react";
import "./RewardTikTokEffect.css";

export const CAU_HINH_REWARD_QUIZ = {
  triggerCount: 5,
  opacity: 0.78,
  duration: 8000,
  fadeOutMs: 1000,
  volume: 0.80,
  manifestSrc: "/rewards/videos.json",
};

function tronDanhSach(danhSach) {
  return [...danhSach].sort(() => Math.random() - 0.5);
}

function RewardTikTokEffect({
  active,
  lanKichHoat = 0,
  config = CAU_HINH_REWARD_QUIZ,
}) {
  const videoRef = useRef(null);
  const canvasRefs = useRef({});
  const cacheVideoRefs = useRef({});
  const hangDoiVideoRef = useRef([]);
  const lanDaDungVideoRef = useRef(0);
  const videoDaPhatGanNhatRef = useRef("");
  const [danhSachVideo, setDanhSachVideo] = useState([]);
  const [loiVideo, setLoiVideo] = useState(false);
  const [coTheHienThi, setCoTheHienThi] = useState(false);
  const [videoSrc, setVideoSrc] = useState("");
  const [videoSanSang, setVideoSanSang] = useState(false);
  const [dangChuanBi, setDangChuanBi] = useState(false);
  const [dangFadeOut, setDangFadeOut] = useState(false);

  function taoHangDoiVideo(danhSach) {
    const hangDoi = tronDanhSach(danhSach);

    if (
      hangDoi.length > 1 &&
      hangDoi[0] === videoDaPhatGanNhatRef.current
    ) {
      [hangDoi[0], hangDoi[1]] = [hangDoi[1], hangDoi[0]];
    }

    return hangDoi;
  }

  function xemVideoTiepTheo(danhSach) {
    if (danhSach.length === 0) return "";

    if (hangDoiVideoRef.current.length === 0) {
      hangDoiVideoRef.current = taoHangDoiVideo(danhSach);
    }

    return hangDoiVideoRef.current[0] || "";
  }

  function danhDauVideoDangPhat(src, danhSach) {
    if (!src) return;

    if (hangDoiVideoRef.current[0] === src) {
      hangDoiVideoRef.current.shift();
    } else {
      hangDoiVideoRef.current = hangDoiVideoRef.current.filter(
        (video) => video !== src
      );
    }

    videoDaPhatGanNhatRef.current = src;

    if (hangDoiVideoRef.current.length === 0 && danhSach.length > 0) {
      hangDoiVideoRef.current = taoHangDoiVideo(danhSach);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(min-width: 1280px)");
    const capNhat = () => {
      const doRongConLai = window.innerWidth - window.innerHeight * 1.125;
      setCoTheHienThi(media.matches && doRongConLai >= 416);
    };

    capNhat();
    media.addEventListener("change", capNhat);
    window.addEventListener("resize", capNhat);

    return () => {
      media.removeEventListener("change", capNhat);
      window.removeEventListener("resize", capNhat);
    };
  }, []);

  useEffect(() => {
    if (!coTheHienThi) return undefined;

    let daHuy = false;

    async function napDanhSachVideo() {
      try {
        const response = await fetch(config.manifestSrc, { cache: "no-store" });
        if (!response.ok) throw new Error("Khong doc duoc reward manifest");

        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Reward manifest khong hop le");

        const danhSachHopLe = data
          .filter((tenFile) => typeof tenFile === "string" && tenFile.trim())
          .map((tenFile) => tenFile.trim())
          .map((tenFile) =>
            tenFile.startsWith("/") ? tenFile : `/rewards/${tenFile}`
          );

        if (daHuy) return;

        setDanhSachVideo(danhSachHopLe);
        hangDoiVideoRef.current = taoHangDoiVideo(danhSachHopLe);

        danhSachHopLe.forEach((src) => {
          if (cacheVideoRefs.current[src]) return;

          const video = document.createElement("video");
          video.preload = "auto";
          video.muted = true;
          video.playsInline = true;
          video.src = src;
          video.load();
          cacheVideoRefs.current[src] = video;
        });
      } catch {
        if (!daHuy) setDanhSachVideo([]);
      }
    }

    napDanhSachVideo();

    return () => {
      daHuy = true;
    };
  }, [coTheHienThi, config.manifestSrc]);

  useEffect(() => {
    if (!coTheHienThi || videoSrc || danhSachVideo.length === 0) return;

    setVideoSrc(xemVideoTiepTheo(danhSachVideo));
  }, [coTheHienThi, danhSachVideo, videoSrc]);

  useEffect(() => {
    if (!active) {
      setLoiVideo(false);
      setDangChuanBi(false);
      setDangFadeOut(false);

      if (danhSachVideo.length > 0) {
        const videoTiepTheo = xemVideoTiepTheo(danhSachVideo);

        if (videoTiepTheo && videoTiepTheo !== videoSrc) {
          setVideoSrc(videoTiepTheo);
        }
      }

      return undefined;
    }

    if (!coTheHienThi) return undefined;

    setDangChuanBi(!videoSanSang);
    setDangFadeOut(false);

    if (danhSachVideo.length === 0) {
      setLoiVideo(true);
      return undefined;
    }

    if (lanKichHoat > 0 && lanKichHoat !== lanDaDungVideoRef.current) {
      const videoDangDung = xemVideoTiepTheo(danhSachVideo);

      lanDaDungVideoRef.current = lanKichHoat;

      if (videoDangDung && videoDangDung !== videoSrc) {
        setVideoSrc(videoDangDung);
        setVideoSanSang(false);
      } else if (!videoSrc && videoDangDung) {
        setVideoSrc(videoDangDung);
      }

      danhDauVideoDangPhat(videoDangDung, danhSachVideo);
    } else if (!videoSrc) {
      setVideoSrc(xemVideoTiepTheo(danhSachVideo));
    }

    return undefined;
  }, [
    active,
    coTheHienThi,
    danhSachVideo,
    lanKichHoat,
    videoSanSang,
    videoSrc,
  ]);

  useEffect(() => {
    if (!videoSrc) {
      setVideoSanSang(false);
      return;
    }

    // Neu video da duoc preload va co du data (HAVE_FUTURE_DATA tro len),
    // khong reset ve false de tranh nhip do dau tien.
    const cached = cacheVideoRefs.current[videoSrc];
    if (cached && cached.readyState >= 3) {
      setVideoSanSang(true);
    } else {
      setVideoSanSang(false);
    }
  }, [videoSrc]);

  useEffect(() => {
    if (lanKichHoat === 0) {
      lanDaDungVideoRef.current = 0;
    }
  }, [lanKichHoat]);

  useEffect(() => {
    if (!active || !videoSrc || !videoSanSang) {
      return undefined;
    }

    const video = videoRef.current;

    if (!video) return undefined;

    const volume = config.volume ?? CAU_HINH_REWARD_QUIZ.volume;
    const fadeOutMs = config.fadeOutMs ?? CAU_HINH_REWARD_QUIZ.fadeOutMs;
    const duration = config.duration ?? CAU_HINH_REWARD_QUIZ.duration;
    const thoiGianBatDauFade = Math.max(0, duration - fadeOutMs);
    let animationId;
    let fadeTimer;
    let volumeTimer;

    function veCanvas(canvas) {
      if (!canvas || !video.videoWidth || !video.videoHeight) return;

      const tiLeManHinh = window.devicePixelRatio || 1;
      const rong = canvas.clientWidth * tiLeManHinh;
      const cao = canvas.clientHeight * tiLeManHinh;

      if (canvas.width !== rong || canvas.height !== cao) {
        canvas.width = rong;
        canvas.height = cao;
      }

      const context = canvas.getContext("2d");
      const tiLe = Math.max(rong / video.videoWidth, cao / video.videoHeight);
      const rongVe = video.videoWidth * tiLe;
      const caoVe = video.videoHeight * tiLe;
      const x = (rong - rongVe) / 2;
      const y = (cao - caoVe) / 2;

      context.drawImage(video, x, y, rongVe, caoVe);
    }

    function veKhungHinh() {
      veCanvas(canvasRefs.current.left);
      veCanvas(canvasRefs.current.right);
      animationId = window.requestAnimationFrame(veKhungHinh);
    }

    video.volume = volume;
    video.muted = false;
    video.currentTime = 0;

    video
      .play()
      .catch(() => {
        video.muted = true;
        return video.play();
      })
      .catch(() => {
        setLoiVideo(true);
      });

    setDangChuanBi(false);
    setDangFadeOut(false);
    veKhungHinh();

    fadeTimer = window.setTimeout(() => {
      const batDauFade = performance.now();
      setDangFadeOut(true);

      volumeTimer = window.setInterval(() => {
        const daQua = performance.now() - batDauFade;
        const tiLeConLai = Math.max(0, 1 - daQua / fadeOutMs);
        video.volume = volume * tiLeConLai;

        if (tiLeConLai <= 0) {
          window.clearInterval(volumeTimer);
        }
      }, 50);
    }, thoiGianBatDauFade);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.clearTimeout(fadeTimer);
      window.clearInterval(volumeTimer);
      video.pause();
      video.volume = volume;
    };
  }, [
    active,
    lanKichHoat,
    videoSrc,
    videoSanSang,
    config.duration,
    config.fadeOutMs,
    config.volume,
  ]);

  if (!coTheHienThi) return null;

  const style = {
    "--reward-opacity": config.opacity ?? CAU_HINH_REWARD_QUIZ.opacity,
    "--reward-fade-duration": `${config.fadeOutMs ?? CAU_HINH_REWARD_QUIZ.fadeOutMs}ms`,
  };

  return (
    <div
      className={`reward-tiktok-effect ${loiVideo ? "reward-tiktok-effect--fallback" : ""} ${
        dangFadeOut ? "reward-tiktok-effect--fade-out" : ""
      }`}
      aria-hidden="true"
      style={style}
    >
      {active && <div className="reward-tiktok-effect__study-frame" />}
      {!loiVideo && videoSrc && (
        <video
          key={videoSrc}
          ref={videoRef}
          className="reward-tiktok-effect__source-video"
          src={videoSrc}
          preload="auto"
          loop
          playsInline
          onCanPlay={() => setVideoSanSang(true)}
          onError={() => setLoiVideo(true)}
        />
      )}
      {active &&
        !dangChuanBi &&
        ["left", "right"].map((viTri) => (
        <div
          className={`reward-tiktok-effect__panel reward-tiktok-effect__panel--${viTri}`}
          key={viTri}
        >
          {loiVideo || !videoSrc ? (
            <div className="reward-tiktok-effect__fallback" />
          ) : (
            <canvas
              ref={(node) => {
                canvasRefs.current[viTri] = node;
              }}
              className="reward-tiktok-effect__canvas"
            />
          )}
        </div>
        ))}
    </div>
  );
}

export default RewardTikTokEffect;
