import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "./RewardMagicOverlay.css";

gsap.registerPlugin(useGSAP);

const SO_SPARKLE = 10;

function layDiemNguon(originRect) {
  if (typeof window === "undefined") return { x: 0, y: 0 };

  if (!originRect) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  return {
    x: Math.min(
      Math.max(originRect.right - Math.min(originRect.width * 0.08, 14), 24),
      window.innerWidth - 24
    ),
    y: Math.min(
      Math.max(originRect.top + originRect.height / 2, 24),
      window.innerHeight - 24
    ),
  };
}

function ngauNhien(min, max) {
  return min + Math.random() * (max - min);
}

function taoPathVongQuanhProgress({ x, y }) {
  const rX = ngauNhien(50, 68);
  const rY = ngauNhien(28, 42);
  const nghieng = ngauNhien(-10, 10);

  return [
    `M ${x} ${y}`,
    `C ${x + rX * 0.62} ${y - rY * 0.92 + nghieng}, ${x - rX * 0.58} ${y - rY * 1.1 - nghieng}, ${x - rX * 0.7} ${y - rY * 0.08}`,
    `C ${x - rX * 0.82} ${y + rY * 0.76}, ${x + rX * 0.14} ${y + rY * 1.08}, ${x + rX * 0.5} ${y + rY * 0.36}`,
    `C ${x + rX * 0.86} ${y - rY * 0.18}, ${x + rX * 0.28} ${y - rY * 0.54}, ${x + ngauNhien(-8, 8)} ${y + ngauNhien(-7, 7)}`,
    `C ${x + ngauNhien(-16, 16)} ${y + ngauNhien(-14, 14)}, ${x + ngauNhien(-10, 10)} ${y + ngauNhien(-10, 10)}, ${x} ${y}`,
  ].join(" ");
}

function taoPathToiVideo(source, target, side) {
  const huong = side === "left" ? -1 : 1;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const mid1 = {
    x: source.x + dx * 0.27,
    y: source.y + dy * 0.18 + ngauNhien(-34, 34),
  };
  const mid2 = {
    x: source.x + dx * 0.62,
    y: source.y + dy * 0.64 + ngauNhien(-42, 42),
  };

  return [
    `M ${source.x} ${source.y}`,
    `C ${source.x + huong * ngauNhien(62, 96)} ${source.y + ngauNhien(-36, 34)},`,
    `${mid1.x - huong * ngauNhien(30, 58)} ${mid1.y + ngauNhien(-20, 20)},`,
    `${mid1.x} ${mid1.y}`,
    `C ${mid1.x + huong * ngauNhien(48, 78)} ${mid1.y + ngauNhien(-28, 28)},`,
    `${mid2.x - huong * ngauNhien(50, 82)} ${mid2.y + ngauNhien(-28, 28)},`,
    `${mid2.x} ${mid2.y}`,
    `C ${mid2.x + huong * ngauNhien(46, 72)} ${mid2.y + ngauNhien(-20, 20)},`,
    `${target.x - huong * ngauNhien(38, 68)} ${target.y + ngauNhien(-18, 18)},`,
    `${target.x} ${target.y}`,
  ].join(" ");
}

function setPathAnimation(path) {
  const length = path.getTotalLength();

  gsap.set(path, {
    autoAlpha: 0,
    strokeDasharray: length,
    strokeDashoffset: length,
  });
}

