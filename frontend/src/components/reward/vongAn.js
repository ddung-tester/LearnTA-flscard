/**
 * Nét vẽ cho hiệu ứng thưởng "vòng ấn": một canvas 2D phủ màn hình, cộng sáng ("lighter").
 * Chỉ vẽ nét mảnh (đường, cung, vạch), không có hạt, nên mỗi khung chỉ vài chục lệnh stroke.
 * Bảng màu lấy từ tông giấy – mật ong – hổ phách của trang (index.css: --mau-giay, --mau-nen, --mau-progress-end).
 */

export const MAU = {
  kem: [255, 244, 220], // ánh sáng chính, gần --mau-giay
  matOng: [255, 213, 138], // gần --mau-nen
  hoPhach: [245, 166, 35], // gần --mau-progress-end
  son: [226, 96, 63], // điểm nhấn hiếm, gần --mau-le-do
};

const TAU = Math.PI * 2;

const mau = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;
const kep = (x, min = 0, max = 1) => Math.min(max, Math.max(min, x));
/** Tiến độ cục bộ của một nét trong khoảng [tu, tu + dai] của tiến độ chung */
const doan = (t, tu, dai) => kep((t - tu) / dai);

export const em = {
  raLapPhuong: (t) => 1 - (1 - t) ** 3,
  raMu: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  vaoLapPhuong: (t) => t * t * t,
  vaoRa: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  // Êm hơn vaoRa ở hai đầu, dùng cho chuyển động dài
  vaoRaMem: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

export function taoVongAn(canvas) {
  const ctx = canvas.getContext("2d");
  let rong = 0;
  let cao = 0;
  let dpr = 1;

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
  }

  /** Nét có quầng: một lượt rộng mờ rồi một lượt mảnh sáng, thay cho shadowBlur (đắt) */
  function net(veDuong, mauNet, w, a) {
    if (a <= 0.01) return;
    ctx.strokeStyle = mau(mauNet, 0.16 * a);
    ctx.lineWidth = w * 5;
    ctx.beginPath();
    veDuong();
    ctx.stroke();
    ctx.strokeStyle = mau(mauNet, 0.9 * a);
    ctx.lineWidth = w;
    ctx.stroke();
  }

  /** Quầng tròn mềm */
  function quang(x, y, r, mauQuang, a) {
    if (a <= 0.01 || r <= 0.5) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, mau(MAU.kem, a));
    g.addColorStop(0.18, mau(mauQuang, a * 0.55));
    g.addColorStop(1, mau(mauQuang, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /** Điểm tụ ở thanh tiến độ: một đốm mật ong thở nhẹ */
  function veDiemTu(nguon, t, a = 1) {
    const tho = 1 + 0.08 * Math.sin(t * 0.008);
    quang(nguon.x, nguon.y, 26 * tho, MAU.hoPhach, 0.5 * a);
    quang(nguon.x, nguon.y, 7, MAU.matOng, 0.9 * a);
  }

  /**
   * Tia sáng thẳng từ a tới b, u: 0→1 là vị trí đầu tia. Đuôi dài ~35% quãng đường, nhạt dần về sau.
   */
  function veTia(a, b, u, doSang = 1) {
    const dau = kep(u);
    const duoi = kep(u - 0.35);
    if (dau - duoi < 0.001) return;
    const x0 = a.x + (b.x - a.x) * duoi;
    const y0 = a.y + (b.y - a.y) * duoi;
    const x1 = a.x + (b.x - a.x) * dau;
    const y1 = a.y + (b.y - a.y) * dau;
    for (const [w, al] of [[7, 0.12], [1.6, 0.95]]) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, mau(MAU.hoPhach, 0));
      g.addColorStop(0.7, mau(MAU.matOng, al * 0.6 * doSang));
      g.addColorStop(1, mau(MAU.kem, al * doSang));
      ctx.strokeStyle = g;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    if (u < 1) quang(x1, y1, 16, MAU.matOng, 0.8 * doSang);
  }

  /**
   * Vòng ấn: 3 vòng tròn, 2 hình vuông lồng, vành vạch chia, 6 chấm.
   * tienDo 0→1: các nét được vẽ dần lệch nhịp nhau. xoay (rad), coGian, a: độ sáng chung.
   */
  function veVong(tam, R, { tienDo = 1, xoay = 0, coGian = 1, a = 1 } = {}) {
    if (a <= 0.01) return;
    ctx.save();
    ctx.translate(tam.x, tam.y);
    ctx.rotate(xoay);
    ctx.scale(coGian, coGian);
    const w = 1.1 / coGian;

    const p1 = em.raLapPhuong(doan(tienDo, 0, 0.62));
    if (p1 > 0) net(() => ctx.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + TAU * p1), MAU.kem, w * 1.1, a);

    const p2 = em.raLapPhuong(doan(tienDo, 0.1, 0.55));
    if (p2 > 0) net(() => ctx.arc(0, 0, R * 0.8, Math.PI / 2, Math.PI / 2 - TAU * p2, true), MAU.matOng, w, a * 0.9);

    // Hai hình vuông nội tiếp vòng giữa, lệch 45°
    const p3 = em.raLapPhuong(doan(tienDo, 0.2, 0.6));
    if (p3 > 0) {
      for (const lech of [0, Math.PI / 4]) {
        const dinh = [0, 1, 2, 3, 4].map((i) => [Math.cos(lech + (i * Math.PI) / 2) * R * 0.8, Math.sin(lech + (i * Math.PI) / 2) * R * 0.8]);
        net(() => {
          const quang4 = p3 * 4;
          ctx.moveTo(dinh[0][0], dinh[0][1]);
          for (let i = 1; i <= 4; i += 1) {
            const f = kep(quang4 - (i - 1));
            if (f <= 0) break;
            ctx.lineTo(dinh[i - 1][0] + (dinh[i][0] - dinh[i - 1][0]) * f, dinh[i - 1][1] + (dinh[i][1] - dinh[i - 1][1]) * f);
          }
        }, lech ? MAU.hoPhach : MAU.matOng, w * 0.85, a * 0.75);
      }
    }

    const p4 = em.raLapPhuong(doan(tienDo, 0.3, 0.5));
    if (p4 > 0) net(() => ctx.arc(0, 0, R * 0.3, 0, TAU * p4), MAU.kem, w, a * 0.85);

    // Vành vạch chia: vạch hiện lần lượt theo chiều kim đồng hồ
    const p5 = doan(tienDo, 0.25, 0.6);
    if (p5 > 0) {
      ctx.strokeStyle = mau(MAU.matOng, 0.75 * a);
      for (let i = 0; i < 48; i += 1) {
        const f = kep(p5 * 48 - i);
        if (f <= 0) break;
        const goc = (i / 48) * TAU - Math.PI / 2;
        const dai = i % 6 === 0 ? 0.1 : 0.045;
        ctx.globalAlpha = f * (i % 6 === 0 ? 1 : 0.55);
        ctx.lineWidth = (i % 6 === 0 ? 1.2 : 0.8) / coGian;
        ctx.beginPath();
        ctx.moveTo(Math.cos(goc) * R * 0.86, Math.sin(goc) * R * 0.86);
        ctx.lineTo(Math.cos(goc) * R * (0.86 + dai), Math.sin(goc) * R * (0.86 + dai));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Sáu chấm ngoài vành, một chấm son làm điểm nhấn
    const p6 = doan(tienDo, 0.55, 0.4);
    if (p6 > 0) {
      for (let i = 0; i < 6; i += 1) {
        const f = kep(p6 * 6 - i);
        const goc = (i / 6) * TAU - Math.PI / 2 + Math.PI / 6;
        ctx.fillStyle = mau(i === 0 ? MAU.son : MAU.matOng, 0.9 * f * a);
        ctx.beginPath();
        ctx.arc(Math.cos(goc) * R * 1.13, Math.sin(goc) * R * 1.13, 1.8 / coGian, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** Từ vừa học ở tâm vòng: giãn chữ rộng rồi khít lại khi hiện */
  function veChu(tam, R, tuVung, hien) {
    const tu = (tuVung || "").trim().toUpperCase().slice(0, 18);
    if (!tu || hien <= 0.01) return;
    const giai = 1 - em.raLapPhuong(kep(hien));
    const font = (co) => `600 ${co}px "Bricolage Grotesque", "Be Vietnam Pro", system-ui, sans-serif`;
    let co = Math.min(R * 0.26, 22);
    ctx.font = font(co);
    const cacKyTu = () => [...tu].map((kt) => ({ kt, w: ctx.measureText(kt).width }));
    let ds = cacKyTu();
    let gian = co * (0.2 + 0.5 * giai);
    let tong = ds.reduce((s, c) => s + c.w + gian, -gian);
    const toiDa = R * 2.1;
    if (tong > toiDa) {
      co *= toiDa / tong;
      ctx.font = font(co);
      ds = cacKyTu();
      gian = co * (0.2 + 0.5 * giai);
      tong = ds.reduce((s, c) => s + c.w + gian, -gian);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = kep(hien);
    ctx.fillStyle = mau(MAU.kem, 1);
    let x = tam.x - tong / 2;
    for (const c of ds) {
      ctx.fillText(c.kt, x, tam.y);
      x += c.w + gian;
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "lighter";
  }

  /** Loé mềm ở tâm khi vòng bung ra: quầng tròn + vệt ngang mảnh */
  function veLoe(tam, f, rongKhung) {
    const a = f < 0.2 ? f / 0.2 : (1 - f) ** 1.6;
    quang(tam.x, tam.y, 40 + 120 * em.raLapPhuong(f), MAU.matOng, 0.45 * a);
    const dai = rongKhung * (0.3 + 0.7 * em.raMu(f));
    const g = ctx.createLinearGradient(tam.x - dai / 2, 0, tam.x + dai / 2, 0);
    g.addColorStop(0, mau(MAU.hoPhach, 0));
    g.addColorStop(0.5, mau(MAU.kem, 0.7 * a));
    g.addColorStop(1, mau(MAU.hoPhach, 0));
    ctx.fillStyle = g;
    ctx.fillRect(tam.x - dai / 2, tam.y - 0.75, dai, 1.5);
  }

  /** Mép vòng sáng chạy theo mép mặt nạ khi video mở / khép */
  function veMepMo(tam, r, a) {
    if (r < 2 || a <= 0.01) return;
    net(() => ctx.arc(tam.x, tam.y, r, 0, TAU), MAU.matOng, 1.2, a);
  }

  /** Bốn góc khung: trượt từ ngoài vào và hiện dần; a: độ sáng */
  function veGoc(rect, banKinh, f, a = 1) {
    if (a <= 0.01) return;
    const lech = 12 * (1 - em.raLapPhuong(f));
    const canh = Math.min(34, rect.width * 0.14);
    const goc = [
      [rect.left, rect.top, 1, 1],
      [rect.right, rect.top, -1, 1],
      [rect.left, rect.bottom, 1, -1],
      [rect.right, rect.bottom, -1, -1],
    ];
    for (const [x0, y0, sx, sy] of goc) {
      const x = x0 - sx * lech;
      const y = y0 - sy * lech;
      net(() => {
        ctx.moveTo(x, y + sy * canh);
        ctx.lineTo(x, y + sy * banKinh);
        ctx.quadraticCurveTo(x, y, x + sx * banKinh, y);
        ctx.lineTo(x + sx * canh, y);
      }, MAU.matOng, 1.6, a * kep(f * 1.4));
    }
  }

  /** Đốm sáng về tới thanh tiến độ: một vòng mảnh nở ra */
  function veChamVe(nguon, f) {
    quang(nguon.x, nguon.y, 18 + 20 * f, MAU.matOng, 0.7 * (1 - f));
    net(() => ctx.arc(nguon.x, nguon.y, 4 + 36 * em.raLapPhuong(f), 0, TAU), MAU.matOng, 1, (1 - f) ** 1.5);
  }

  /** Vẽ trong khung cổng (bo góc), nét không tràn ra ngoài */
  function trongKhung(rect, banKinh, ve) {
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(rect.left, rect.top, rect.width, rect.height, banKinh);
    else ctx.rect(rect.left, rect.top, rect.width, rect.height);
    ctx.clip();
    ve();
    ctx.restore();
  }

  return { doKichThuoc, batDauKhung, xoa, veDiemTu, veTia, veVong, veChu, veLoe, veMepMo, veGoc, veChamVe, quang, trongKhung };
}
