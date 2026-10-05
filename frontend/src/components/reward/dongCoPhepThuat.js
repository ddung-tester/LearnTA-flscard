/**
 * Động cơ hạt cho hiệu ứng thưởng "vòng phép chữ": một canvas 2D phủ màn hình, vẽ cộng sáng ("lighter").
 * Mọi hình phức tạp (vòng phép ghi chữ, tia thần, quầng sáng) vẽ sẵn một lần thành sprite rồi chỉ xoay/co giãn,
 * nên mỗi khung chỉ là vài drawImage. Chỉ chạy lúc tụ phép / bay / triệu hồi / mở / đóng cổng (~2 s) rồi dừng hẳn.
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

/** Nét phát sáng: một nét rộng mờ (quầng) rồi một nét mảnh sáng (lõi) */
function netSang(g, mau, rong, veDuong) {
  g.strokeStyle = rgba(mau, 0.22);
  g.lineWidth = rong * 4.5;
  veDuong();
  g.stroke();
  g.strokeStyle = rgba(mau, 0.95);
  g.lineWidth = rong;
  veDuong();
  g.stroke();
}

/** Rune tự vẽ: 2–3 nét trên lưới 3×3, sinh từ hạt giống để mỗi ký tự ổn định */
function veRune(g, x, y, co, hatGiong) {
  let s = hatGiong * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const diem = (i) => [x + ((i % 3) - 1) * co * 0.5, y + (Math.floor(i / 3) - 1) * co * 0.62];
  g.beginPath();
  // Thân dọc giữa + 1–2 nét chéo, giống chữ khắc
  g.moveTo(...diem(1));
  g.lineTo(...diem(7));
  const soNet = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < soNet; i += 1) {
    const a = Math.floor(rand() * 9);
    let b = Math.floor(rand() * 9);
    if (b === a) b = (a + 4) % 9;
    g.moveTo(...diem(a));
    g.lineTo(...diem(b));
  }
}

