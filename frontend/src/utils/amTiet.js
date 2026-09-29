/**
 * amTiet — tách chữ tiếng Anh thành âm tiết (ước lượng theo cụm nguyên âm, đủ dùng cho hiệu ứng
 * chữ nảy khi đọc, không phải từ điển) và tính âm tiết đang đọc theo thời gian.
 */

// Một âm tiết: phụ âm đầu + cụm nguyên âm + (phụ âm cuối nếu hết từ, hoặc một phụ âm khi
// theo sau còn phụ âm nữa). "e" câm cuối từ gộp vào âm tiết trước.
const MAU_AM_TIET = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi;

function tachMotTu(tu) {
  if (!/[aeiouy]/i.test(tu)) return [tu];
  const phan = tu.match(MAU_AM_TIET) || [tu];
  // Phần dư không khớp (vd. chữ cái sau cùng) nối vào âm tiết cuối
  const daKhop = phan.join("").length;
  if (daKhop < tu.length) phan[phan.length - 1] += tu.slice(daKhop);
  const cuoi = phan[phan.length - 1];
  if (phan.length > 1 && /^[^aeiouy]*e$/i.test(cuoi)) {
    phan.splice(-2, 2, phan[phan.length - 2] + cuoi);
  }
  return phan;
}

/**
 * Tách câu thành các mảnh { text, batDau, laAmTiet }. Khoảng trắng/dấu câu là mảnh riêng
 * (laAmTiet false) để giữ nguyên câu khi ghép lại.
 */
export function tachAmTiet(text = "") {
  const ketQua = [];
  const reTu = /[A-Za-z']+/g;
  let viTri = 0;
  let m;
  while ((m = reTu.exec(text))) {
    if (m.index > viTri) ketQua.push({ text: text.slice(viTri, m.index), batDau: viTri, laAmTiet: false });
    let batDau = m.index;
    for (const am of tachMotTu(m[0])) {
      ketQua.push({ text: am, batDau, laAmTiet: true });
      batDau += am.length;
    }
    viTri = m.index + m[0].length;
  }
  if (viTri < text.length) ketQua.push({ text: text.slice(viTri), batDau: viTri, laAmTiet: false });
  return ketQua;
}

/**
 * Chỉ số mảnh (trong mảng của tachAmTiet) đang được đọc, -1 nếu chưa/không đọc.
 * Mốc là vị trí từ mới nhất do trình duyệt báo (boundary) hoặc lúc bắt đầu đọc,
 * sau mốc thì mỗi âm tiết ước lượng msMoiAmTiet.
 */
export function chiSoDangDoc(manh, { dangDoc, kyTu, kyTuLuc }, bayGio, msMoiAmTiet = 260) {
  if (!dangDoc) return -1;
  const dsAmTiet = manh.map((p, i) => (p.laAmTiet ? i : -1)).filter((i) => i >= 0);
  if (dsAmTiet.length === 0) return -1;

  let moc = 0;
  for (let k = 0; k < dsAmTiet.length; k += 1) {
    if (manh[dsAmTiet[k]].batDau <= Math.max(0, kyTu)) moc = k;
  }
  const buoc = Math.floor(Math.max(0, bayGio - kyTuLuc) / msMoiAmTiet);
  return dsAmTiet[Math.min(dsAmTiet.length - 1, moc + buoc)];
}
