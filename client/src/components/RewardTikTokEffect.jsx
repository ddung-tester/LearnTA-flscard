import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import RewardMagicOverlay from "./RewardMagicOverlay";
import "./RewardTikTokEffect.css";

export const CAU_HINH_REWARD_QUIZ = {
  triggerCount: 5,
  opacity: 0.78,
  duration: 10800,
  videoDuration: 8000,
  fadeOutMs: 1000,
  volume: 0.80,
  manifestSrc: "/rewards/videos.json",
};

const VIDEO_READY_STATE_CAN_DRAW = 2;
const REWARD_CANVAS_MAX_DPR = 1.25;

function tronDanhSach(danhSach) {
  return [...danhSach].sort(() => Math.random() - 0.5);
}

function RewardTikTokEffect({
  active,
  lanKichHoat = 0,
  config = CAU_HINH_REWARD_QUIZ,
  progressTargetRef,
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
  const [dangRenderReward, setDangRenderReward] = useState(false);
  const [dangFadeOut, setDangFadeOut] = useState(false);
  const [choPhepPhatVideo, setChoPhepPhatVideo] = useState(false);
  const [originRect, setOriginRect] = useState(null);
  const lanTimelineRewardRef = useRef(0);
  const cleanupFadeOutRef = useRef(null);

  const batDauPhatVideo = useCallback(() => {
    setChoPhepPhatVideo(true);
  }, []);

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

  function veVideoLenCanvas(video, canvas) {
    if (!canvas || !video.videoWidth || !video.videoHeight) return;

    const tiLeManHinh = Math.min(
      window.devicePixelRatio || 1,
      REWARD_CANVAS_MAX_DPR
    );
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

  function veTatCaCanvas(video) {
    veVideoLenCanvas(video, canvasRefs.current.left);
    veVideoLenCanvas(video, canvasRefs.current.right);
  }

  const hoanTatDongReward = useCallback(() => {
    setDangRenderReward(false);
    setDangFadeOut(false);
    setChoPhepPhatVideo(false);
    setLoiVideo(false);
    lanTimelineRewardRef.current = 0;
  }, []);

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
        const response = await fetch(config.manifestSrc, { cache: "force-cache" });
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
          video.loop = true;
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
    const fadeOutMs = config.fadeOutMs ?? CAU_HINH_REWARD_QUIZ.fadeOutMs;

    if (cleanupFadeOutRef.current) {
      window.clearTimeout(cleanupFadeOutRef.current);
      cleanupFadeOutRef.current = null;
    }

    if (active) {
      setDangRenderReward(true);
      setDangFadeOut(false);
      setLoiVideo(false);
      return undefined;
    }

    if (!dangRenderReward) return undefined;

    setDangFadeOut(true);
    cleanupFadeOutRef.current = window.setTimeout(() => {
      hoanTatDongReward();

      if (danhSachVideo.length > 0) {
        const videoTiepTheo = xemVideoTiepTheo(danhSachVideo);

        if (videoTiepTheo && videoTiepTheo !== videoSrc) {
          setVideoSrc(videoTiepTheo);
        }
      }
    }, fadeOutMs);

    return () => {
      if (cleanupFadeOutRef.current) {
        window.clearTimeout(cleanupFadeOutRef.current);
        cleanupFadeOutRef.current = null;
      }
    };
  }, [
    active,
    dangRenderReward,
    danhSachVideo,
    videoSrc,
    config.fadeOutMs,
    hoanTatDongReward,
  ]);

  useEffect(() => {
    if (!active || !dangRenderReward) return undefined;

    if (!coTheHienThi) return undefined;

    if (lanKichHoat !== lanTimelineRewardRef.current) {
      lanTimelineRewardRef.current = lanKichHoat;
      setChoPhepPhatVideo(false);

      const node = progressTargetRef?.current;
      setOriginRect(node ? node.getBoundingClientRect() : null);

      const video = videoRef.current;
      if (video) {
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
          // Ignore seek errors while the browser is still attaching metadata.
        }
      }
    }

    setDangFadeOut(false);

    if (danhSachVideo.length === 0) {
      setLoiVideo(true);
      return undefined;
    }

    if (lanKichHoat > 0 && lanKichHoat !== lanDaDungVideoRef.current) {
      const videoDangDung = videoSrc || xemVideoTiepTheo(danhSachVideo);

      lanDaDungVideoRef.current = lanKichHoat;

      if (!videoSrc && videoDangDung) {
        setVideoSrc(videoDangDung);
      }

      danhDauVideoDangPhat(videoDangDung, danhSachVideo);
    } else if (!videoSrc) {
      setVideoSrc(xemVideoTiepTheo(danhSachVideo));
    }

    return undefined;
  }, [
    active,
    dangRenderReward,
    coTheHienThi,
    danhSachVideo,
    lanKichHoat,
    progressTargetRef,
    videoSanSang,
    videoSrc,
  ]);

  useEffect(() => {
    if (!videoSrc) {
      setVideoSanSang(false);
      return;
    }

    const video = videoRef.current;
    if (video && video.readyState >= VIDEO_READY_STATE_CAN_DRAW) {
      setVideoSanSang(true);
    } else {
      setVideoSanSang(false);
      video?.load();
    }
  }, [videoSrc]);

  useEffect(() => {
    if (!active || !videoSrc || !videoSanSang || choPhepPhatVideo) {
      return undefined;
    }

    const video = videoRef.current;
    if (!video) return undefined;

    let animationId = window.requestAnimationFrame(() => {
      veTatCaCanvas(video);
    });

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [active, choPhepPhatVideo, videoSanSang, videoSrc]);

  useEffect(() => {
    if (lanKichHoat === 0) {
      lanDaDungVideoRef.current = 0;
    }
  }, [lanKichHoat]);

  useEffect(
    () => () => {
      if (cleanupFadeOutRef.current) {
        window.clearTimeout(cleanupFadeOutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!active || !videoSrc || !videoSanSang || !choPhepPhatVideo) {
      return undefined;
    }

    const video = videoRef.current;

    if (!video) return undefined;

    const volume = config.volume ?? CAU_HINH_REWARD_QUIZ.volume;
    const fadeOutMs = config.fadeOutMs ?? CAU_HINH_REWARD_QUIZ.fadeOutMs;
    const duration = config.duration ?? CAU_HINH_REWARD_QUIZ.duration;
    const videoDuration =
      config.videoDuration ?? CAU_HINH_REWARD_QUIZ.videoDuration ?? duration;
    const thoiGianBatDauFade = Math.max(0, videoDuration - fadeOutMs);
    let animationId;
    let fadeTimer;
    let volumeAnimationId;

    function veKhungHinh() {
      veTatCaCanvas(video);
      animationId = window.requestAnimationFrame(veKhungHinh);
    }

    video.volume = volume;
    video.muted = false;

    video
      .play()
      .catch(() => {
        video.muted = true;
        return video.play();
      })
      .catch(() => {
        setLoiVideo(true);
      });

    setDangFadeOut(false);
    veKhungHinh();

    fadeTimer = window.setTimeout(() => {
      const batDauFade = performance.now();
      setDangFadeOut(true);

      function giamAmLuong() {
        const daQua = performance.now() - batDauFade;
        const tiLeConLai = Math.max(0, 1 - daQua / fadeOutMs);
        video.volume = volume * tiLeConLai;

        if (tiLeConLai > 0) {
          volumeAnimationId = window.requestAnimationFrame(giamAmLuong);
        }
      }

      volumeAnimationId = window.requestAnimationFrame(giamAmLuong);
    }, thoiGianBatDauFade);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.cancelAnimationFrame(volumeAnimationId);
      window.clearTimeout(fadeTimer);
      video.pause();
      video.volume = volume;
    };
  }, [
    active,
    choPhepPhatVideo,
    lanKichHoat,
    videoSrc,
    videoSanSang,
    config.duration,
    config.fadeOutMs,
    config.volume,
  ]);

  if (!coTheHienThi || !dangRenderReward) return null;

  const style = {
    "--reward-opacity": config.opacity ?? CAU_HINH_REWARD_QUIZ.opacity,
    "--reward-fade-duration": `${config.fadeOutMs ?? CAU_HINH_REWARD_QUIZ.fadeOutMs}ms`,
  };

  if (typeof document === "undefined") return null;

  const rewardLayer = (
    <div
      className={`reward-tiktok-effect ${loiVideo ? "reward-tiktok-effect--fallback" : ""} ${
        dangFadeOut ? "reward-tiktok-effect--fade-out" : ""
      }`}
      aria-hidden="true"
      style={style}
    >
      {!loiVideo && videoSrc && (
        <video
          key={videoSrc}
          ref={videoRef}
          className="reward-tiktok-effect__source-video"
          src={videoSrc}
          preload="auto"
          muted
          loop
          playsInline
          onLoadedData={(event) => {
            if (event.currentTarget.readyState >= VIDEO_READY_STATE_CAN_DRAW) {
              setVideoSanSang(true);
            }
          }}
          onCanPlay={() => setVideoSanSang(true)}
          onCanPlayThrough={() => setVideoSanSang(true)}
          onError={() => setLoiVideo(true)}
        />
      )}
      {dangRenderReward && (
        <RewardMagicOverlay
          active={dangRenderReward}
          sequenceKey={lanKichHoat}
          fadeOut={dangFadeOut}
          hasError={loiVideo || !videoSrc}
          videoSrc={videoSrc}
          videoReady={videoSanSang || loiVideo || !videoSrc}
          originRect={originRect}
          canvasRefs={canvasRefs}
          onPortalOpen={batDauPhatVideo}
        />
      )}
    </div>
  );

  return createPortal(rewardLayer, document.body);
}

export default RewardTikTokEffect;