function veSao4(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const goc = (i / 8) * TAU - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.28;
    const px = x + Math.cos(goc) * rr;
    const py = y + Math.sin(goc) * rr;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

/**
 * Vòng phép vẽ sẵn ở bán kính R (đơn vị CSS px, nhân dpr cho nét):
 *  ngoai — hai vòng tròn, vạch chia, và dải chữ: từ vừa học xen sao ✦ và rune chạy quanh vòng
 *  trong — sao bảy cánh {7/3}, vòng trong, bảy nút tròn ở đỉnh sao
 */
function taoVongPhep(R, tuVung, dpr) {
  const pad = 12;
  const kich = (R + pad) * 2;
  const tao = () => {
    const c = taoCanvas(kich * dpr);
    const g = c.getContext("2d");
    g.scale(dpr, dpr);
    g.translate(kich / 2, kich / 2);
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    g.lineJoin = "round";
    return { c, g };
  };

  const ngoai = tao();
  {
    const { g } = ngoai;
    const vong = (r) => () => {
      g.beginPath();
      g.arc(0, 0, r, 0, TAU);
    };
    netSang(g, MAU.vang, 1.8, vong(R));
    netSang(g, MAU.vang, 1, vong(R * 0.8));
    netSang(g, MAU.tim, 0.8, vong(R * 0.765));

    // Vạch chia như mặt đồng hồ thiên văn
    netSang(g, MAU.vang, 0.9, () => {
      g.beginPath();
      for (let i = 0; i < 96; i += 1) {
        const goc = (i / 96) * TAU;
        const dai = i % 8 === 0 ? 0.06 : 0.025;
        g.moveTo(Math.cos(goc) * R * 0.8, Math.sin(goc) * R * 0.8);
        g.lineTo(Math.cos(goc) * R * (0.8 - dai), Math.sin(goc) * R * (0.8 - dai));
      }
    });

    // Dải chữ: [TỪ] ✦ ᚱ ᚱ ✦ lặp kín vòng
    const rChu = R * 0.9;
    const co = R * 0.088;
    g.font = `700 ${co}px "Bricolage Grotesque", "Be Vietnam Pro", system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const tu = (tuVung || "").trim().toUpperCase().slice(0, 18);
    const khoang = co * 0.16;
    const manh = [];
    if (tu) for (const kyTu of tu) manh.push({ loai: "chu", kyTu, rong: g.measureText(kyTu).width + khoang });
    manh.push({ loai: "sao", rong: co * 1.5 });
    for (let i = 0; i < (tu ? 2 : 3); i += 1) manh.push({ loai: "rune", rong: co * 0.95, hat: i });
    manh.push({ loai: "sao", rong: co * 1.5 });
    const daiMot = manh.reduce((tong, m) => tong + m.rong, 0);
    const chuVi = TAU * rChu;
    const soLan = Math.max(1, Math.floor(chuVi / daiMot));
    const gian = chuVi / (soLan * daiMot); // giãn đều để khép kín vòng

    let goc = -Math.PI / 2;
    let lan = 0;
    for (let n = 0; n < soLan; n += 1) {
      for (const m of manh) {
        const buoc = (m.rong * gian) / rChu;
        const giua = goc + buoc / 2;
        g.save();
        g.rotate(giua);
        g.translate(rChu, 0);
        g.rotate(Math.PI / 2);
        if (m.loai === "chu") {
          g.fillStyle = rgba(MAU.vang, 0.25);
          g.fillText(m.kyTu, 0, 0);
          g.fillText(m.kyTu, 0.6, 0.6);
          g.fillStyle = rgba(MAU.loi, 0.95);
          g.fillText(m.kyTu, 0, 0);
        } else if (m.loai === "sao") {
          veSao4(g, 0, 0, co * 0.42);
          g.fillStyle = rgba(MAU.loi, 0.95);
          g.fill();
        } else {
          netSang(g, MAU.tim, 1, () => veRune(g, 0, 0, co * 0.8, m.hat + lan * 3 + n * 7));
        }
        g.restore();
        goc += buoc;
      }
      lan += 1;
    }
  }

  const trong = tao();
  {
    const { g } = trong;
    const rSao = R * 0.7;
    const dinh = Array.from({ length: 7 }, (_, i) => {
      const goc = (i / 7) * TAU - Math.PI / 2;
      return [Math.cos(goc) * rSao, Math.sin(goc) * rSao];
    });
    netSang(g, MAU.vang, 1.1, () => {
      g.beginPath();
      for (let i = 0; i <= 7; i += 1) {
        const [x, y] = dinh[(i * 3) % 7];
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
    });
    netSang(g, MAU.tim, 0.9, () => {
      g.beginPath();
      for (let i = 0; i <= 7; i += 1) {
        const [x, y] = dinh[(i * 2) % 7];
        if (i === 0) g.moveTo(x * 0.62, y * 0.62);
        else g.lineTo(x * 0.62, y * 0.62);
      }
    });
    netSang(g, MAU.vang, 0.9, () => {
      g.beginPath();
      g.arc(0, 0, R * 0.3, 0, TAU);
    });
    for (const [x, y] of dinh) {
      netSang(g, MAU.vang, 0.9, () => {
        g.beginPath();
        g.arc(x, y, R * 0.045, 0, TAU);
      });
    }
    veSao4(g, 0, 0, R * 0.16);
    g.fillStyle = rgba(MAU.loi, 0.9);
    g.fill();
  }

  return { ngoai: ngoai.c, trong: trong.c, kich };
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

/** Mép cổng: vòng tròn bán kính R gợn nhẹ (vài sóng sin lệch nhịp), pha đổi theo thời gian → mép lập loè.
 *  Lúc vòng còn nhỏ thì gần như tròn hẳn, không méo thành hình răng cưa. */
export function diemMepChay(tam, R, bienDo, pha, n = 72) {
  const ds = [];
  const gon = Math.min(bienDo, R * 0.08);
  for (let i = 0; i < n; i += 1) {
    const g = (i / n) * TAU;
    const nhieu =
      0.55 * Math.sin(3 * g + pha) +
      0.3 * Math.sin(7 * g - pha * 1.6 + 2.1) +
      0.15 * Math.sin(11 * g + pha * 2.3 + 4.4);
    const r = Math.max(0, R + gon * nhieu);
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
  const loe = taoSpriteLoe();
  const tiaThan = taoSpriteTiaThan();
  const boNhoVong = new Map();
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

  function layVong(R, tuVung) {
    const khoa = `${Math.round(R)}|${tuVung || ""}|${dpr}`;
    if (!boNhoVong.has(khoa)) {
      if (boNhoVong.size > 6) boNhoVong.clear();
      boNhoVong.set(khoa, taoVongPhep(Math.round(R), tuVung, dpr));
    }
    return boNhoVong.get(khoa);
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

  /**
   * Vòng phép ghi chữ tại tam, bán kính R.
   * hien: 0→1 nét vòng ngoài được "viết" bằng ngòi sáng chạy quanh, sao bảy cánh nở ra sau;
   * sang: độ sáng tổng; co: hệ số co giãn (mở cổng thì phình ra).
   */
  function veVongPhep(tam, R, t, { hien = 1, sang: doSang = 1, co = 1, tuVung = "" } = {}) {
    if (doSang <= 0.01 || hien <= 0) return;
    const vp = layVong(R, tuVung);
    const s = vp.kich * co;
    const gocBatDau = -Math.PI / 2;
    const xoayNgoai = t * 0.00035;
    const xoayTrong = -t * 0.0006;

    // Vòng ngoài: lộ dần theo hình quạt (ngòi bút chạy quanh)
    ctx.save();
    if (hien < 1) {
      ctx.beginPath();
      ctx.moveTo(tam.x, tam.y);
      ctx.arc(tam.x, tam.y, s, gocBatDau, gocBatDau + TAU * hien);
      ctx.closePath();
      ctx.clip();
    }
    veAnh(vp.ngoai, tam.x, tam.y, s, doSang, xoayNgoai);
    ctx.restore();

    // Sao bảy cánh: nở từ tâm khi vòng ngoài đã viết được 35%
    const hienTrong = Math.min(1, Math.max(0, (hien - 0.35) / 0.65));
    if (hienTrong > 0) veAnh(vp.trong, tam.x, tam.y, s * (0.55 + 0.45 * em.raLapPhuong(hienTrong)), doSang * hienTrong, xoayTrong);

    // Ngòi bút sáng ở mép đang viết, rắc bụi sao theo
    if (hien < 1) {
      const goc = gocBatDau + TAU * hien;
      const x = tam.x + Math.cos(goc) * R * co;
      const y = tam.y + Math.sin(goc) * R * co;
      veAnh(sang.tim, x, y, 70, 0.6 * doSang);
      veAnh(sang.loi, x, y, 24, doSang);
      veAnh(sao, x, y, 46, doSang, t * 0.01);
      if (Math.random() < 0.8 * heSoHat) {
        them({
          kieu: CHAM,
          x,
          y,
          vx: ngauNhien(-0.05, 0.05),
          vy: ngauNhien(-0.06, 0.02),
          g: 0.00008,
          tho: ngauNhien(400, 800),
          s0: ngauNhien(5, 10),
          s1: 1,
          a0: 0.9,
          lap: 0.03,
          anh: Math.random() < 0.4 ? sao : anhSang(),
        });
      }
    }

    // Lõi sáng nhẹ ở tâm vòng
    veAnh(sang.cham, tam.x, tam.y, R * 1.3 * co, 0.18 * doSang);
  }

  /** Tụ phép ở đầu thanh tiến độ: bụi xoáy ốc vào tâm, vòng phép nhỏ xoay, quả cầu sáng + vệt loé ngang */
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
    veVongPhep(nguon, 38 * k, t * 3, { hien: Math.min(1, t / 380), sang: 0.85 * vao });
    veAnh(sang.tim, nguon.x, nguon.y, 90 * lon, 0.55);
    veAnh(sang.vang, nguon.x, nguon.y, 36 * lon, 0.95);
    veAnh(loe, nguon.x, nguon.y, 150 * lon, 0.7 * vao, 0, 18 * lon);
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

  /** Tia năng lượng chạm đích: chớp trắng, tia thần, hai sóng tròn, tia lửa văng, bụi sao lơ lửng */
  function no(tam, k) {
    chopSang(tam, 60, 320 * k, 320, 0.95);
    chopSang(tam, 90, 460 * k, 600, 0.45, sang.tim);
    themTiaThan(tam, 620 * k, 1100);
    themVong({ x: tam.x, y: tam.y, r0: 8, r1: 170 * k, tho: 560, w: 3, mau: MAU.vang });
    themVong({ x: tam.x, y: tam.y, r0: 8, r1: 260 * k, tho: 860, w: 2, mau: MAU.tim });
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

  /**
   * Mép cổng đang mở/khép: ba nét cộng sáng (tím → vàng → trắng) chỉ trong khung cổng,
   * và tia lửa văng theo phương tiếp tuyến như vòng lửa xoáy. chieu: 1 mở (văng ra), -1 khép (hút vào).
   */
  function veMepChay(ds, rect, tam, banKinh, chieu = 1) {
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
    ctx.strokeStyle = rgba(MAU.tim, 0.4);
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.strokeStyle = rgba(MAU.hoPhach, 0.7);
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = rgba(MAU.loi, 0.95);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    for (let i = 0, so = Math.round(11 * heSoHat); i < so; i += 1) {
      const j = Math.floor(Math.random() * (ds.length / 2)) * 2;
      const x = ds[j];
      const y = ds[j + 1];
      if (x < rect.left + 4 || x > rect.right - 4 || y < rect.top + 4 || y > rect.bottom - 4) continue;
      const dx = x - tam.x;
      const dy = y - tam.y;
      const d = Math.hypot(dx, dy) || 1;
      // Tiếp tuyến (xoáy theo chiều kim đồng hồ) + chút hướng tâm
      const v = ngauNhien(0.22, 0.55);
      them({
        kieu: TIA,
        x,
        y,
        vx: (-dy / d) * v + (dx / d) * 0.08 * chieu,
        vy: (dx / d) * v + (dy / d) * 0.08 * chieu,
        drag: 0.92,
        g: 0.0005,
        tho: ngauNhien(200, 380),
        s0: ngauNhien(1.2, 2.4),
        dai: ngauNhien(14, 24),
        a0: 1,
        mau: chon([MAU.loi, MAU.vang, MAU.hoPhach, MAU.hoPhach, MAU.tim]),
      });
    }
  }

  /** Cổng khép lại thành một đốm */
  function chop(tam, k) {
    chopSang(tam, 30, 150 * k, 260, 0.9);
    chopSang(tam, 40, 220 * k, 380, 0.4, sang.tim);
    themVong({ x: tam.x, y: tam.y, r0: 6, r1: 80 * k, tho: 320, w: 2, mau: MAU.vang });
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
    veVongPhep,
    no,
    veMepChay,
    chop,
    chamVe,
  };
}
