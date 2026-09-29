import { useEffect, useRef } from "react";
import {
  BackSide,
  CanvasTexture,
  Color,
  FrontSide,
  Fog,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";

const TU_TREN_THE = [
  "deploy", "refactor", "deadline", "bug", "remember", "practice",
  "streak", "review", "focus", "journey", "fluent", "daily",
];
const THE_MOI_TU = 3;
const VUNG = { x: 11, y: 6.5, zGan: -5, zXa: -22 };
const RONG_THE = 1.5;
const CAO_THE = 1.0;

// Mặt trước thẻ index: giấy, vạch lề đỏ, dòng kẻ, một từ tiếng Anh
function veMatThe(cv, tu) {
  const g = cv.getContext("2d");
  g.fillStyle = "#fffcf4";
  g.fillRect(0, 0, 384, 256);
  g.strokeStyle = "rgba(160, 120, 70, 0.22)";
  g.lineWidth = 2;
  for (let y = 78; y < 256; y += 34) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(384, y);
    g.stroke();
  }
  g.strokeStyle = "#d6452f";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 56);
  g.lineTo(384, 56);
  g.stroke();
  g.fillStyle = "#2c1608";
  g.font = "800 58px 'Bricolage Grotesque', 'Be Vietnam Pro', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(tu, 192, 150);
}

function taoMatThe(tu) {
  const cv = document.createElement("canvas");
  cv.width = 384;
  cv.height = 256;
  veMatThe(cv, tu);
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  // Vẽ lại khi font hiển thị tải xong (lần đầu có thể còn dùng font dự phòng)
  document.fonts?.load("800 58px 'Bricolage Grotesque'").then(() => {
    veMatThe(cv, tu);
    tex.needsUpdate = true;
  }).catch(() => {});
  return tex;
}

