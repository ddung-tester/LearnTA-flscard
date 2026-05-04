function RewardProgressBar({
  currentValue,
  totalValue,
  progressPercent,
  phase = "idle",
  endpointRef,
  label = "Tiến độ",
}) {
  return (
    <div className="ui-reward-progress">
      <div className="ui-reward-progress__meta">
        <span className="ui-reward-progress__label">{label}</span>
        <span className="ui-reward-progress__value">
          {currentValue}/{totalValue}
        </span>
      </div>
      <div className={`ui-reward-progress__track ui-reward-progress--${phase}`}>
        <div
          className="ui-progress-fill ui-reward-progress__fill"
          style={{ width: `${progressPercent}%` }}
        >
          <span className="ui-reward-progress__fill-core" />
          <span className="ui-reward-progress__glow" />
          <span className="ui-reward-progress__shimmer" />
          <span className="ui-reward-progress__wave" />
          <span
            ref={endpointRef}
            className="ui-reward-progress__endpoint"
            style={{ opacity: progressPercent > 0 ? 1 : 0 }}
          />
        </div>
      </div>
    </div>
  );
}

export default RewardProgressBar;
