import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import "./RewardMagicOverlay.css";

gsap.registerPlugin(useGSAP);

function layViTriNguon() {
  if (typeof window === "undefined") return 128;
  return Math.min(Math.max(window.innerHeight * 0.2, 104), 176);
}

function ngauNhien(min, max) {
  return min + Math.random() * (max - min);
}

function taoDiemDuongBay(huong, endX, endY) {
  const dau = huong === "left" ? -1 : 1;
  const doRong = Math.max(320, endX);
  const doCao = Math.max(260, endY);

  return [
    { x: dau * ngauNhien(48, 86), y: ngauNhien(34, 78), scale: 1.18 },
    { x: dau * ngauNhien(132, 190), y: ngauNhien(-34, 24), scale: 0.92 },
    { x: dau * ngauNhien(76, 138), y: ngauNhien(122, 190), scale: 1.2 },
    { x: dau * ngauNhien(214, 310), y: ngauNhien(72, 156), scale: 0.98 },
    {
      x: dau * (doRong * ngauNhien(0.52, 0.68)),
      y: doCao * ngauNhien(0.42, 0.62),
      scale: 1.12,
    },
    {
      x: dau * (doRong * ngauNhien(0.76, 0.86)),
      y: doCao * ngauNhien(0.76, 0.9),
      scale: 0.95,
    },
    { x: dau * endX, y: endY, scale: 1.36 },
  ];
}

function taoPathData(sourceX, sourceY, diemBay) {
  const diemTuyetDoi = diemBay.map((diem) => ({
    x: sourceX + diem.x,
    y: sourceY + diem.y,
  }));

  let path = `M ${sourceX} ${sourceY}`;

  diemTuyetDoi.forEach((diem, index) => {
    const laDiemCuoi = index === diemTuyetDoi.length - 1;

    if (laDiemCuoi) {
      path += ` Q ${diem.x} ${diem.y} ${diem.x} ${diem.y}`;
      return;
    }

    const diemTiepTheo = diemTuyetDoi[index + 1];
    const diemGiua = {
      x: (diem.x + diemTiepTheo.x) / 2,
      y: (diem.y + diemTiepTheo.y) / 2,
    };

    path += ` Q ${diem.x} ${diem.y} ${diemGiua.x} ${diemGiua.y}`;
  });

  return path;
}

function taoKeyframesOrb(diemBay) {
  return diemBay.map((diem, index) => {
    const laDiemCuoi = index === diemBay.length - 1;
    const dangTangToc = index >= diemBay.length - 3;

    return {
      x: diem.x,
      y: diem.y,
      scale: diem.scale,
      duration: laDiemCuoi ? 0.34 : dangTangToc ? 0.28 : 0.22,
      ease: laDiemCuoi ? "power4.in" : "sine.inOut",
    };
  });
}

