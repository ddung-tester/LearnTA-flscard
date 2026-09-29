import { useLayoutEffect, useRef, useState } from "react";

// Tâm các mốc [data-moc] tính theo khung chứa, cộng dồn offsetTop/Left
// (không bị ảnh hưởng bởi transform của animation vào trang)
function doTamMoc(khung) {
  return [...khung.querySelectorAll("[data-moc]")].map((moc) => {
    let x = moc.offsetWidth / 2;
    let y = moc.offsetHeight / 2;
    for (let el = moc; el && el !== khung; el = el.offsetParent) {
      x += el.offsetLeft;
      y += el.offsetTop;
    }
    return { x, y };
  });
}

// Đường cong uốn lượn qua các mốc, mỗi đoạn cong về một phía
function veDuong(diem) {
  if (diem.length < 2) return "";
  let d = `M${diem[0].x} ${diem[0].y}`;
  for (let i = 1; i < diem.length; i += 1) {
    const a = diem[i - 1];
    const b = diem[i];
    const dy = b.y - a.y;
    const cong = (i % 2 ? 1 : -1) * Math.min(13, dy * 0.25);
    d += ` C${a.x + cong} ${a.y + dy * 0.4} ${b.x + cong} ${b.y - dy * 0.4} ${b.x} ${b.y}`;
  }
  return d;
}

/**
 * DuongHanhTrinh — con đường nối các mốc (phần tử có data-moc) trong phần tử cha của nó, kiểu bản đồ:
 * cả chặng đường là nét chì đứt, đoạn đã đi (tới mốc chiSoToi) là nét mực vẽ dần khi trang hiện.
 * Phần tử cha cần class ui-hanh-trinh (position: relative); SVG nằm dưới các mốc.
 */
function DuongHanhTrinh({ chiSoToi }) {
  const svgRef = useRef(null);
  const [diem, setDiem] = useState([]);

  useLayoutEffect(() => {
    const khung = svgRef.current.parentElement;
    // ResizeObserver gọi ngay lần đầu, rồi mỗi khi danh sách đổi kích thước (xuống dòng, đổi màn hình)
    const quanSat = new ResizeObserver(() => setDiem(doTamMoc(khung)));
    quanSat.observe(khung);
    return () => quanSat.disconnect();
  }, []);

  const soDoanDaDi = Math.max(0, Math.min(chiSoToi, diem.length - 1));

  return (
    <svg
      ref={svgRef}
      className="ui-duong-hanh-trinh"
      aria-hidden="true"
      style={{ "--thoi-gian-ve": `${300 + soDoanDaDi * 380}ms` }}
    >
      {diem.length > 1 && <path className="ui-duong-hanh-trinh__chi" d={veDuong(diem)} />}
      {soDoanDaDi > 0 && (
        <path
          className="ui-duong-hanh-trinh__muc"
          pathLength="1"
          d={veDuong(diem.slice(0, soDoanDaDi + 1))}
        />
      )}
    </svg>
  );
}

export default DuongHanhTrinh;