function RewardMagicOverlay({
  active,
  fadeOut = false,
  hasError = false,
  videoSrc = "",
  videoReady = false,
  originRect = null,
  canvasRefs,
  onPortalOpen,
  onComplete,
}) {
  const rootRef = useRef(null);

  function luuCanvas(viTri, node) {
    if (!canvasRefs?.current) return;

    if (node) {
      canvasRefs.current[viTri] = node;
    } else {
      delete canvasRefs.current[viTri];
    }
  }

  useGSAP(
    () => {
      if (!active || !rootRef.current) return undefined;

      const root = rootRef.current;
      const q = gsap.utils.selector(root);
      const source = layDiemNguon(originRect);
      const portalCenterX = window.innerHeight * 9 / 32;
      const leftTarget = { x: portalCenterX, y: window.innerHeight / 2 };
      const rightTarget = {
        x: window.innerWidth - portalCenterX,
        y: window.innerHeight / 2,
      };
      const warmupPath = taoPathVongQuanhProgress(source);
      const leftPath = taoPathToiVideo(source, leftTarget, "left");
      const rightPath = taoPathToiVideo(source, rightTarget, "right");
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      root.style.setProperty("--reward-source-x", `${source.x}px`);
      root.style.setProperty("--reward-source-y", `${source.y}px`);

      const sourceGlow = q(".reward-magic__source-glow");
      const sparks = q(".reward-magic__spark");
      const warmupPaths = q(".reward-magic__path--warmup");
      const leftPaths = q(".reward-magic__path--left");
      const rightPaths = q(".reward-magic__path--right");
      const allPaths = [...warmupPaths, ...leftPaths, ...rightPaths];
      const bursts = q(".reward-magic__burst");
      const leftBurst = q(".reward-magic__burst--left");
      const rightBurst = q(".reward-magic__burst--right");
      const portals = q(".reward-magic__portal");
      const media = q(".reward-magic__media");
      const studyFrame = q(".reward-magic__study-frame");

      gsap.set(root, { autoAlpha: 1 });
      gsap.set(sourceGlow, { autoAlpha: 0, scale: 0.55 });
      gsap.set(studyFrame, { autoAlpha: 0, scale: 0.98 });
      gsap.set(sparks, { autoAlpha: 0, x: 0, y: 0, scale: 0.25, rotate: 0 });
      gsap.set(portals, {
        autoAlpha: 0,
        scale: 0.2,
        clipPath: "inset(42% 42% 42% 42%)",
        filter: "blur(10px)",
      });
      gsap.set(media, { autoAlpha: 0, scale: 1.03 });

      warmupPaths.forEach((path) => path.setAttribute("d", warmupPath));
      leftPaths.forEach((path) => path.setAttribute("d", leftPath));
      rightPaths.forEach((path) => path.setAttribute("d", rightPath));
      allPaths.forEach(setPathAnimation);

      leftBurst.forEach((node) => {
        node.setAttribute("cx", leftTarget.x);
        node.setAttribute("cy", leftTarget.y);
      });
      rightBurst.forEach((node) => {
        node.setAttribute("cx", rightTarget.x);
        node.setAttribute("cy", rightTarget.y);
      });
      gsap.set(bursts, { autoAlpha: 0, scale: 0.25, transformOrigin: "50% 50%" });

      if (!videoReady && !prefersReducedMotion) {
        const waitingTimeline = gsap.timeline({ repeat: -1, yoyo: true });

        waitingTimeline
          .to(studyFrame, { autoAlpha: 0.22, scale: 1, duration: 0.24 }, 0)
          .to(sourceGlow, { autoAlpha: 0.9, scale: 0.98, duration: 0.32 }, 0)
          .to(warmupPaths, { autoAlpha: 0.72, strokeDashoffset: 0, duration: 0.9, ease: "sine.inOut" }, 0.12);

        return () => waitingTimeline.kill();
      }

      if (prefersReducedMotion) {
        const quickTimeline = gsap.timeline();

        quickTimeline
          .to(studyFrame, { autoAlpha: 0.36, duration: 0.12 })
          .to(
            portals,
            {
              autoAlpha: 1,
              scale: 1,
              clipPath: "inset(0% 0% 0% 0%)",
              filter: "blur(0px)",
              duration: 0.18,
            },
            0
          )
          .to(media, { autoAlpha: 1, scale: 1, duration: 0.2 }, 0.08)
          .call(() => onPortalOpen?.(), null, 0.2);

        return () => quickTimeline.kill();
      }

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      timeline
        .to(studyFrame, { autoAlpha: 0.34, scale: 1, duration: 0.24 }, 0)
        .to(sourceGlow, { autoAlpha: 1, scale: 1.05, duration: 0.34 }, 0)
        .to(
          sparks,
          {
            autoAlpha: 1,
            x: () => ngauNhien(-52, 52),
            y: () => ngauNhien(-42, 42),
            scale: () => ngauNhien(0.52, 0.95),
            rotate: () => ngauNhien(-70, 70),
            duration: 0.44,
            stagger: 0.035,
          },
          0.18
        )
        .to(
          sparks,
          {
            autoAlpha: 0,
            x: () => ngauNhien(-92, 92),
            y: () => ngauNhien(-68, 68),
            scale: 0.08,
            duration: 0.72,
            stagger: 0.018,
            ease: "power2.out",
          },
          0.78
        )
        .to(
          warmupPaths,
          { autoAlpha: 1, strokeDashoffset: 0, duration: 1.75, ease: "sine.inOut" },
          0.18
        )
        .to(warmupPaths, { autoAlpha: 0, strokeDashoffset: -42, duration: 0.26 }, 1.82)
        .to(
          [...leftPaths, ...rightPaths],
          { autoAlpha: 1, strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut" },
          1.86
        )
        .to(bursts, { autoAlpha: 1, scale: 1, duration: 0.26, stagger: 0.03, ease: "expo.out" }, 3.22)
        .to(bursts, { autoAlpha: 0, scale: 1.9, duration: 0.38, stagger: 0.03, ease: "power2.out" }, 3.42)
        .to([...leftPaths, ...rightPaths], { autoAlpha: 0, strokeDashoffset: -48, duration: 0.28 }, 3.34)
        .to(
          portals,
          {
            autoAlpha: 1,
            scale: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            filter: "blur(0px)",
            duration: 0.46,
            ease: "expo.out",
          },
          3.38
        )
        .to(sourceGlow, { autoAlpha: 0.2, scale: 1.28, duration: 0.48 }, 3.42)
        .to(media, { autoAlpha: 1, scale: 1, duration: 0.4 }, 3.62)
        .call(() => onPortalOpen?.(), null, 3.82);

      return () => timeline.kill();
    },
    { scope: rootRef, dependencies: [active, videoSrc, videoReady, originRect, onPortalOpen] }
  );

  useGSAP(
    () => {
      if (!fadeOut || !rootRef.current) return undefined;

      const q = gsap.utils.selector(rootRef.current);
      const closeTimeline = gsap.timeline({ onComplete });

      closeTimeline.to(
        [
          q(".reward-magic__portal"),
          q(".reward-magic__media"),
          q(".reward-magic__study-frame"),
          q(".reward-magic__source-glow"),
          q(".reward-magic__path"),
          q(".reward-magic__spark"),
          q(".reward-magic__burst"),
        ],
        {
          autoAlpha: 0,
          scale: 0.96,
          filter: "blur(6px)",
          duration: 0.8,
          ease: "power2.out",
        }
      );

      return () => closeTimeline.kill();
    },
    { scope: rootRef, dependencies: [fadeOut, onComplete] }
  );

  if (!active) return null;

  return (
    <div
      ref={rootRef}
      className={`reward-magic ${fadeOut ? "reward-magic--fade-out" : ""}`}
      aria-hidden="true"
    >
      <div className="reward-magic__study-frame" />
      <div className="reward-magic__source-glow" />
      <div className="reward-magic__sparkles">
        {Array.from({ length: SO_SPARKLE }).map((_, index) => (
          <span className="reward-magic__spark" key={index} />
        ))}
      </div>
      <svg className="reward-magic__paths" aria-hidden="true">
        <defs>
          <linearGradient id="reward-magic-warmup" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff3c4" />
            <stop offset="24%" stopColor="#84f3ea" />
            <stop offset="58%" stopColor="#78b8ff" />
            <stop offset="100%" stopColor="#d987ff" />
          </linearGradient>
          <linearGradient id="reward-magic-left" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff5c8" />
            <stop offset="24%" stopColor="#69dff0" />
            <stop offset="58%" stopColor="#7aa7ff" />
            <stop offset="100%" stopColor="#df8aff" />
          </linearGradient>
          <linearGradient id="reward-magic-right" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff5c8" />
            <stop offset="24%" stopColor="#69dff0" />
            <stop offset="58%" stopColor="#7aa7ff" />
            <stop offset="100%" stopColor="#df8aff" />
          </linearGradient>
          <filter id="reward-magic-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path className="reward-magic__path reward-magic__path--aura reward-magic__path--warmup" />
        <path className="reward-magic__path reward-magic__path--core reward-magic__path--warmup" />
        <path className="reward-magic__path reward-magic__path--spark reward-magic__path--warmup" />
        <path className="reward-magic__path reward-magic__path--aura reward-magic__path--left" />
        <path className="reward-magic__path reward-magic__path--core reward-magic__path--left" />
        <path className="reward-magic__path reward-magic__path--spark reward-magic__path--left" />
        <path className="reward-magic__path reward-magic__path--aura reward-magic__path--right" />
        <path className="reward-magic__path reward-magic__path--core reward-magic__path--right" />
        <path className="reward-magic__path reward-magic__path--spark reward-magic__path--right" />
        <circle className="reward-magic__burst reward-magic__burst--left" r="12" />
        <circle className="reward-magic__burst reward-magic__burst--right" r="12" />
      </svg>

      {["left", "right"].map((viTri) => (
        <div
          className={`reward-magic__portal reward-magic__portal--${viTri}`}
          key={viTri}
        >
          <div className="reward-magic__portal-ring" />
          <div className="reward-magic__media">
            {hasError || !videoSrc ? (
              <div className="reward-magic__fallback" />
            ) : (
              <canvas
                ref={(node) => luuCanvas(viTri, node)}
                className="reward-magic__canvas"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default RewardMagicOverlay;
