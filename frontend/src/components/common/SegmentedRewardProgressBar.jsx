import RewardProgressBar from "./RewardProgressBar";

function SegmentedRewardProgressBar({
  segments,
  totalCorrect,
  totalTarget,
  activeSegmentIndex = 0,
  phase = "idle",
  endpointRef,
  combo = 0,
  label = "Tiến độ",
}) {
  return (
    <div className="ui-segmented-progress">
      <div className="ui-segmented-progress__inline">
        <span
          className={`ui-segmented-progress__endpoint-label${totalCorrect > 0 ? " ui-segmented-progress__endpoint-label--start" : ""}`}
          aria-label={`${totalCorrect} câu đúng`}
        >
          {totalCorrect}
        </span>
        <div className="ui-segmented-progress__track-row">
          {segments.map((segment) => {
            const dangHoatDong = segment.index === activeSegmentIndex;
            return (
              <div
                key={`segment-progress-${segment.index}`}
                className={`ui-segmented-progress__pill${dangHoatDong ? " ui-segmented-progress__pill--active" : ""}`}
              >
                <RewardProgressBar
                  currentValue={segment.currentValue}
                  totalValue={segment.totalValue}
                  progressPercent={segment.progressPercent}
                  phase={dangHoatDong ? phase : "idle"}
                  endpointRef={dangHoatDong ? endpointRef : null}
                  combo={dangHoatDong ? combo : 0}
                  hideMeta
                  compact
                />
              </div>
            );
          })}
        </div>
        <span className="ui-segmented-progress__endpoint-label ui-segmented-progress__endpoint-label--end">
          {totalTarget}
        </span>
      </div>
    </div>
  );
}

export default SegmentedRewardProgressBar;
