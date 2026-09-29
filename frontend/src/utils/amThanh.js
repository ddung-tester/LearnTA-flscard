/**
 * amThanh — âm thanh phản hồi dùng chung, tạo bằng Web Audio (không cần file, trừ tiếng "đúng"
 * dùng lại /sound/bigo.mp3 cho đồng bộ với Quiz/Nối từ/Tự luận).
 * Bật/tắt lưu ở localStorage; nút loa trên header đổi qua `datAmThanh`.
 */

const KHO_AM_THANH = "learnta_am_thanh";
const SU_KIEN_AM_THANH_DOI = "learnta:am-thanh-doi";

export function amThanhDangBat() {
  try {
    return window.localStorage.getItem(KHO_AM_THANH) !== "0";
  } catch {
    return true;
  }
}

export function datAmThanh(bat) {
  try {
    window.localStorage.setItem(KHO_AM_THANH, bat ? "1" : "0");
  } catch {
    // Không lưu được (chế độ riêng tư) — chỉ đổi trong phiên này qua sự kiện
  }
  window.dispatchEvent(new Event(SU_KIEN_AM_THANH_DOI));
}

/** Cho useSyncExternalStore */
export function theoDoiAmThanh(goiLai) {
  window.addEventListener(SU_KIEN_AM_THANH_DOI, goiLai);
  window.addEventListener("storage", goiLai);
  return () => {
    window.removeEventListener(SU_KIEN_AM_THANH_DOI, goiLai);
    window.removeEventListener("storage", goiLai);
  };
}

let ctx = null;
let loaTong = null;
let bufferDung = null;
let bufferNhieu = null;

function layCtx() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  ctx = new AudioContextClass();
  loaTong = ctx.createGain();
  loaTong.gain.value = 0.55;
  loaTong.connect(ctx.destination);

  // Tiếng nhiễu trắng 1 giây, dùng chung cho tiếng lật thẻ / giấy / dấu
  bufferNhieu = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const duLieu = bufferNhieu.getChannelData(0);
  for (let i = 0; i < duLieu.length; i += 1) duLieu[i] = Math.random() * 2 - 1;

  fetch("/sound/bigo.mp3")
    .then((r) => r.arrayBuffer())
    .then((b) => ctx.decodeAudioData(b))
    .then((decoded) => {
      bufferDung = decoded;
    })
    .catch(() => {});

  return ctx;
}

/** Một nốt nhạc ngắn: tăng nhanh rồi tắt dần */
function not(c, { tanSo, batDau = 0, dai = 0.25, to = 0.3, kieu = "sine", tanSoCuoi }) {
  const t = c.currentTime + batDau;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = kieu;
  osc.frequency.setValueAtTime(tanSo, t);
  if (tanSoCuoi) osc.frequency.exponentialRampToValueAtTime(tanSoCuoi, t + dai);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(to, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dai);
  osc.connect(g).connect(loaTong);
  osc.start(t);
  osc.stop(t + dai + 0.02);
}

/** Một vệt nhiễu qua bộ lọc: tiếng sột soạt giấy / vút khi lật thẻ */
function nhieu(c, { batDau = 0, dai = 0.12, to = 0.25, locTu = 800, locDen = 3000, q = 0.9, soDoc = 0 }) {
  const t = c.currentTime + batDau;
  const nguon = c.createBufferSource();
  nguon.buffer = bufferNhieu;
  const loc = c.createBiquadFilter();
  loc.type = "bandpass";
  loc.Q.value = q;
  loc.frequency.setValueAtTime(locTu, t);
  loc.frequency.exponentialRampToValueAtTime(locDen, t + dai);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(to, t + Math.min(0.03, dai / 3));
  // soDoc > 0: biên độ lên xuống vài lần như tiếng giấy lật
  for (let i = 1; i <= soDoc; i += 1) {
    g.gain.linearRampToValueAtTime(to * (i % 2 ? 0.35 : 0.9), t + (dai * i) / (soDoc + 1));
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t + dai);
  nguon.connect(loc).connect(g).connect(loaTong);
  nguon.start(t, Math.random() * 0.5);
  nguon.stop(t + dai + 0.02);
}

const BAN_AM = {
  dung(c) {
    if (bufferDung) {
      const nguon = c.createBufferSource();
      const g = c.createGain();
      nguon.buffer = bufferDung;
      g.gain.value = 1.4;
      nguon.connect(g).connect(loaTong);
      nguon.start();
      return;
    }
    // Chưa tải xong bigo.mp3 → chuông hai nốt
    not(c, { tanSo: 1046.5, dai: 0.18, to: 0.22 });
    not(c, { tanSo: 1568, batDau: 0.08, dai: 0.32, to: 0.2 });
  },
  sai(c) {
    not(c, { tanSo: 311, tanSoCuoi: 247, dai: 0.16, to: 0.18, kieu: "triangle" });
    not(c, { tanSo: 233, tanSoCuoi: 185, batDau: 0.12, dai: 0.26, to: 0.18, kieu: "triangle" });
  },
  xong(c) {
    [523.25, 659.25, 783.99, 1046.5].forEach((tanSo, i) => {
      not(c, { tanSo, batDau: i * 0.09, dai: 0.5, to: 0.16, kieu: "triangle" });
      not(c, { tanSo: tanSo * 2, batDau: i * 0.09, dai: 0.3, to: 0.05 });
    });
    not(c, { tanSo: 2093, batDau: 0.42, dai: 0.7, to: 0.07 });
  },
  lat(c) {
    nhieu(c, { dai: 0.14, to: 0.22, locTu: 600, locDen: 3400 });
  },
  giay(c) {
    nhieu(c, { dai: 0.32, to: 0.2, locTu: 1200, locDen: 2600, q: 0.6, soDoc: 3 });
  },
  congTac(c) {
    nhieu(c, { dai: 0.035, to: 0.35, locTu: 3500, locDen: 2500, q: 1.2 });
    not(c, { tanSo: 1800, tanSoCuoi: 1200, dai: 0.05, to: 0.08, kieu: "square" });
  },
  dongDau(c) {
    not(c, { tanSo: 150, tanSoCuoi: 55, dai: 0.18, to: 0.5 });
    nhieu(c, { dai: 0.06, to: 0.3, locTu: 2000, locDen: 900, q: 0.7 });
  },
};

/**
 * Phát một tiếng: "dung" | "sai" | "xong" | "lat" | "giay" | "dongDau" | "congTac".
 * Không làm gì khi đã tắt âm thanh hoặc trình duyệt không có Web Audio.
 */
export function phatAm(ten) {
  if (typeof window === "undefined" || !amThanhDangBat()) return;
  try {
    const c = layCtx();
    if (c) BAN_AM[ten]?.(c);
  } catch {
    // Trình duyệt chặn âm thanh trước khi có tương tác — bỏ qua
  }
}
