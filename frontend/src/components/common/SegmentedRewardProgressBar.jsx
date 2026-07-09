/**
 * SegmentedRewardProgressBar — N thanh riêng lẻ, mỗi thanh = 1 segment (vd 10 câu).
 * Gradient màu là 1 dải đồng nhất xuyên suốt toàn bộ (dùng CSS clip trick).
 * Không dùng divider overlay nữa — mỗi thanh là 1 track độc lập với gap nhỏ.
 */

function SegmentBar({ segmentIndex, totalSegments, currentValue, totalValue, phase, combo, endpointRef, activeEndRef }) {
  const fillPercent = totalValue > 0 ? Math.min((currentValue / totalValue) * 100, 100) : 0;
  const comboLevel = Math.min(combo, 8);

  // Vị trí gradient đồng bộ:
  // Nếu chỉ có 1 segment, gradPosX = 0. Ngược lại = (index / (total - 1)) * 100
  const gradPosX = totalSegments > 1 ? (segmentIndex / (totalSegments - 1)) * 100 : 0;

  return (
    <div
      className="seg-bar"
      style={{
        "--combo-level": comboLevel,
        "--fill-pct": `${fillPercent}%`,
        "--grad-pos-x": `${gradPosX}%`,
        "--grad-total": totalSegments,
      }}
    >
      <div className={`seg-bar__track seg-bar__track--${phase}`}>
        <div className="seg-bar__fill">
          <span className="seg-bar__fill-core" />
          {fillPercent > 0 && <span className="seg-bar__shimmer" />}
        </div>
        {/* Marker tại đầu mũi fill — dùng làm điểm xuất phát tia năng lượng */}
        {activeEndRef && (
          <span
            ref={activeEndRef}
            className="seg-bar__fill-tip"
          />
        )}
        {/* Endpoint dot — chỉ hiện ở thanh cuối */}
        {endpointRef && segmentIndex === totalSegments - 1 && (
          <span
            ref={endpointRef}
            className="seg-bar__endpoint"
            style={{ opacity: fillPercent > 0 ? 1 : 0 }}
          />
        )}
      </div>
    </div>
  );
}


function SegmentedRewardProgressBar({
  segments = [],
  totalCorrect,
  totalTarget,
  activeSegmentIndex = 0,
  phase = "idle",
  endpointRef,
  activeEndRef,
  combo = 0,
}) {
  const N = segments.length || 1;

  return (
    <div className="ui-segmented-progress">
      <div className="ui-segmented-progress__inline">
        {/* Số bên trái */}
        <span
          className={`ui-segmented-progress__endpoint-label${
            totalCorrect > 0 ? " ui-segmented-progress__endpoint-label--start" : ""
          }`}
          aria-label={`${totalCorrect} câu đúng`}
        >
          {totalCorrect}
        </span>

        {/* N thanh riêng lẻ */}
        <div className="seg-bars-container" role="progressbar" aria-valuenow={totalCorrect} aria-valuemax={totalTarget}>
          {segments.map((seg, i) => (
            <SegmentBar
              key={i}
              segmentIndex={i}
              totalSegments={N}
              currentValue={seg.currentValue ?? 0}
              totalValue={seg.totalValue ?? 1}
              phase={i === activeSegmentIndex ? phase : i < activeSegmentIndex ? "done" : "idle"}
              combo={i === activeSegmentIndex ? combo : 0}
              endpointRef={i === N - 1 ? endpointRef : null}
              activeEndRef={i === activeSegmentIndex ? activeEndRef : null}
            />
          ))}
        </div>

        {/* Số bên phải */}
        <span
          className="ui-segmented-progress__endpoint-label ui-segmented-progress__endpoint-label--end"
          aria-label={`mục tiêu ${totalTarget} câu`}
        >
          {totalTarget}
        </span>
      </div>
    </div>
  );
}

export default SegmentedRewardProgressBar;
