/**
 * Động cơ hạt cho hiệu ứng thưởng "rạch sáng": một canvas 2D phủ màn hình, vẽ cộng sáng ("lighter").
 * Hình phức tạp (tia thần, quầng sáng, vệt loé) vẽ sẵn một lần thành sprite rồi chỉ xoay/co giãn,
 * nên mỗi khung chỉ là vài drawImage. Chỉ chạy lúc tụ năng lượng / bay / rạch / mở / đóng cổng (~2 s) rồi dừng hẳn.
 */

export const MAU = {
  loi: "#fff7e6", // trắng nóng
  vang: "#ffd27a", // vàng kim
  hoPhach: "#ffab4c",
  tim: "#a77bff", // tím phép
  cham: "#5b3fd6", // chàm
  bang: "#8ef0ff", // lam băng, chỉ điểm xuyết
};

const TRAN_HAT = 1000;
const CHAM = 0;
const TIA = 1;
const HUT = 2;
const TAU = Math.PI * 2;

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function ngauNhien(min, max) {
  return min + Math.random() * (max - min);
}

function chon(ds) {
  return ds[Math.floor(Math.random() * ds.length)];
}

export const em = {
  raLapPhuong: (t) => 1 - (1 - t) ** 3,
  vaoLapPhuong: (t) => t * t * t,
  vaoRa: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  raMu: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
};

function taoCanvas(rong, cao = rong) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(rong));
  c.height = Math.max(1, Math.ceil(cao));
  return c;
}