function ngauNhien(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * CanhThe3D — hero WebGL trang chủ: các thẻ index trôi lơ lửng theo chiều sâu sau xấp thẻ thật.
 * Camera nghiêng nhẹ theo con trỏ; mỗi lần người dùng ném thẻ (gio.lan tăng) thì một cơn gió
 * thổi đàn thẻ theo hướng ném (gio.huong: -1 trái, 1 phải).
 * Chỉ được tải khi có WebGL và không bật giảm chuyển động (xem TrangChu).
 */
function CanhThe3D({ gio }) {
  const khungRef = useRef(null);
  const thoiGioRef = useRef(null);

  useEffect(() => {
    const khung = khungRef.current;
    let renderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    khung.appendChild(renderer.domElement);

    const mauNen = new Color(getComputedStyle(document.body).backgroundColor || "#f7d492");
    const scene = new Scene();
    scene.fog = new Fog(mauNen, 9, 26);
    const camera = new PerspectiveCamera(50, 1, 0.1, 60);
    camera.position.set(0, 0, 6);

    const hinh = new PlaneGeometry(RONG_THE, CAO_THE);
    // Mặt sau: giấy trơn (mặt trước dùng FrontSide nên chữ không bị ngược khi thẻ lộn)
    const vatLieuSau = new MeshBasicMaterial({ color: "#f6eedc", side: BackSide });
    const cacVatLieu = [];
    const cacLuoi = [];
    const cacThe = [];

    TU_TREN_THE.forEach((tu) => {
      const vatLieu = new MeshBasicMaterial({ map: taoMatThe(tu), side: FrontSide });
      const luoi = new InstancedMesh(hinh, vatLieu, THE_MOI_TU);
      const luoiSau = new InstancedMesh(hinh, vatLieuSau, THE_MOI_TU);
      cacVatLieu.push(vatLieu);
      cacLuoi.push(luoi, luoiSau);
      scene.add(luoi, luoiSau);
      for (let i = 0; i < THE_MOI_TU; i += 1) {
        cacThe.push({
          luoi,
          luoiSau,
          chiSo: i,
          x: ngauNhien(-VUNG.x, VUNG.x),
          y: ngauNhien(-VUNG.y, VUNG.y),
          z: ngauNhien(VUNG.zXa, VUNG.zGan),
          vx: 0,
          troi: ngauNhien(0.12, 0.3),
          rx: ngauNhien(-0.6, 0.6),
          ry: ngauNhien(-0.8, 0.8),
          rz: ngauNhien(-0.4, 0.4),
          quayX: ngauNhien(-0.15, 0.15),
          quayY: ngauNhien(-0.25, 0.25),
          pha: ngauNhien(0, Math.PI * 2),
        });
      }
    });

    const tam = new Object3D();
    const conTro = { x: 0, y: 0, mx: 0, my: 0 };
    let raf = 0;
    let dangHien = true;
    let truoc = performance.now();

    function doKichThuoc() {
      const { clientWidth: w, clientHeight: h } = khung;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    function khung1(now) {
      const dt = Math.min((now - truoc) / 1000, 0.05);
      truoc = now;
      conTro.x += (conTro.mx - conTro.x) * 0.05;
      conTro.y += (conTro.my - conTro.y) * 0.05;
      camera.position.x = conTro.x * 0.9;
      camera.position.y = conTro.y * 0.6;
      camera.lookAt(0, 0, -12);

      for (const the of cacThe) {
        the.vx *= 1 - Math.min(dt * 1.6, 1);
        the.x += the.vx * dt;
        the.y += the.troi * dt;
        the.rx += the.quayX * dt + Math.abs(the.vx) * 0.02 * dt;
        the.ry += the.quayY * dt + the.vx * 0.08 * dt;
        if (the.y > VUNG.y + 1) the.y = -VUNG.y - 1;
        if (the.x > VUNG.x + 2) the.x = -VUNG.x - 2;
        if (the.x < -VUNG.x - 2) the.x = VUNG.x + 2;
        tam.position.set(the.x + Math.sin(now / 2400 + the.pha) * 0.25, the.y, the.z);
        tam.rotation.set(the.rx, the.ry, the.rz + Math.sin(now / 3000 + the.pha) * 0.15);
        tam.updateMatrix();
        the.luoi.setMatrixAt(the.chiSo, tam.matrix);
        the.luoiSau.setMatrixAt(the.chiSo, tam.matrix);
      }
      cacLuoi.forEach((luoi) => {
        luoi.instanceMatrix.needsUpdate = true;
      });

      renderer.render(scene, camera);
      if (khung.dataset.daVe !== "1") khung.dataset.daVe = "1";
      raf = dangHien ? requestAnimationFrame(khung1) : 0;
    }

    function xuLyConTro(event) {
      conTro.mx = (event.clientX / window.innerWidth - 0.5) * 2;
      conTro.my = -(event.clientY / window.innerHeight - 0.5) * 2;
    }

    thoiGioRef.current = (huong) => {
      for (const the of cacThe) {
        // Thẻ gần bị thổi mạnh hơn thẻ xa
        const doGan = (the.z - VUNG.zXa) / (VUNG.zGan - VUNG.zXa);
        the.vx += huong * ngauNhien(5, 9) * (0.5 + doGan);
      }
    };

    // Ra khỏi màn hình thì ngừng vẽ cho đỡ pin
    const quanSatHien = new IntersectionObserver(([muc]) => {
      dangHien = muc.isIntersecting;
      if (dangHien && !raf) {
        truoc = performance.now();
        raf = requestAnimationFrame(khung1);
      }
    });
    quanSatHien.observe(khung);
    const quanSatCo = new ResizeObserver(doKichThuoc);
    quanSatCo.observe(khung);
    window.addEventListener("pointermove", xuLyConTro, { passive: true });
    doKichThuoc();
    raf = requestAnimationFrame(khung1);

    return () => {
      cancelAnimationFrame(raf);
      quanSatHien.disconnect();
      quanSatCo.disconnect();
      window.removeEventListener("pointermove", xuLyConTro);
      thoiGioRef.current = null;
      hinh.dispose();
      cacVatLieu.forEach((vatLieu) => {
        vatLieu.map.dispose();
        vatLieu.dispose();
      });
      vatLieuSau.dispose();
      cacLuoi.forEach((luoi) => luoi.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    if (gio.lan > 0) thoiGioRef.current?.(gio.huong);
  }, [gio]);

  return <div ref={khungRef} className="home-canh-3d" aria-hidden="true" />;
}

export default CanhThe3D;
