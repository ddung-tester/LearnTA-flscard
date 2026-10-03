/**
 * Động cơ hạt cho hiệu ứng thưởng "mực vàng bốc lửa": một canvas 2D phủ màn hình, vẽ cộng sáng
 * ("lighter") bằng sprite vẽ sẵn. Chỉ chạy lúc tụ phép / bay / mở / đóng cổng (~2 s) rồi dừng hẳn —
 * lúc phát video canvas ẩn, không tốn gì.
 */

export const MAU = {
  loi: "#fff4d6",
  vang: "#ffc94d",
  hoPhach: "#f59e0b",
  thanHong: "#ff6b3d",
  sanHo: "#e0457b",
  tim: "#9b3fd1",
};

const TRAN_HAT = 900;
const CHAM = 0;
const TIA = 1;
const HUT = 2;

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
};

function taoSpriteSang(mau) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,250,236,1)");
  grad.addColorStop(0.16, rgba(mau, 1));
  grad.addColorStop(0.42, rgba(mau, 0.32));
  grad.addColorStop(1, rgba(mau, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/** Ngôi sao 4 cánh ✦ — tia sáng mảnh ngang/dọc + lõi tròn */
function taoSpriteSao() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  for (const doc of [false, true]) {
    const grad = doc ? g.createLinearGradient(0, 0, 0, 64) : g.createLinearGradient(0, 0, 64, 0);
    grad.addColorStop(0, "rgba(255,244,214,0)");
    grad.addColorStop(0.5, "rgba(255,250,236,1)");
    grad.addColorStop(1, "rgba(255,244,214,0)");
    g.fillStyle = grad;
    if (doc) g.fillRect(30.5, 0, 3, 64);
    else g.fillRect(0, 30.5, 64, 3);
  }
  const loi = g.createRadialGradient(32, 32, 0, 32, 32, 12);
  loi.addColorStop(0, "rgba(255,250,236,1)");
  loi.addColorStop(1, "rgba(255,201,77,0)");
  g.fillStyle = loi;
  g.fillRect(20, 20, 24, 24);
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

/** Mép lỗ cháy: vòng tròn bán kính R, méo theo 4 sóng sin lệch nhịp (không thành hình hoa đều); pha đổi theo thời gian → mép lập loè */
export function diemMepChay(tam, R, bienDo, pha, n = 64) {
  const ds = [];
  for (let i = 0; i < n; i += 1) {
    const g = (i / n) * Math.PI * 2;
    const nhieu =
      0.38 * Math.sin(3 * g + pha) +
      0.28 * Math.sin(7 * g - pha * 1.3 + 2.1) +
      0.2 * Math.sin(13 * g + pha * 2 + 4.4) +
      0.14 * Math.sin(23 * g - pha * 2.7 + 1.2);
    const r = Math.max(0, R + bienDo * nhieu);
    ds.push(tam.x + r * Math.cos(g), tam.y + r * Math.sin(g));
  }
  return ds;
}

/** clip-path polygon theo toạ độ của phần tử (rect) */
export function clipTuDiem(ds, rect) {
  let s = "";
  for (let i = 0; i < ds.length; i += 2) {
    s += `${i ? "," : ""}${(ds[i] - rect.left).toFixed(1)}px ${(ds[i + 1] - rect.top).toFixed(1)}px`;
  }
  return `polygon(${s})`;
}

export function taoDongCo(canvas) {
  const ctx = canvas.getContext("2d");
  const sang = Object.fromEntries(Object.entries(MAU).map(([ten, mau]) => [ten, taoSpriteSang(mau)]));
  const sao = taoSpriteSao();
  // Máy yếu thật sự: ít hạt hơn, hình vẫn vậy
  const heSoHat = document.documentElement.classList.contains("may-yeu") ? 0.6 : 1;
  const hat = [];
  const vong = [];
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
    if (r < 0.4) return sang.vang;
    if (r < 0.64) return sang.hoPhach;
    if (r < 0.8) return sang.thanHong;
    if (r < 0.92) return sang.sanHo;
    return sang.tim;
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
        const e = (p.tuoi / p.tho) ** 2;
        p.x = p.sx + (p.tx - p.sx) * e;
        p.y = p.sy + (p.ty - p.sy) * e;
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
  }

  function ve() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, rong, cao);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

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
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(v.mau, 0.9 * (1 - f) ** 1.5);
      ctx.lineWidth = v.w * (1 - f) + 0.5;
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.r0 + (v.r1 - v.r0) * em.raLapPhuong(f), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function veAnh(anh, x, y, s, a, xoay = 0) {
    ctx.globalAlpha = a;
    if (!xoay) {
      ctx.drawImage(anh, x - s / 2, y - s / 2, s, s);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(xoay);
    ctx.drawImage(anh, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  /** Tụ phép ở đầu thanh tiến độ: bụi bị hút vào, quả cầu sáng lớn dần + sao ✦ xoay */
  function tuNangLuong(nguon, t, dt, k) {
    duTu += dt * 0.11 * k * heSoHat;
    for (; duTu >= 1; duTu -= 1) {
      const goc = Math.random() * Math.PI * 2;
      const r = ngauNhien(44, 92);
      them({
        kieu: HUT,
        sx: nguon.x + Math.cos(goc) * r,
        sy: nguon.y + Math.sin(goc) * r,
        tx: nguon.x,
        ty: nguon.y,
        x: nguon.x,
        y: nguon.y,
        tho: ngauNhien(340, 540),
        s0: ngauNhien(5, 10),
        s1: 3,
        anh: Math.random() < 0.2 ? sao : anhSang(),
      });
    }
    const lon = Math.min(1, t / 320) * (1 + 0.12 * Math.sin(t * 0.018)) * k;
    veAnh(sang.thanHong, nguon.x, nguon.y, 74 * lon, 0.5);
    veAnh(sang.vang, nguon.x, nguon.y, 34 * lon, 0.95);
    veAnh(sao, nguon.x, nguon.y, 52 * lon, 0.9, t * 0.004);
  }

  /** Sao chổi: rắc hạt dọc đoạn vừa bay (không hở khi bay nhanh), vẽ đuôi lụa + đầu sáng */
  function veSaoChoi(tu, den, vet, t, k) {
    const dx = den.x - tu.x;
    const dy = den.y - tu.y;
    const buoc = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (5 / heSoHat)));
    for (let i = 1; i <= buoc; i += 1) {
      const x = tu.x + (dx * i) / buoc;
      const y = tu.y + (dy * i) / buoc;
      them({
        kieu: CHAM,
        x,
        y,
        vx: ngauNhien(-0.04, 0.04),
        vy: ngauNhien(-0.04, 0.03),
        g: 0.00012,
        tho: ngauNhien(300, 640),
        s0: ngauNhien(8, 16) * k,
        s1: 1,
        a0: 0.85,
        anh: anhSang(),
      });
      if (Math.random() < 0.22) {
        them({
          kieu: CHAM,
          x: x + ngauNhien(-8, 8),
          y: y + ngauNhien(-8, 8),
          vx: ngauNhien(-0.03, 0.03),
          vy: ngauNhien(0, 0.04),
          g: 0.00025,
          tho: ngauNhien(600, 1000),
          s0: ngauNhien(7, 13),
          s1: 2,
          a0: 0.95,
          lap: ngauNhien(0.02, 0.04),
          anh: sao,
        });
      }
    }

    // Đuôi lụa: giữ vị trí trong 150 ms gần nhất, nét to dần và chuyển tím → vàng về phía đầu
    vet.push({ x: den.x, y: den.y, t });
    while (vet.length > 2 && t - vet[0].t > 150) vet.shift();
    const n = vet.length;
    ctx.globalAlpha = 1;
    for (let i = 1; i < n; i += 1) {
      const f = i / (n - 1);
      const mau = f < 0.3 ? MAU.tim : f < 0.55 ? MAU.sanHo : f < 0.8 ? MAU.thanHong : MAU.vang;
      ctx.strokeStyle = rgba(mau, 0.16 + 0.62 * f);
      ctx.lineWidth = (1.5 + 13 * f) * k;
      ctx.beginPath();
      ctx.moveTo(vet[i - 1].x, vet[i - 1].y);
      ctx.lineTo(vet[i].x, vet[i].y);
      ctx.stroke();
    }

    veAnh(sang.thanHong, den.x, den.y, 100 * k, 0.55);
    veAnh(sang.vang, den.x, den.y, 44 * k, 0.95);
    veAnh(sang.loi, den.x, den.y, 20 * k, 1);
    veAnh(sao, den.x, den.y, 56 * k, 0.9, t * 0.006);
  }

  function chopSang(tam, s0, s1, tho, a0, anh = sang.loi) {
    them({ kieu: CHAM, x: tam.x, y: tam.y, tho, s0, s1, a0, vao: 0, drag: 1, anh });
  }

  function tiaLua(tam, so, tocDo, tho, dai) {
    const ds = [MAU.loi, MAU.vang, MAU.vang, MAU.hoPhach, MAU.thanHong, MAU.sanHo];
    for (let i = 0; i < so; i += 1) {
      const goc = Math.random() * Math.PI * 2;
      const v = ngauNhien(tocDo[0], tocDo[1]);
      them({
        kieu: TIA,
        x: tam.x,
        y: tam.y,
        vx: Math.cos(goc) * v,
        vy: Math.sin(goc) * v,
        drag: 0.935,
        g: 0.0008,
        tho: ngauNhien(tho[0], tho[1]),
        s0: ngauNhien(1.6, 3),
        dai: ngauNhien(dai[0], dai[1]),
        a0: 1,
        mau: chon(ds),
      });
    }
  }

  /** Va chạm: chớp sáng, hai vòng sóng, tia lửa văng có trọng lực, bụi sao lơ lửng */
  function no(tam, k) {
    chopSang(tam, 60, 300 * k, 300, 0.9);
    chopSang(tam, 80, 420 * k, 520, 0.5, sang.hoPhach);
    themVong({ x: tam.x, y: tam.y, r0: 8, r1: 160 * k, tho: 520, w: 7, mau: MAU.vang });
    themVong({ x: tam.x, y: tam.y, r0: 8, r1: 230 * k, tho: 760, w: 3, mau: MAU.sanHo });
    tiaLua(tam, Math.round(46 * k * heSoHat), [0.3, 1.15], [450, 900], [26, 40]);
    for (let i = 0, so = Math.round(22 * k * heSoHat); i < so; i += 1) {
      const goc = Math.random() * Math.PI * 2;
      const v = ngauNhien(0.05, 0.28);
      them({
        kieu: CHAM,
        x: tam.x,
        y: tam.y,
        vx: Math.cos(goc) * v,
        vy: Math.sin(goc) * v - 0.05,
        g: 0.00012,
        drag: 0.97,
        tho: ngauNhien(800, 1300),
        s0: ngauNhien(7, 13),
        s1: 2,
        a0: 0.95,
        lap: 0.025,
        anh: sao,
      });
    }
  }

  /** Mép lỗ cháy: ba nét cộng sáng (đỏ than → vàng → trắng nóng), chỉ trong khung cổng; than hồng bay ra */
  function veMepChay(ds, rect, tam, banKinh) {
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(rect.left, rect.top, rect.width, rect.height, banKinh);
    else ctx.rect(rect.left, rect.top, rect.width, rect.height);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(ds[0], ds[1]);
    for (let i = 2; i < ds.length; i += 2) ctx.lineTo(ds[i], ds[i + 1]);
    ctx.closePath();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba(MAU.thanHong, 0.38);
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.strokeStyle = rgba(MAU.vang, 0.75);
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = rgba(MAU.loi, 0.95);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();

    for (let i = 0, so = Math.round(5 * heSoHat); i < so; i += 1) {
      const j = Math.floor(Math.random() * (ds.length / 2)) * 2;
      const x = ds[j];
      const y = ds[j + 1];
      if (x < rect.left + 4 || x > rect.right - 4 || y < rect.top + 4 || y > rect.bottom - 4) continue;
      const dx = x - tam.x;
      const dy = y - tam.y;
      const d = Math.hypot(dx, dy) || 1;
      them({
        kieu: CHAM,
        x,
        y,
        vx: (dx / d) * 0.04,
        vy: (dy / d) * 0.04 - 0.03,
        drag: 0.97,
        tho: ngauNhien(300, 520),
        s0: ngauNhien(5, 9),
        s1: 1,
        anh: Math.random() < 0.6 ? sang.thanHong : sang.vang,
      });
    }
  }

  /** Cổng khép lại thành một đốm */
  function chop(tam, k) {
    chopSang(tam, 30, 130 * k, 240, 0.9);
    themVong({ x: tam.x, y: tam.y, r0: 6, r1: 70 * k, tho: 300, w: 3, mau: MAU.vang });
  }

  /** Đốm lửa về tới thanh tiến độ */
  function chamVe(nguon, k) {
    chopSang(nguon, 20, 110 * k, 260, 0.9);
    themVong({ x: nguon.x, y: nguon.y, r0: 4, r1: 60 * k, tho: 380, w: 3, mau: MAU.vang });
    tiaLua(nguon, Math.round(14 * heSoHat), [0.2, 0.6], [300, 500], [18, 26]);
  }

  return {
    doKichThuoc,
    capNhat,
    ve,
    conHat: () => hat.length > 0 || vong.length > 0,
    xoaHet() {
      hat.length = 0;
      vong.length = 0;
      duTu = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    tuNangLuong,
    veSaoChoi,
    no,
    veMepChay,
    chop,
    chamVe,
  };
}
