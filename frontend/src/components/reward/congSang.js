/**
 * Nét vẽ cho hiệu ứng thưởng "cổng sáng": một canvas 2D phủ màn hình, cộng sáng ("lighter").
 * Ngôn ngữ hình: đốm sáng 4 cánh, vệt sao chổi ngũ sắc bay theo đường cong, quả cầu ánh sáng có vành xoay,
 * viền cổng ngũ sắc chạy quanh, hạt sáng li ti. Không dùng shadowBlur / filter (đắt) — quầng là gradient.
 * Bảng màu: mật ong của trang làm chủ đạo, thêm san hô – tím – lam để có ánh ngũ sắc.
 */

export const MAU = {
  trang: [255, 250, 240],
  matOng: [255, 200, 100],
  sanHo: [255, 120, 140],
  tim: [165, 120, 255],
  lam: [90, 200, 255],
};

const NGU_SAC = [MAU.matOng, MAU.sanHo, MAU.tim, MAU.lam];
// Màu dọc vệt sao chổi, từ đuôi tới đầu
const DAI_VET = [MAU.lam, MAU.tim, MAU.sanHo, MAU.matOng, MAU.trang];
const SO_HAT_TOI_DA = 140;

const TAU = Math.PI * 2;

const mau = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;
const kep = (x, min = 0, max = 1) => Math.min(max, Math.max(min, x));

function tronMau(dai, f) {
  const x = kep(f) * (dai.length - 1);
  const i = Math.min(dai.length - 2, Math.floor(x));
  const k = x - i;
  return dai[i].map((c, j) => Math.round(c + (dai[i + 1][j] - c) * k));
}

export const em = {
  raLapPhuong: (t) => 1 - (1 - t) ** 3,
  raMu: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  vaoLapPhuong: (t) => t * t * t,
  vaoRa: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  // Êm hơn vaoRa ở hai đầu, dùng cho chuyển động dài
  vaoRaMem: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  // Vượt nhẹ rồi về (nở quả cầu)
  raNay: (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2,
};

/** Điểm trên đường bay cong (Bézier bậc 2), võng ra phía ngoài theo hướng bay */
export function diemCung(a, b, u) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dai = Math.hypot(dx, dy) || 1;
  const lech = Math.min(dai * 0.32, 200) * (dx >= 0 ? 1 : -1);
  const cx = (a.x + b.x) / 2 + (dy / dai) * lech;
  const cy = (a.y + b.y) / 2 - (Math.abs(dx) / dai) * Math.abs(lech);
  const v = 1 - u;
  return { x: v * v * a.x + 2 * v * u * cx + u * u * b.x, y: v * v * a.y + 2 * v * u * cy + u * u * b.y };
}

