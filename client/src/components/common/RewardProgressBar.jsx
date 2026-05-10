function RewardProgressBar({
  currentValue,
  totalValue,
  progressPercent,
  phase = "idle",
  endpointRef,
  label = "Tiến độ",
  combo = 0,
}) {
  // Clamp combo intensity 0–8 for CSS scaling
  const comboLevel = Math.min(combo, 8);

  return (
    <div className="ui-reward-progress">
      <div className="ui-reward-progress__meta">
        <span className="ui-reward-progress__label">{label}</span>
        <span className="ui-reward-progress__value">
          {currentValue}/{totalValue}
        </span>
      </div>
      <div
        className={`ui-reward-progress__track ui-reward-progress--${phase}`}
        style={{ "--combo-level": comboLevel }}
      >
        <div
          className="ui-progress-fill ui-reward-progress__fill"
          style={{ "--progress-scale": progressPercent / 100 }}
        >
          <span className="ui-reward-progress__fill-core" />
          <span className="ui-reward-progress__glow" />
          <span className="ui-reward-progress__shimmer" />
          <span className="ui-reward-progress__wave" />
        </div>
        <span
          ref={endpointRef}
          className="ui-reward-progress__endpoint"
          style={{
            "--progress-scale": progressPercent / 100,
            opacity: progressPercent > 0 ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}

export default RewardProgressBar;
