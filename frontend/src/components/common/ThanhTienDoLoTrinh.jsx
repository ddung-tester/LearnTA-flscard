/**
 * ThanhTienDoLoTrinh — thanh "đã học / đã thuộc" trên tổng số từ của một lộ trình hoặc bộ từ.
 */
export default function ThanhTienDoLoTrinh({ tongSo, daHoc, daThuoc, hienSo = true }) {
  const phanTram = (so) => (tongSo > 0 ? Math.min(100, (so / tongSo) * 100) : 0);

  return (
    <div className="roadmap-progress">
      <div
        className="roadmap-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={tongSo}
        aria-valuenow={daHoc}
        aria-label={`Đã học ${daHoc}/${tongSo} từ, đã thuộc ${daThuoc}`}
      >
        <span className="roadmap-progress__hoc" style={{ width: `${phanTram(daHoc)}%` }} />
        <span className="roadmap-progress__thuoc" style={{ width: `${phanTram(daThuoc)}%` }} />
      </div>
      {hienSo && (
        <p className="roadmap-progress__text">
          Đã học <strong>{daHoc}</strong>/{tongSo} · Đã thuộc <strong>{daThuoc}</strong>
        </p>
      )}
    </div>
  );
}