export function taoCongSang(canvas) {
  const ctx = canvas.getContext("2d");
  let rong = 0;
  let cao = 0;
  let dpr = 1;
  const hat = [];
  let tTruoc = null;

  function doKichThuoc() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    rong = window.innerWidth;
    cao = window.innerHeight;
    canvas.width = Math.round(rong * dpr);
    canvas.height = Math.round(cao * dpr);
  }

  function batDauKhung() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, rong, cao);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function xoa() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hat.length = 0;
    tTruoc = null;
  }

  /** Quầng tròn mềm */
  function quang(x, y, r, mauQuang, a) {
    if (a <= 0.01 || r <= 0.5) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, mau(MAU.trang, a));
    g.addColorStop(0.2, mau(mauQuang, a * 0.55));
    g.addColorStop(1, mau(mauQuang, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /** Đốm sáng 4 cánh (cánh lõm), kiểu ✦ */
  function veSao(x, y, r, xoay, a, mauSao = MAU.trang) {
    if (a <= 0.01 || r <= 0.3) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(xoay);
    ctx.fillStyle = mau(mauSao, a);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.quadraticCurveTo(0, 0, 0, r);
    ctx.quadraticCurveTo(0, 0, -r, 0);
    ctx.quadraticCurveTo(0, 0, 0, -r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();
    ctx.restore();
  }

  /** Gradient ngũ sắc xoay quanh tâm (conic; trình duyệt cũ thì gradient thẳng xoay theo góc) */
  function nguSacXoay(x, y, goc, r) {
    let g;
    if (ctx.createConicGradient) {
      g = ctx.createConicGradient(goc, x, y);
    } else {
      g = ctx.createLinearGradient(x - Math.cos(goc) * r, y - Math.sin(goc) * r, x + Math.cos(goc) * r, y + Math.sin(goc) * r);
    }
    NGU_SAC.forEach((c, i) => g.addColorStop(i / NGU_SAC.length, mau(c, 1)));
    g.addColorStop(1, mau(NGU_SAC[0], 1));
    return g;
  }

  // ── Hạt sáng: chấm màu li ti và đốm sao, trôi chậm dần rồi tắt ──

  function thaHat(x, y, { soLuong = 1, tocDo = 60, song = 600, tiLeSao = 0.25 } = {}) {
    for (let i = 0; i < soLuong; i += 1) {
      const goc = Math.random() * TAU;
      const v = tocDo * (0.35 + Math.random() * 0.65);
      const sao = Math.random() < tiLeSao;
      hat.push({
        x,
        y,
        vx: Math.cos(goc) * v,
        vy: Math.sin(goc) * v,
        tuoi: 0,
        song: song * (0.6 + Math.random() * 0.6),
        mau: NGU_SAC[(Math.random() * NGU_SAC.length) | 0],
        r: sao ? 3 + Math.random() * 4 : 0.8 + Math.random() * 1.3,
        sao,
        xoay: Math.random() * TAU,
      });
    }
    if (hat.length > SO_HAT_TOI_DA) hat.splice(0, hat.length - SO_HAT_TOI_DA);
  }

  function veHat(t) {
    const dt = tTruoc == null ? 16 : Math.min(48, t - tTruoc);
    tTruoc = t;
    const ma = Math.exp(-dt / 380);
    for (let i = hat.length - 1; i >= 0; i -= 1) {
      const h = hat[i];
      h.tuoi += dt;
      if (h.tuoi >= h.song) {
        hat.splice(i, 1);
        continue;
      }
      h.x += (h.vx * dt) / 1000;
      h.y += (h.vy * dt) / 1000;
      h.vx *= ma;
      h.vy *= ma;
      const a = 1 - h.tuoi / h.song;
      if (h.sao) {
        veSao(h.x, h.y, h.r * (0.5 + 0.5 * a), h.xoay + h.tuoi * 0.003, a, MAU.trang);
      } else {
        ctx.fillStyle = mau(h.mau, a * 0.9);
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, TAU);
        ctx.fill();
      }
    }
  }

  const conHat = () => hat.length > 0;

  /** Điểm tụ ở thanh tiến độ: đốm sao thở nhẹ, xoay chậm */
  function veDiemTu(nguon, t, a = 1) {
    const tho = 1 + 0.12 * Math.sin(t * 0.009);
    quang(nguon.x, nguon.y, 30 * tho, MAU.tim, 0.35 * a);
    quang(nguon.x, nguon.y, 12, MAU.matOng, 0.9 * a);
    veSao(nguon.x, nguon.y, 11 * tho, t * 0.0015, a);
  }

  /**
   * Vệt sao chổi ngũ sắc từ a tới b theo đường cong, u: 0→1 là vị trí đầu vệt (u > 1: đuôi đang rút nốt).
   * Trả về vị trí đầu vệt khi đầu vệt còn đang bay.
   */
  function veVet(a, b, u, doSang = 1) {
    const dau = kep(u);
    const duoi = kep(u - 0.34);
    if (dau - duoi < 0.002) return null;
    const N = 18;
    let truoc = diemCung(a, b, duoi);
    for (let i = 1; i <= N; i += 1) {
      const f = i / N;
      const p = diemCung(a, b, duoi + (dau - duoi) * f);
      const c = tronMau(DAI_VET, f);
      ctx.beginPath();
      ctx.moveTo(truoc.x, truoc.y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = mau(c, 0.1 * f * doSang);
      ctx.lineWidth = 12 * f;
      ctx.stroke();
      ctx.strokeStyle = mau(c, 0.85 * f * doSang);
      ctx.lineWidth = 0.6 + 2.4 * f;
      ctx.stroke();
      truoc = p;
    }
    if (u >= 1) return null;
    quang(truoc.x, truoc.y, 26, MAU.matOng, 0.8 * doSang);
    veSao(truoc.x, truoc.y, 10, u * 6, doSang);
    return truoc;
  }

  /**
   * Quả cầu ánh sáng: lõi mềm, vành ngũ sắc xoay, hai cung mảnh chạy ngược chiều bên trong.
   * f 0→1: cầu nở (vượt nhẹ), t: thời gian để xoay, a: độ sáng chung.
   */
  function veQuaCau(tam, R, f, t, a = 1) {
    if (a <= 0.01) return;
    const r = R * (0.2 + 0.8 * em.raNay(kep(f)));
    if (r <= 1) return;
    quang(tam.x, tam.y, r * 1.9, MAU.tim, 0.28 * a);
    quang(tam.x, tam.y, r * 1.1, MAU.sanHo, 0.16 * a);
    quang(tam.x, tam.y, r * 0.55, MAU.matOng, 0.12 * a);

    ctx.strokeStyle = nguSacXoay(tam.x, tam.y, t * 0.0024, r);
    ctx.beginPath();
    ctx.arc(tam.x, tam.y, r, 0, TAU);
    ctx.globalAlpha = 0.2 * a;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.globalAlpha = 0.95 * a;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    for (const [heSo, toc, dai] of [
      [0.8, 0.0042, 1.5],
      [0.62, -0.006, 0.9],
    ]) {
      const dau = t * toc;
      ctx.strokeStyle = nguSacXoay(tam.x, tam.y, -t * 0.003, r);
      ctx.globalAlpha = 0.75 * a;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(tam.x, tam.y, r * heSo, dau, dau + dai);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function duongKhung(h) {
    ctx.beginPath();
    const x = h.cx - h.w / 2;
    const y = h.cy - h.h / 2;
    if (ctx.roundRect) ctx.roundRect(x, y, h.w, h.h, h.rad);
    else ctx.rect(x, y, h.w, h.h);
  }

  /** Viền cổng ngũ sắc chạy quanh (h: { cx, cy, w, h, rad } — khung hiện tại của cổng) */
  function veVienCong(h, t, a) {
    if (a <= 0.01 || h.w < 2) return;
    ctx.strokeStyle = nguSacXoay(h.cx, h.cy, t * 0.0021, Math.max(h.w, h.h) / 2);
    duongKhung(h);
    for (const [w, al] of [
      [16, 0.14],
      [5, 0.32],
      [1.6, 1],
    ]) {
      ctx.globalAlpha = al * a;
      ctx.lineWidth = w;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Sóng sáng mảnh lan ra khi cổng nở */
  function veSong(tam, r, a) {
    if (r < 2 || a <= 0.01) return;
    ctx.strokeStyle = nguSacXoay(tam.x, tam.y, 0, r);
    ctx.beginPath();
    ctx.arc(tam.x, tam.y, r, 0, TAU);
    ctx.globalAlpha = 0.18 * a;
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.globalAlpha = a;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Loé ở tâm khi cổng nở: quầng tròn + vệt ngang mảnh màu lam – tím (kiểu ống kính anamorphic) */
  function veLoe(tam, f, rongKhung) {
    const a = f < 0.2 ? f / 0.2 : (1 - f) ** 1.6;
    quang(tam.x, tam.y, 50 + 130 * em.raLapPhuong(f), MAU.matOng, 0.5 * a);
    const dai = rongKhung * (0.4 + 0.9 * em.raMu(f));
    const g = ctx.createLinearGradient(tam.x - dai / 2, 0, tam.x + dai / 2, 0);
    g.addColorStop(0, mau(MAU.tim, 0));
    g.addColorStop(0.3, mau(MAU.lam, 0.45 * a));
    g.addColorStop(0.5, mau(MAU.trang, 0.85 * a));
    g.addColorStop(0.7, mau(MAU.lam, 0.45 * a));
    g.addColorStop(1, mau(MAU.tim, 0));
    ctx.fillStyle = g;
    ctx.fillRect(tam.x - dai / 2, tam.y - 1, dai, 2);
  }

  /** Đốm sáng về tới thanh tiến độ: vòng ngũ sắc mảnh nở ra, sao tắt dần */
  function veChamVe(nguon, f) {
    quang(nguon.x, nguon.y, 18 + 22 * f, MAU.matOng, 0.7 * (1 - f));
    veSong(nguon, 4 + 34 * em.raLapPhuong(f), (1 - f) ** 1.5);
    veSao(nguon.x, nguon.y, 12 * (1 - f), f * 2, 1 - f);
  }

  return {
    doKichThuoc,
    batDauKhung,
    xoa,
    quang,
    veSao,
    thaHat,
    veHat,
    conHat,
    veDiemTu,
    veVet,
    veQuaCau,
    veVienCong,
    veSong,
    veLoe,
    veChamVe,
  };
}
