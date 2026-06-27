/**
 * SegmentedRewardProgressBar — 1 track liên tục, dividers overlay giữa các segment.
 * Gradient là 1 dải đồng nhất xuyên suốt, không chia màu riêng từng đoạn.
 */
import RewardProgressBar from "./RewardProgressBar";

function SegmentedRewardProgressBar({
  segments = [],
  totalCorrect,
  totalTarget,
  activeSegmentIndex = 0,
  phase = "idle",
  endpointRef,
  combo = 0,
}) {
  const N = segments.length;

  // Tổng % dựa trên totalCorrect / totalTarget → 1 dải duy nhất
  const totalProgressPercent =
    totalTarget > 0 ? Math.min((totalCorrect / totalTarget) * 100, 100) : 0;

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

        {/* Track duy nhất + dividers */}
        <div className="ui-segmented-unified-track">
          <RewardProgressBar
            currentValue={totalCorrect}
            totalValue={totalTarget}
            progressPercent={totalProgressPercent}
            phase={phase}
            endpointRef={endpointRef}
            combo={combo}
            hideMeta
            compact
          />

          {/* Đường kẻ dọc chia segment — nằm ngoài track để không bị clip */}
          {N > 1 && (
            <div className="ui-segmented-dividers" aria-hidden="true">
              {Array.from({ length: N - 1 }, (_, i) => (
                <div
                  key={i}
                  className="ui-segmented-divider"
                  style={{ "--seg-pos": `${((i + 1) / N) * 100}%` }}
                />
              ))}
            </div>
          )}
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
