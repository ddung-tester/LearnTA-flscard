import { useLayoutEffect } from "react";
import "./VideoBackground.css";

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

/**
 * VideoBackground — khung nền của app: gắn class mode/variant lên <body> (nhiều CSS dựa vào đó).
 * Tên giữ từ thời có video nền; app hiện chỉ dùng nền phẳng (variant "flat"), đã bỏ lớp video.
 */
function VideoBackground({
  variant = "default",
  mode = "app",
  children,
}) {
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

  return <div className={`video-bg-content video-bg-content--${mode}`}>{children}</div>;
}

export default VideoBackground;
