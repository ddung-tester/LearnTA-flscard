import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import RewardMagicOverlay from "./RewardMagicOverlay";
import "./RewardTikTokEffect.css";

export const CAU_HINH_REWARD_QUIZ = {
  triggerCount: 10,
  opacity: 0.78,
  duration: 10800,
  videoDuration: 8000,
  fadeOutMs: 1000,
  volume: 0.80,
  manifestSrc: "/rewards/videos.json",
};

const VIDEO_READY_STATE_CAN_DRAW = 2;
const REWARD_CANVAS_MAX_DPR = 1.25;
const REWARD_VIDEO_READY_TIMEOUT_MS = 2600;

function RewardTikTokEffect({
  active,
  lanKichHoat = 0,
  config = CAU_HINH_REWARD_QUIZ,
  progressEndpointRef,
  onRequestClose,
  onHideComplete,
  combo = 0,
}) {
  const videoRef = useRef(null);
  const canvasRefs = useRef({});
  const cacheVideoRefs = useRef({});
  const lanDaDungVideoRef = useRef(0);
  const videoDaPhatGanNhatRef = useRef("");
  const [danhSachVideo, setDanhSachVideo] = useState([]);
  const [loiVideo, setLoiVideo] = useState(false);
  const [daDoViewport, setDaDoViewport] = useState(false);
  const [coTheHienThi, setCoTheHienThi] = useState(false);
  const [giamChuyenDong, setGiamChuyenDong] = useState(false);
  const [videoSrc, setVideoSrc] = useState("");
  const [videoSanSang, setVideoSanSang] = useState(false);
  const [dangRenderReward, setDangRenderReward] = useState(false);
  const [dangFadeOut, setDangFadeOut] = useState(false);
  const [choPhepPhatVideo, setChoPhepPhatVideo] = useState(false);
  const [originRect, setOriginRect] = useState(null);
  const lanTimelineRewardRef = useRef(0);
  const cleanupFadeOutRef = useRef(null);
  const videoReadyTimeoutRef = useRef(null);
  const daYeuCauDongRef = useRef(false);

  const batDauPhatVideo = useCallback(() => {
    setChoPhepPhatVideo(true);
  }, []);

  const yeuCauDongReward = useCallback(() => {
    if (daYeuCauDongRef.current) return;

    daYeuCauDongRef.current = true;
    onRequestClose?.();
  }, [onRequestClose]);

  function chonVideoNgauNhien(danhSach) {
    if (danhSach.length === 0) return "";

    const danhSachUngVien =
      danhSach.length > 1
        ? danhSach.filter((src) => src !== videoDaPhatGanNhatRef.current)
        : danhSach;
    const chiSoNgauNhien = Math.floor(Math.random() * danhSachUngVien.length);

    return danhSachUngVien[chiSoNgauNhien] || "";
  }

  function danhDauVideoDangPhat(src) {
    if (!src) return;

    videoDaPhatGanNhatRef.current = src;
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
    veVideoLenCanvas(video, canvasRefs.current.center);
  }

  const hoanTatDongReward = useCallback(() => {
    setDangRenderReward(false);
    setDangFadeOut(false);
    setChoPhepPhatVideo(false);
    setLoiVideo(false);
    lanTimelineRewardRef.current = 0;
    onHideComplete?.();
  }, [onHideComplete]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(min-width: 1280px)");
    const capNhat = () => {
      const doRongConLai = window.innerWidth - window.innerHeight * 1.125;
      setCoTheHienThi(media.matches && doRongConLai >= 416);
      setDaDoViewport(true);
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
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const capNhat = () => setGiamChuyenDong(media.matches);

    capNhat();
    media.addEventListener("change", capNhat);

    return () => {
      media.removeEventListener("change", capNhat);
    };
  }, []);

  useEffect(() => {
    if (!daDoViewport) return undefined;

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

        danhSachHopLe.forEach((src) => {
          if (cacheVideoRefs.current[src]) return;

          const video = document.createElement("video");
          video.preload = "auto";
          video.muted = true;
          video.playsInline = true;
          video.loop = false;
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
  }, [daDoViewport, config.manifestSrc]);

  useEffect(() => {
    if (!daDoViewport || videoSrc || danhSachVideo.length === 0) return;

    setVideoSrc(chonVideoNgauNhien(danhSachVideo));
  }, [daDoViewport, danhSachVideo, videoSrc]);

  useEffect(() => {
    const fadeOutMs = config.fadeOutMs ?? CAU_HINH_REWARD_QUIZ.fadeOutMs;

    if (cleanupFadeOutRef.current) {
      window.clearTimeout(cleanupFadeOutRef.current);
      cleanupFadeOutRef.current = null;
    }

    if (active) {
      daYeuCauDongRef.current = false;
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
        const videoTiepTheo = chonVideoNgauNhien(danhSachVideo);

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
    if (!active || !dangRenderReward || !daDoViewport) return undefined;

    if (lanKichHoat !== lanTimelineRewardRef.current) {
      lanTimelineRewardRef.current = lanKichHoat;
      setChoPhepPhatVideo(false);

      const node = progressEndpointRef?.current;
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
      const videoDangDung = chonVideoNgauNhien(danhSachVideo);

      lanDaDungVideoRef.current = lanKichHoat;

      if (videoDangDung) {
        setVideoSrc(videoDangDung);
      }

      danhDauVideoDangPhat(videoDangDung);
    } else if (!videoSrc) {
      setVideoSrc(chonVideoNgauNhien(danhSachVideo));
    }

    return undefined;
  }, [
    active,
    dangRenderReward,
    coTheHienThi,
    daDoViewport,
    danhSachVideo,
    lanKichHoat,
    progressEndpointRef,
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
      window.requestAnimationFrame(() => {
        veTatCaCanvas(video);
      });
      return undefined;
    }

    setVideoSanSang(false);
    video?.load();
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
      if (videoReadyTimeoutRef.current) {
        window.clearTimeout(videoReadyTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (videoReadyTimeoutRef.current) {
      window.clearTimeout(videoReadyTimeoutRef.current);
      videoReadyTimeoutRef.current = null;
    }

    if (
      !active ||
      !dangRenderReward ||
      !videoSrc ||
      videoSanSang ||
      loiVideo
    ) {
      return undefined;
    }

    videoReadyTimeoutRef.current = window.setTimeout(() => {
      setLoiVideo(true);
      videoReadyTimeoutRef.current = null;
    }, REWARD_VIDEO_READY_TIMEOUT_MS);

    return () => {
      if (videoReadyTimeoutRef.current) {
        window.clearTimeout(videoReadyTimeoutRef.current);
        videoReadyTimeoutRef.current = null;
      }
    };
  }, [active, dangRenderReward, loiVideo, videoSanSang, videoSrc]);

  useEffect(() => {
    if (
      !active ||
      giamChuyenDong ||
      !videoSrc ||
      !videoSanSang ||
      !choPhepPhatVideo
    ) {
      return undefined;
    }

    const video = videoRef.current;

    if (!video) return undefined;

    const volume = config.volume ?? CAU_HINH_REWARD_QUIZ.volume;

    let animationId;

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

    return () => {
      window.cancelAnimationFrame(animationId);
      video.pause();
      video.volume = volume;
    };
  }, [
    active,
    choPhepPhatVideo,
    giamChuyenDong,
    lanKichHoat,
    videoSrc,
    videoSanSang,
    config.volume,
  ]);

  useEffect(() => {
    if (!active || !dangRenderReward) {
      return undefined;
    }

    const videoDangPhat =
      !giamChuyenDong &&
      !loiVideo &&
      Boolean(videoSrc) &&
      videoSanSang &&
      choPhepPhatVideo;
    const video = videoRef.current;
    const duration = videoDangPhat && video
      ? Math.max(
          config.duration ?? CAU_HINH_REWARD_QUIZ.duration,
          ((Number.isFinite(video.duration) ? video.duration : 0) -
            (Number.isFinite(video.currentTime) ? video.currentTime : 0)) *
            1000 +
            3000
        )
      : config.duration ?? CAU_HINH_REWARD_QUIZ.duration;
    const timer = window.setTimeout(() => {
      yeuCauDongReward();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [
    active,
    dangRenderReward,
    choPhepPhatVideo,
    config.duration,
    giamChuyenDong,
    loiVideo,
    yeuCauDongReward,
    videoSanSang,
    videoSrc,
  ]);

  if (!daDoViewport || !dangRenderReward) return null;

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
          playsInline
          onLoadedData={(event) => {
            if (event.currentTarget.readyState >= VIDEO_READY_STATE_CAN_DRAW) {
              setVideoSanSang(true);
              window.requestAnimationFrame(() => {
                veTatCaCanvas(event.currentTarget);
              });
            }
          }}
          onCanPlay={(event) => {
            setVideoSanSang(true);
            window.requestAnimationFrame(() => {
              veTatCaCanvas(event.currentTarget);
            });
          }}
          onCanPlayThrough={() => setVideoSanSang(true)}
          onEnded={yeuCauDongReward}
          onError={() => setLoiVideo(true)}
        />
      )}
      {dangRenderReward && (
        <RewardMagicOverlay
          active={dangRenderReward}
          sequenceKey={lanKichHoat}
          fadeOut={dangFadeOut}
          hasError={giamChuyenDong || loiVideo || !videoSrc}
          videoSrc={videoSrc}
          videoReady={giamChuyenDong || videoSanSang || loiVideo || !videoSrc}
          originRect={originRect}
          canvasRefs={canvasRefs}
          onPortalOpen={giamChuyenDong ? undefined : batDauPhatVideo}
          compact={!coTheHienThi}
          combo={combo}
        />
      )}
    </div>
  );

  return createPortal(rewardLayer, document.body);
}

export default RewardTikTokEffect;