function taoSpriteSang(mau) {
  const c = taoCanvas(64);
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,250,240,1)");
  grad.addColorStop(0.14, rgba(mau, 1));
  grad.addColorStop(0.4, rgba(mau, 0.3));
  grad.addColorStop(1, rgba(mau, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/** Ngôi sao 4 cánh ✦ — tia sáng mảnh ngang/dọc + lõi tròn */
function taoSpriteSao() {
  const c = taoCanvas(64);
  const g = c.getContext("2d");
  for (const doc of [false, true]) {
    const grad = doc ? g.createLinearGradient(0, 0, 0, 64) : g.createLinearGradient(0, 0, 64, 0);
    grad.addColorStop(0, "rgba(255,240,214,0)");
    grad.addColorStop(0.5, "rgba(255,250,240,1)");
    grad.addColorStop(1, "rgba(255,240,214,0)");
    g.fillStyle = grad;
    if (doc) g.fillRect(30.75, 0, 2.5, 64);
    else g.fillRect(0, 30.75, 64, 2.5);
  }
  const loi = g.createRadialGradient(32, 32, 0, 32, 32, 11);
  loi.addColorStop(0, "rgba(255,250,240,1)");
  loi.addColorStop(1, "rgba(255,210,122,0)");
  g.fillStyle = loi;
  g.fillRect(20, 20, 24, 24);
  return c;
}

/** Vệt loé ngang kiểu ống kính điện ảnh (anamorphic) */
function taoSpriteLoe() {
  const c = taoCanvas(256, 32);
  const g = c.getContext("2d");
  g.translate(128, 16);
  g.scale(8, 1);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 16);
  grad.addColorStop(0, "rgba(255,250,240,0.95)");
  grad.addColorStop(0.25, rgba(MAU.bang, 0.35));
  grad.addColorStop(1, rgba(MAU.tim, 0));
  g.fillStyle = grad;
  g.fillRect(-16, -16, 32, 32);
  return c;
}

/** Tia thần: các nan sáng mảnh toả từ tâm, mờ dần ra ngoài */
function taoSpriteTiaThan() {
  const s = 512;
  const c = taoCanvas(s);
  const g = c.getContext("2d");
  g.translate(s / 2, s / 2);
  for (let i = 0; i < 22; i += 1) {
    const goc = (i / 22) * TAU + ngauNhien(-0.06, 0.06);
    const rong = ngauNhien(0.012, 0.04);
    g.fillStyle = i % 3 === 0 ? "rgba(167,123,255,0.55)" : "rgba(255,226,160,0.75)";
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, s / 2, goc - rong, goc + rong);
    g.closePath();
    g.fill();
  }
  // Mờ dần theo bán kính
  g.globalCompositeOperation = "destination-in";
  const mask = g.createRadialGradient(0, 0, 0, 0, 0, s / 2);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(0.35, "rgba(0,0,0,0.6)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = mask;
  g.fillRect(-s / 2, -s / 2, s, s);
  return c;
}

/**
 * Đường bay (Bézier bậc 3) từ a tới b, không văng ra ngoài màn hình.
 * "s": cong chữ S, uốn về phía giữa màn hình (một cổng). "cung": vồng lên rồi rơi xuống (hai cổng hai bên).
 */
export function taoDuongBay(a, b, kieu = "s") {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dai = Math.hypot(dx, dy) || 1;
  const nx = -dy / dai;
  const ny = dx / dai;
  const kepX = (x) => Math.min(Math.max(x, 24), window.innerWidth - 24);
  const kepY = (y) => Math.min(Math.max(y, 24), window.innerHeight - 24);
  let p1;
  let p2;
  if (kieu === "cung") {
    const lech = Math.min(260, dai * 0.38) * (ny < 0 ? 1 : -1);
    p1 = { x: kepX(a.x + dx * 0.28 + nx * lech), y: kepY(a.y + dy * 0.28 + ny * lech) };
    p2 = { x: kepX(a.x + dx * 0.78 + nx * lech * 0.6), y: kepY(a.y + dy * 0.78 + ny * lech * 0.6) };
  } else {
    const lech = Math.min(220, dai * 0.42);
    const giuaX = window.innerWidth / 2;
    const huong = Math.abs(a.x + dx * 0.12 + nx * lech - giuaX) < Math.abs(a.x + dx * 0.12 - nx * lech - giuaX) ? 1 : -1;
    p1 = { x: kepX(a.x + dx * 0.12 + nx * lech * huong), y: kepY(a.y + dy * 0.12 + ny * lech * huong) };
    p2 = { x: kepX(a.x + dx * 0.72 - nx * lech * 0.55 * huong), y: kepY(a.y + dy * 0.72 - ny * lech * 0.55 * huong) };
  }

  return (t) => {
    const u = 1 - t;
    return {
      x: u * u * u * a.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * b.x,
      y: u * u * u * a.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * b.y,
    };
  };
}

export function taoDongCo(canvas) {
  const ctx = canvas.getContext("2d");
  const sang = Object.fromEntries(Object.entries(MAU).map(([ten, mau]) => [ten, taoSpriteSang(mau)]));
  const sao = taoSpriteSao();
  const loe = taoSpriteLoe();
  const tiaThan = taoSpriteTiaThan();
  // Máy yếu thật sự: ít hạt hơn, hình vẫn vậy
  const heSoHat = document.documentElement.classList.contains("may-yeu") ? 0.55 : 1;
  const hat = [];
  const vong = [];
  const hieuUng = [];
  let rong = 0;
  let cao = 0;
  let dpr = 1;
  let duTu = 0;

  function doKichThuoc() {
    // Hạt toàn là quầng mờ: 1,5x là đủ nét, đỡ tốn hơn nhiều so với DPR 3 của điện thoại
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    rong = window.innerWidth;
    cao = window.innerHeight;
    canvas.width = Math.round(rong * dpr);
    canvas.height = Math.round(cao * dpr);
  }

  function them(p) {
    if (hat.length >= TRAN_HAT) return;
    hat.push({ tuoi: 0, vx: 0, vy: 0, drag: 0.96, g: 0, s1: 0, a0: 1, vao: 0.15, lap: 0, pha: Math.random() * 6, ...p });
  }

  function themVong(v) {
    vong.push({ tuoi: 0, ...v });
  }

  function anhSang() {
    const r = Math.random();
    if (r < 0.42) return sang.vang;
    if (r < 0.62) return sang.hoPhach;
    if (r < 0.86) return sang.tim;
    if (r < 0.95) return sang.cham;
    return sang.bang;
  }

  function capNhat(dt) {
    for (let i = hat.length - 1; i >= 0; i -= 1) {
      const p = hat[i];
      p.tuoi += dt;
      if (p.tuoi >= p.tho) {
        hat[i] = hat[hat.length - 1];
        hat.pop();
        continue;
      }
      if (p.kieu === HUT) {
        // Xoáy ốc vào tâm: bán kính co lại, góc quay thêm
        const e = (p.tuoi / p.tho) ** 1.6;
        const r = p.r0 * (1 - e);
        const goc = p.goc0 + p.xoay * e;
        p.x = p.tx + Math.cos(goc) * r;
        p.y = p.ty + Math.sin(goc) * r;
        continue;
      }
      const k = p.drag ** (dt / 16.67);
      p.vx *= k;
      p.vy = p.vy * k + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = vong.length - 1; i >= 0; i -= 1) {
      vong[i].tuoi += dt;
      if (vong[i].tuoi >= vong[i].tho) vong.splice(i, 1);
    }
    for (let i = hieuUng.length - 1; i >= 0; i -= 1) {
      hieuUng[i].tuoi += dt;
      if (hieuUng[i].tuoi >= hieuUng[i].tho) hieuUng.splice(i, 1);
    }
  }

  function veAnh(anh, x, y, s, a, xoay = 0, sy = s) {
    if (a <= 0.01) return;
    ctx.globalAlpha = Math.min(1, a);
    if (!xoay) {
      ctx.drawImage(anh, x - s / 2, y - sy / 2, s, sy);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(xoay);
    ctx.drawImage(anh, -s / 2, -sy / 2, s, sy);
    ctx.restore();
  }

  function ve() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, rong, cao);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const h of hieuUng) h.ve(h.tuoi / h.tho);

    for (const p of hat) {
      const f = p.tuoi / p.tho;
      if (p.kieu === TIA) {
        ctx.globalAlpha = p.a0 * (1 - f);
        ctx.strokeStyle = p.mau;
        ctx.lineWidth = p.s0 * (1 - f * 0.7);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * p.dai, p.y - p.vy * p.dai);
        ctx.stroke();
        continue;
      }
      let a = p.kieu === HUT ? p.a0 * Math.min(1, f * 3) : p.a0 * (p.vao && f < p.vao ? f / p.vao : 1 - (f - p.vao) / (1 - p.vao));
      if (p.lap) a *= 0.5 + 0.5 * Math.sin(p.tuoi * p.lap + p.pha);
      if (a <= 0.01) continue;
      const s = p.s0 + (p.s1 - p.s0) * f;
      ctx.globalAlpha = a;
      ctx.drawImage(p.anh, p.x - s / 2, p.y - s / 2, s, s);
    }

    for (const v of vong) {
      const f = v.tuoi / v.tho;
      const r = v.r0 + (v.r1 - v.r0) * em.raMu(f);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(v.mau, 0.22 * (1 - f) ** 1.4);
      ctx.lineWidth = v.w * 4 * (1 - f) + 1;
      ctx.beginPath();
      ctx.arc(v.x, v.y, r, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = rgba(v.mau, 0.9 * (1 - f) ** 1.5);
      ctx.lineWidth = v.w * (1 - f) + 0.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Tụ năng lượng ở đầu thanh tiến độ: bụi xoáy ốc vào tâm, quả cầu sáng đập nhịp + chữ thập loé quang học */
  function tuNangLuong(nguon, t, dt, k) {
    duTu += dt * 0.12 * k * heSoHat;
    for (; duTu >= 1; duTu -= 1) {
      them({
        kieu: HUT,
        tx: nguon.x,
        ty: nguon.y,
        x: nguon.x,
        y: nguon.y,
        r0: ngauNhien(46, 100),
        goc0: Math.random() * TAU,
        xoay: ngauNhien(2.2, 3.6),
        tho: ngauNhien(380, 600),
        s0: ngauNhien(5, 10),
        s1: 3,
        anh: Math.random() < 0.22 ? sao : anhSang(),
      });
    }
    const vao = Math.min(1, t / 320);
    const lon = vao * (1 + 0.12 * Math.sin(t * 0.018)) * k;
    veAnh(sang.tim, nguon.x, nguon.y, 90 * lon, 0.55);
    veAnh(sang.vang, nguon.x, nguon.y, 36 * lon, 0.95);
    veAnh(loe, nguon.x, nguon.y, 150 * lon, 0.7 * vao, 0, 18 * lon);
    veAnh(loe, nguon.x, nguon.y, 70 * lon, 0.35 * vao, Math.PI / 2, 10 * lon);
    veAnh(sao, nguon.x, nguon.y, 56 * lon, 0.9, t * 0.004);
  }

  /**
   * Tia năng lượng: đuôi là dải lụa vuốt nhọn (một hình liền, tô gradient tím → vàng → trắng),
   * hai vệt xoắn quấn quanh đầu tia, bụi sao rơi lại phía sau.
   */
  function veSaoChoi(tu, den, vet, t, k) {
    vet.push({ x: den.x, y: den.y, t });
    while (vet.length > 2 && t - vet[0].t > 200) vet.shift();

    const n = vet.length;
    if (n >= 3) {
      const dauX = vet[n - 1].x;
      const dauY = vet[n - 1].y;
      const veLua = (heSoRong, mauDuoi, mauGiua, mauDau) => {
        const trai = [];
        const phai = [];
        for (let i = 0; i < n; i += 1) {
          const a = vet[Math.max(0, i - 1)];
          const b = vet[Math.min(n - 1, i + 1)];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const f = i / (n - 1);
          const w = (0.4 + 4.6 * f ** 1.6) * k * heSoRong;
          trai.push(vet[i].x - (dy / d) * w, vet[i].y + (dx / d) * w);
          phai.push(vet[i].x + (dy / d) * w, vet[i].y - (dx / d) * w);
        }
        const grad = ctx.createLinearGradient(vet[0].x, vet[0].y, dauX, dauY);
        grad.addColorStop(0, mauDuoi);
        grad.addColorStop(0.55, mauGiua);
        grad.addColorStop(1, mauDau);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(trai[0], trai[1]);
        for (let i = 2; i < trai.length; i += 2) ctx.lineTo(trai[i], trai[i + 1]);
        for (let i = phai.length - 2; i >= 0; i -= 2) ctx.lineTo(phai[i], phai[i + 1]);
        ctx.closePath();
        ctx.globalAlpha = 1;
        ctx.fill();
      };
      veLua(2.6, rgba(MAU.cham, 0), rgba(MAU.tim, 0.3), rgba(MAU.tim, 0.45));
      veLua(1, rgba(MAU.tim, 0), rgba(MAU.vang, 0.7), rgba(MAU.loi, 0.95));
    }

    // Hai vệt xoắn quanh đầu tia
    const huongX = n >= 2 ? den.x - vet[n - 2].x : 1;
    const huongY = n >= 2 ? den.y - vet[n - 2].y : 0;
    const dd = Math.hypot(huongX, huongY) || 1;
    for (let i = 0; i < 2; i += 1) {
      const pha = t * 0.028 + i * Math.PI;
      const lech = Math.sin(pha) * 14 * k;
      const x = den.x - (huongY / dd) * lech - (huongX / dd) * 6;
      const y = den.y + (huongX / dd) * lech - (huongY / dd) * 6;
      veAnh(i ? sang.bang : sang.tim, x, y, 22 * k, 0.8);
      them({ kieu: CHAM, x, y, tho: ngauNhien(260, 420), s0: 9 * k, s1: 1, a0: 0.75, vao: 0, anh: i ? sang.bang : sang.tim });
    }

    // Bụi sao rơi lại dọc đoạn vừa bay (không hở khi bay nhanh)
    const dx = den.x - tu.x;
    const dy = den.y - tu.y;
    const buoc = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (9 / heSoHat)));
    for (let i = 1; i <= buoc; i += 1) {
      const x = tu.x + (dx * i) / buoc;
      const y = tu.y + (dy * i) / buoc;
      them({
        kieu: CHAM,
        x: x + ngauNhien(-4, 4),
        y: y + ngauNhien(-4, 4),
        vx: ngauNhien(-0.03, 0.03),
        vy: ngauNhien(-0.02, 0.03),
        g: 0.00012,
        tho: ngauNhien(380, 760),
        s0: ngauNhien(6, 12) * k,
        s1: 1,
        a0: 0.8,
        anh: anhSang(),
      });
      if (Math.random() < 0.25) {
        them({
          kieu: CHAM,
          x: x + ngauNhien(-10, 10),
          y: y + ngauNhien(-10, 10),
          vx: ngauNhien(-0.03, 0.03),
          vy: ngauNhien(0, 0.04),
          g: 0.0002,
          tho: ngauNhien(700, 1100),
          s0: ngauNhien(7, 13),
          s1: 2,
          a0: 0.95,
          lap: ngauNhien(0.02, 0.04),
          anh: sao,
        });
      }
    }

    // Đầu tia
    veAnh(sang.tim, den.x, den.y, 110 * k, 0.55);
    veAnh(sang.vang, den.x, den.y, 46 * k, 0.95);
    veAnh(sang.loi, den.x, den.y, 20 * k, 1);
    veAnh(loe, den.x, den.y, 130 * k, 0.55, 0, 14 * k);
    veAnh(sao, den.x, den.y, 60 * k, 0.9, t * 0.006);
  }

  function chopSang(tam, s0, s1, tho, a0, anh = sang.loi) {
    them({ kieu: CHAM, x: tam.x, y: tam.y, tho, s0, s1, a0, vao: 0, drag: 1, anh });
  }

  function tiaLua(tam, so, tocDo, tho, dai, ds = [MAU.loi, MAU.vang, MAU.vang, MAU.hoPhach, MAU.tim, MAU.bang]) {
    for (let i = 0; i < so; i += 1) {
      const goc = Math.random() * TAU;
      const v = ngauNhien(tocDo[0], tocDo[1]);
      them({
        kieu: TIA,
        x: tam.x,
        y: tam.y,
        vx: Math.cos(goc) * v,
        vy: Math.sin(goc) * v,
        drag: 0.935,
        g: 0.0006,
        tho: ngauNhien(tho[0], tho[1]),
        s0: ngauNhien(1.4, 2.8),
        dai: ngauNhien(dai[0], dai[1]),
        a0: 1,
        mau: chon(ds),
      });
    }
  }

  /** Tia thần xoay chậm toả từ tâm, sáng bùng rồi tắt dần */
  function themTiaThan(tam, kich, tho) {
    const xoay0 = Math.random() * TAU;
    hieuUng.push({
      tuoi: 0,
      tho,
      ve: (f) => {
        const a = f < 0.12 ? f / 0.12 : (1 - f) ** 1.6;
        veAnh(tiaThan, tam.x, tam.y, kich * (0.7 + 0.5 * em.raLapPhuong(f)), 0.85 * a, xoay0 + f * 0.5);
        veAnh(tiaThan, tam.x, tam.y, kich * 0.75, 0.45 * a, -xoay0 - f * 0.8);
      },
    });
  }

  /** Vệt loé ngang kiểu ống kính điện ảnh: duỗi dài ra rồi tắt */
  function themLoe(tam, dai, cao, tho, a0) {
    hieuUng.push({
      tuoi: 0,
      tho,
      ve: (f) => veAnh(loe, tam.x, tam.y, dai * (0.35 + 0.65 * em.raMu(f)), a0 * (1 - f) ** 1.3, 0, cao * (1 - 0.5 * f)),
    });
  }

  /** Tia năng lượng chạm đích: chớp trắng, tia thần, vệt loé ngang, tia lửa văng, bụi sao lơ lửng */
  function no(tam, k) {
    chopSang(tam, 60, 320 * k, 320, 0.95);
    chopSang(tam, 90, 460 * k, 600, 0.45, sang.tim);
    themTiaThan(tam, 620 * k, 1100);
    themLoe(tam, 640 * k, 30 * k, 620, 0.9);
    tiaLua(tam, Math.round(54 * k * heSoHat), [0.3, 1.2], [450, 900], [24, 38]);
    for (let i = 0, so = Math.round(26 * k * heSoHat); i < so; i += 1) {
      const goc = Math.random() * TAU;
      const v = ngauNhien(0.05, 0.28);
      them({
        kieu: CHAM,
        x: tam.x,
        y: tam.y,
        vx: Math.cos(goc) * v,
        vy: Math.sin(goc) * v - 0.05,
        g: 0.0001,
        drag: 0.97,
        tho: ngauNhien(900, 1500),
        s0: ngauNhien(7, 13),
        s1: 2,
        a0: 0.95,
        lap: 0.025,
        anh: Math.random() < 0.7 ? sao : sang.bang,
      });
    }
  }

  /** Một đường sáng dọc x, từ y0 tới y1: quầng tím rộng, thân chàm, hai sợi lệch màu (lam/hổ phách), lõi trắng */
  function veDuongSang(x, y0, y1, doSang, day = 1) {
    if (doSang <= 0.01 || y1 - y0 < 1) return;
    const net = (mau, w, dx = 0) => {
      ctx.strokeStyle = mau;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x + dx, y0);
      ctx.lineTo(x + dx, y1);
      ctx.stroke();
    };
    // Quầng sáng nhất ở giữa, nhạt dần về hai đầu
    const quang = ctx.createLinearGradient(x, y0, x, y1);
    quang.addColorStop(0, rgba(MAU.tim, 0.06));
    quang.addColorStop(0.5, rgba(MAU.tim, 0.34));
    quang.addColorStop(1, rgba(MAU.tim, 0.06));
    ctx.globalAlpha = Math.min(1, doSang);
    net(quang, 30 * day);
    net(rgba(MAU.cham, 0.4), 9 * day);
    net(rgba(MAU.bang, 0.6), 1.6 * day, -2 * day);
    net(rgba(MAU.hoPhach, 0.6), 1.6 * day, 2 * day);
    net(rgba(MAU.loi, 1), 1.8 * day);
    ctx.globalAlpha = 1;
  }

  function trongKhung(rect, banKinh, ve) {
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(rect.left, rect.top, rect.width, rect.height, banKinh);
    else ctx.rect(rect.left, rect.top, rect.width, rect.height);
    ctx.clip();
    ve();
    ctx.restore();
  }

  /** Từ vừa học hiện giữa đường rạch: chữ giãn rộng rồi khít lại, tách màu nhẹ hai bên như ống kính */
  function veChuGiua(tam, rect, tuVung, hien, t) {
    const tu = (tuVung || "").trim().toUpperCase().slice(0, 18);
    if (!tu || hien <= 0.01) return;
    const giai = 1 - em.raLapPhuong(Math.min(1, hien));
    const font = (co) => `700 ${co}px "Bricolage Grotesque", "Be Vietnam Pro", system-ui, sans-serif`;
    let co = Math.min(rect.width * 0.12, 46);
    ctx.font = font(co);
    const doRong = (c) => [...tu].reduce((tong, kt) => tong + ctx.measureText(kt).width + c * (0.12 + 0.5 * giai), -c * (0.12 + 0.5 * giai));
    const toiDa = rect.width * 0.82;
    const rong = doRong(co);
    if (rong > toiDa) {
      co *= toiDa / rong;
      ctx.font = font(co);
    }
    const gian = co * (0.12 + 0.5 * giai);
    const cacKyTu = [...tu].map((kt) => ({ kt, w: ctx.measureText(kt).width }));
    const tong = cacKyTu.reduce((s, c) => s + c.w + gian, -gian);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const y = tam.y + Math.sin(t * 0.004) * 1.5;
    const ve = (mau, dx = 0) => {
      ctx.fillStyle = mau;
      let x = tam.x - tong / 2 + dx;
      for (const c of cacKyTu) {
        ctx.fillText(c.kt, x, y);
        x += c.w + gian;
      }
    };
    ctx.globalAlpha = Math.min(1, hien);
    ve(rgba(MAU.bang, 0.5), -1.5);
    ve(rgba(MAU.hoPhach, 0.5), 1.5);
    ve(rgba(MAU.loi, 0.95));
    veAnh(loe, tam.x, tam.y, tong * 1.8, 0.35 * Math.min(1, hien), 0, co * 0.9);
    ctx.globalAlpha = 1;
  }

  /**
   * Rạch sáng: đường sáng dọc mọc từ tâm cổng lên/xuống hai mép (v: 0→1), đầu mút loé sáng,
   * vệt loé ngang ở giữa. Đóng cổng thì gọi ngược v: 1→0.
   */
  function veRach(tam, rect, banKinh, v, doSang = 1) {
    const nua = (rect.height / 2) * v;
    trongKhung(rect, banKinh, () => veDuongSang(tam.x, tam.y - nua, tam.y + nua, doSang));
    if (v < 1) {
      for (const dau of [-1, 1]) {
        const y = tam.y + dau * nua;
        veAnh(sang.tim, tam.x, y, 60, 0.5 * doSang);
        veAnh(sang.loi, tam.x, y, 18, doSang);
        veAnh(sao, tam.x, y, 34, 0.9 * doSang);
      }
    }
    veAnh(loe, tam.x, tam.y, rect.width * 1.6, 0.6 * doSang, 0, 22);
    veAnh(sang.loi, tam.x, tam.y, 26, doSang);
  }

  /**
   * Màn sáng tách đôi: hai mép sáng dọc chạy từ đường rạch ra hai thành cổng (mo: 0→1), video lộ dần ở giữa.
   * chieu: 1 mở (tia lửa văng ra ngoài), -1 khép (tia lửa hút vào giữa).
   */
  function veTachDoi(tam, rect, banKinh, mo, chieu = 1) {
    const nua = (rect.width / 2) * mo;
    // Mép càng gần thành cổng càng mờ đi, nhường cho viền cổng
    const doSang = 1 - Math.max(0, (mo - 0.8) / 0.2) * 0.7;
    trongKhung(rect, banKinh, () => {
      // Hắt sáng mỏng ngay sau mép, như màn sáng vừa lướt qua
      const loang = Math.min(nua, 60);
      if (loang > 1) {
        for (const huong of [-1, 1]) {
          const x = tam.x + huong * nua;
          const grad = ctx.createLinearGradient(x, 0, x - huong * loang, 0);
          grad.addColorStop(0, rgba(MAU.tim, 0.28 * doSang));
          grad.addColorStop(1, rgba(MAU.tim, 0));
          ctx.globalAlpha = 1;
          ctx.fillStyle = grad;
          ctx.fillRect(Math.min(x, x - huong * loang), rect.top, loang, rect.height);
        }
      }
      veDuongSang(tam.x - nua, rect.top, rect.bottom, doSang, 1.1);
      veDuongSang(tam.x + nua, rect.top, rect.bottom, doSang, 1.1);
    });

    for (let i = 0, so = Math.round(8 * heSoHat); i < so; i += 1) {
      const huong = Math.random() < 0.5 ? -1 : 1;
      const x = tam.x + huong * nua;
      if (x < rect.left + 4 || x > rect.right - 4) continue;
      them({
        kieu: TIA,
        x,
        y: ngauNhien(rect.top + 8, rect.bottom - 8),
        vx: huong * chieu * ngauNhien(0.2, 0.5),
        vy: ngauNhien(-0.12, 0.12),
        drag: 0.9,
        g: 0.0004,
        tho: ngauNhien(180, 340),
        s0: ngauNhien(1, 2.2),
        dai: ngauNhien(12, 22),
        a0: 1,
        mau: chon([MAU.loi, MAU.bang, MAU.vang, MAU.tim]),
      });
    }
  }

  /** Cổng vừa mở trọn: một lớp sáng phủ khung cổng loé lên rồi tan */
  function loeKhung(rect, banKinh) {
    hieuUng.push({
      tuoi: 0,
      tho: 420,
      ve: (f) =>
        trongKhung(rect, banKinh, () => {
          ctx.globalAlpha = 0.32 * (1 - f) ** 2;
          ctx.fillStyle = MAU.loi;
          ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
          ctx.globalAlpha = 1;
        }),
    });
  }

  /** Cổng khép lại thành một đốm */
  function chop(tam, k) {
    chopSang(tam, 30, 150 * k, 260, 0.9);
    chopSang(tam, 40, 220 * k, 380, 0.4, sang.tim);
    themLoe(tam, 320 * k, 18 * k, 360, 0.8);
  }

  /** Đốm sáng về tới thanh tiến độ */
  function chamVe(nguon, k) {
    chopSang(nguon, 20, 120 * k, 280, 0.9);
    themVong({ x: nguon.x, y: nguon.y, r0: 4, r1: 64 * k, tho: 400, w: 2, mau: MAU.vang });
    tiaLua(nguon, Math.round(16 * heSoHat), [0.2, 0.6], [300, 500], [16, 24]);
  }

  return {
    doKichThuoc,
    capNhat,
    ve,
    conHat: () => hat.length > 0 || vong.length > 0 || hieuUng.length > 0,
    xoaHet() {
      hat.length = 0;
      vong.length = 0;
      hieuUng.length = 0;
      duTu = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    tuNangLuong,
    veSaoChoi,
    no,
    veRach,
    veTachDoi,
    veChuGiua,
    loeKhung,
    chop,
    chamVe,
  };
}
