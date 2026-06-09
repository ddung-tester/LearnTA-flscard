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
      <div className="ui-segmented-progress__meta">
        <span className="ui-segmented-progress__label">{label}</span>
        <span className="ui-segmented-progress__value">
          {totalCorrect}/{totalTarget}
        </span>
      </div>
      <div className="ui-segmented-progress__bars">
        {segments.map((segment) => {
          const dangHoatDong = segment.index === activeSegmentIndex;

          return (
            <div
              key={`segment-progress-${segment.index}`}
              className={`ui-segmented-progress__segment${dangHoatDong ? " ui-segmented-progress__segment--active" : ""}`}
            >
              <div className="ui-segmented-progress__segment-meta">
                <span className="ui-segmented-progress__segment-label">
                  Chặng {segment.index + 1}
                </span>
                <span className="ui-segmented-progress__segment-value">
                  {segment.currentValue}/{segment.totalValue}
                </span>
              </div>
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
    </div>
  );
}

export default SegmentedRewardProgressBar;