function RewardMagicOverlay({
  active,
  fadeOut = false,
  hasError = false,
  videoSrc = "",
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
      const sourceY = layViTriNguon();
      const sourceX = window.innerWidth / 2;
      const portalCenterX = window.innerHeight * 9 / 32;
      const endX = Math.max(0, window.innerWidth / 2 - portalCenterX);
      const endY = window.innerHeight / 2 - sourceY;
      const trailLength = Math.hypot(endX, endY);
      const leftAngle = (Math.atan2(endY, -endX) * 180) / Math.PI;
      const rightAngle = (Math.atan2(endY, endX) * 180) / Math.PI;
      const diemBayTrai = taoDiemDuongBay("left", endX, endY);
      const diemBayPhai = taoDiemDuongBay("right", endX, endY);
      const pathTrai = taoPathData(sourceX, sourceY, diemBayTrai);
      const pathPhai = taoPathData(sourceX, sourceY, diemBayPhai);
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      root.style.setProperty("--reward-source-y", `${sourceY}px`);

      const sourceGlow = q(".reward-magic__source-glow");
      const orbs = q(".reward-magic__orb");
      const leftOrb = q(".reward-magic__orb--left");
      const rightOrb = q(".reward-magic__orb--right");
      const leftTrail = q(".reward-magic__trail--left");
      const rightTrail = q(".reward-magic__trail--right");
      const leftPaths = q(".reward-magic__path--left");
      const rightPaths = q(".reward-magic__path--right");
      const allPaths = [...leftPaths, ...rightPaths];
      const portals = q(".reward-magic__portal");
      const media = q(".reward-magic__media");
      const studyFrame = q(".reward-magic__study-frame");

      gsap.set(root, { autoAlpha: 1 });
      gsap.set(sourceGlow, { autoAlpha: 0, scale: 0.55 });
      gsap.set(studyFrame, { autoAlpha: 0, scale: 0.98 });
      gsap.set(orbs, { autoAlpha: 0, x: 0, y: 0, scale: 0.4 });
      gsap.set(portals, {
        autoAlpha: 0,
        scaleX: 0.08,
        scaleY: 0.96,
        clipPath: "inset(48% 0% 48% 0%)",
        filter: "blur(10px)",
      });
      gsap.set(media, { autoAlpha: 0, scale: 1.03 });
      gsap.set(leftTrail, {
        autoAlpha: 0,
        width: trailLength,
        rotate: leftAngle,
        scaleX: 0,
      });
      gsap.set(rightTrail, {
        autoAlpha: 0,
        width: trailLength,
        rotate: rightAngle,
        scaleX: 0,
      });
      leftPaths.forEach((path) => path.setAttribute("d", pathTrai));
      rightPaths.forEach((path) => path.setAttribute("d", pathPhai));
      allPaths.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, {
          autoAlpha: 0,
          strokeDasharray: length,
          strokeDashoffset: length,
        });
      });

      if (prefersReducedMotion) {
        const quickTimeline = gsap.timeline();

        quickTimeline
          .to(studyFrame, { autoAlpha: 0.45, duration: 0.12 })
          .call(() => onPortalOpen?.(), null, 0.06)
          .to(
            portals,
            {
              autoAlpha: 1,
              scaleX: 1,
              scaleY: 1,
              clipPath: "inset(0% 0% 0% 0%)",
              filter: "blur(0px)",
              duration: 0.18,
            },
            0
          )
          .to(media, { autoAlpha: 1, scale: 1, duration: 0.2 }, 0.08);

        return () => quickTimeline.kill();
      }

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      timeline
        .to(studyFrame, { autoAlpha: 0.45, scale: 1, duration: 0.28 }, 0)
        .to(sourceGlow, { autoAlpha: 1, scale: 1.16, duration: 0.42 }, 0)
        .to(
          orbs,
          { autoAlpha: 1, scale: 1, duration: 0.38, stagger: 0.04 },
          0.1
        )
        .to(
          allPaths,
          { autoAlpha: 1, strokeDashoffset: 0, duration: 1.54, ease: "sine.inOut" },
          0.42
        )
        .to(leftOrb, { keyframes: taoKeyframesOrb(diemBayTrai) }, 0.42)
        .to(rightOrb, { keyframes: taoKeyframesOrb(diemBayPhai) }, 0.42)
        .to(
          [leftTrail, rightTrail],
          { autoAlpha: 0.78, scaleX: 1, duration: 0.34 },
          1.58
        )
        .to(
          [leftTrail, rightTrail],
          { autoAlpha: 0, scaleX: 1.04, duration: 0.24 },
          1.96
        )
        .to(
          allPaths,
          { autoAlpha: 0, strokeDashoffset: -40, duration: 0.32 },
          2.02
        )
        .to(
          portals,
          {
            autoAlpha: 1,
            scaleX: 1,
            scaleY: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            filter: "blur(0px)",
            duration: 0.5,
            ease: "expo.out",
          },
          2.04
        )
        .call(() => onPortalOpen?.(), null, 2.16)
        .to(orbs, { autoAlpha: 0, scale: 2.1, duration: 0.26 }, 2.1)
        .to(sourceGlow, { autoAlpha: 0.28, scale: 1.48, duration: 0.52 }, 2.12)
        .to(media, { autoAlpha: 1, scale: 1, duration: 0.62 }, 2.26);

      return () => timeline.kill();
    },
    { scope: rootRef, dependencies: [active, videoSrc, onPortalOpen] }
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
          q(".reward-magic__orb"),
          q(".reward-magic__trail"),
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
      <svg className="reward-magic__paths" aria-hidden="true">
        <defs>
          <linearGradient id="reward-magic-left" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f3fbff" />
            <stop offset="42%" stopColor="#8fd3ff" />
            <stop offset="100%" stopColor="#5bbcff" />
          </linearGradient>
          <linearGradient id="reward-magic-right" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f3fbff" />
            <stop offset="42%" stopColor="#8fd3ff" />
            <stop offset="100%" stopColor="#5bbcff" />
          </linearGradient>
        </defs>
        <path className="reward-magic__path reward-magic__path--aura reward-magic__path--left" />
        <path className="reward-magic__path reward-magic__path--core reward-magic__path--left" />
        <path className="reward-magic__path reward-magic__path--spark reward-magic__path--left" />
        <path className="reward-magic__path reward-magic__path--aura reward-magic__path--right" />
        <path className="reward-magic__path reward-magic__path--core reward-magic__path--right" />
        <path className="reward-magic__path reward-magic__path--spark reward-magic__path--right" />
      </svg>
      <div className="reward-magic__trail reward-magic__trail--left" />
      <div className="reward-magic__trail reward-magic__trail--right" />

      <div className="reward-magic__orb reward-magic__orb--left">
        <span />
      </div>
      <div className="reward-magic__orb reward-magic__orb--right">
        <span />
      </div>

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
