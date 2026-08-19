import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BACKGROUND_DEFAULT_VIDEO,
  BACKGROUND_QUIZ_VIDEO,
} from "../constants/backgrounds";
import "./VideoBackground.css";

const BACKGROUND_SOURCES = [BACKGROUND_DEFAULT_VIDEO, BACKGROUND_QUIZ_VIDEO];

const BODY_MODE_CLASSES = [
  "has-video-background--immersive",
  "has-video-background--app",
];

const BODY_VARIANT_CLASSES = [
  "has-video-background-variant--default",
  "has-video-background-variant--auth",
  "has-video-background-variant--study",
  "has-video-background-variant--dashboard",
  "has-video-background-variant--flat",
];

function VideoLayer({ src, active }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const video = videoRef.current;
    if (!video) return undefined;

    function applyMotionPref() {
      if (mq.matches || !active) {
        video?.pause();
        return;
      }
      video.loop = true;
      video.play().catch(() => {});
    }

    video.loop = true;
    mq.addEventListener("change", applyMotionPref);
    applyMotionPref();

    return () => {
      mq.removeEventListener("change", applyMotionPref);
    };
  }, [active, src]);

  return (
    <video
      ref={videoRef}
      className={`video-bg__video ${active ? "video-bg__video--active" : ""}`}
      src={src}
      autoPlay={active}
      muted
      loop
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
  const isFlat = variant === "flat";

  // Flat variant: không cần video sources — tránh load file media thừa
  const videoSources = useMemo(
    () => (isFlat ? [] : [...new Set([...BACKGROUND_SOURCES, src])]),
    [src, isFlat]
  );

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

  return (
    <>
      {/* Flat variant: không render video hay overlay — chỉ dùng CSS body background */}
      {!isFlat && (
        <div className="video-bg" aria-hidden="true">
          {videoSources.map((videoSrc) => (
            <VideoLayer
              key={videoSrc}
              src={videoSrc}
              active={videoSrc === src}
            />
          ))}
          <AnimatePresence initial={false}>
            <motion.div
              key={variant}
              className={`video-bg__overlay video-bg__overlay--${variant}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            />
          </AnimatePresence>
        </div>
      )}
      <div className={`video-bg-content video-bg-content--${mode}`}>
        {children}
      </div>
    </>
  );
}

export default VideoBackground;
