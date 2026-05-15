import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BACKGROUND_QUIZ_VIDEO } from "../constants/backgrounds";
import "./VideoBackground.css";

const VIDEO_FADE_MS = 420;
const BODY_MODE_CLASSES = [
  "has-video-background--immersive",
  "has-video-background--app",
];
const BODY_VARIANT_CLASSES = [
  "has-video-background-variant--default",
  "has-video-background-variant--auth",
  "has-video-background-variant--study",
];
const NOOP_VIDEO_READY = () => {};

function VideoLayer({ src, active, onReady }) {
  const videoRef = useRef(null);
  const directionRef = useRef("forward");
  const activeRef = useRef(active);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const video = videoRef.current;
    if (!video) return undefined;

    let disposed = false;
    let canPlayNativeReverse = false;

    function detectNativeReversePlayback() {
      const originalRate = video.playbackRate;

      try {
        video.playbackRate = -1;
        canPlayNativeReverse = video.playbackRate < 0;
      } catch {
        canPlayNativeReverse = false;
      } finally {
        video.playbackRate = originalRate;
      }
    }

    function playForward({ reset = false } = {}) {
      if (disposed || mq.matches) return;

      directionRef.current = "forward";
      video.loop = !canPlayNativeReverse;
      video.playbackRate = 1;

      if (reset) {
        video.currentTime = 0;
      }

      video.play().catch(() => {});
    }

    function playBackward() {
      if (disposed || mq.matches) return;

      if (!canPlayNativeReverse || !Number.isFinite(video.duration)) {
        playForward({ reset: true });
        return;
      }

      directionRef.current = "backward";
      video.loop = false;
      video.playbackRate = -1;

      if (video.currentTime >= video.duration - 0.04) {
        video.currentTime = Math.max(0, video.duration - 0.04);
      }

      video.play().catch(() => {
        canPlayNativeReverse = false;
        playForward({ reset: true });
      });
    }

    function handleEnded() {
      if (directionRef.current === "forward") {
        playBackward();
      } else {
        playForward({ reset: true });
      }
    }

    function handleTimeUpdate() {
      if (
        directionRef.current === "backward" &&
        canPlayNativeReverse &&
        video.currentTime <= 0.05
      ) {
        playForward({ reset: true });
      }
    }

    function handleReady() {
      onReadyRef.current();
    }

    function applyMotionPref() {
      if (mq.matches || !activeRef.current) {
        video.pause();
        return;
      }

      if (directionRef.current === "backward") {
        playBackward();
        return;
      }

      playForward();
    }

    detectNativeReversePlayback();
    video.loop = !canPlayNativeReverse;
    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadeddata", handleReady);
    video.addEventListener("canplay", handleReady);
    applyMotionPref();
    mq.addEventListener("change", applyMotionPref);

    return () => {
      disposed = true;
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadeddata", handleReady);
      video.removeEventListener("canplay", handleReady);
      mq.removeEventListener("change", applyMotionPref);
    };
  }, [src]);

  useEffect(() => {
    activeRef.current = active;

    const video = videoRef.current;
    if (!video) return;

    if (active && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active]);

  return (
    <video
      ref={videoRef}
      className={`video-bg__video ${active ? "video-bg__video--active" : ""}`}
      src={src}
      autoPlay={active}
      muted
      preload="auto"
      playsInline
    />
  );
}

function VideoBackground({
  src = BACKGROUND_QUIZ_VIDEO,
  variant = "default",
  mode = "app",
  children,
}) {
  const [activeSrc, setActiveSrc] = useState(src);
  const [previousSrc, setPreviousSrc] = useState(null);
  const fadeTimerRef = useRef(null);
  const pendingSrc = src !== activeSrc ? src : null;

  useLayoutEffect(() => {
    document.body.classList.add("has-video-background");

    return () => {
      document.body.classList.remove(
        "has-video-background",
        ...BODY_MODE_CLASSES,
        ...BODY_VARIANT_CLASSES
      );
    };
  }, []);

  useLayoutEffect(() => {
    const modeClass = `has-video-background--${mode}`;
    const variantClass = `has-video-background-variant--${variant}`;

    document.body.classList.remove(...BODY_MODE_CLASSES, ...BODY_VARIANT_CLASSES);
    document.body.classList.add(modeClass, variantClass);
  }, [mode, variant]);

  const clearFadeTimer = useCallback(() => {
    if (fadeTimerRef.current) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const activatePendingVideo = useCallback(() => {
    if (!pendingSrc || pendingSrc === activeSrc) return;

    clearFadeTimer();
    setPreviousSrc(activeSrc);
    setActiveSrc(pendingSrc);

    fadeTimerRef.current = window.setTimeout(() => {
      setPreviousSrc(null);
      fadeTimerRef.current = null;
    }, VIDEO_FADE_MS);
  }, [activeSrc, clearFadeTimer, pendingSrc]);

  useEffect(() => clearFadeTimer, [clearFadeTimer]);

  return (
    <>
      <div className="video-bg" aria-hidden="true">
        {previousSrc && (
          <VideoLayer
            key={previousSrc}
            src={previousSrc}
            active={false}
            onReady={NOOP_VIDEO_READY}
          />
        )}
        <VideoLayer
          key={activeSrc}
          src={activeSrc}
          active
          onReady={NOOP_VIDEO_READY}
        />
        {pendingSrc && (
          <VideoLayer
            key={pendingSrc === previousSrc ? `pending-${pendingSrc}` : pendingSrc}
            src={pendingSrc}
            active={false}
            onReady={activatePendingVideo}
          />
        )}
        <AnimatePresence initial={false}>
          <motion.div
            key={variant}
            className={`video-bg__overlay video-bg__overlay--${variant}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
          />
        </AnimatePresence>
      </div>
      <div className={`video-bg-content video-bg-content--${mode}`}>
        {children}
      </div>
    </>
  );
}

export default VideoBackground;
