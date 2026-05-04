function ModeSwitch({
  value,
  onChange,
  options,
  ariaLabel = "Đổi chế độ học",
  variant = "full",
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.key === value)
  );
  const activeOption = options[activeIndex] ?? options[0];

  if (variant === "compact") {
    const nextOption = options[(activeIndex + 1) % options.length] ?? options[0];

    return (
      <button
        type="button"
        onClick={() => onChange(nextOption.key)}
        className="ui-mode-switch ui-mode-switch--compact focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)]"
        aria-label={`${ariaLabel}: ${activeOption?.nhan}`}
      >
        <span
          className="ui-mode-switch__thumb"
          aria-hidden="true"
          style={{
            "--mode-count": options.length,
            "--mode-index": activeIndex,
          }}
        />
      </button>
    );
  }

  return (
    <div
      className="ui-mode-switch"
      role="group"
      aria-label={ariaLabel}
      style={{
        "--mode-count": options.length,
        "--mode-index": activeIndex,
      }}
    >
      <span className="ui-mode-switch__thumb" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className="ui-mode-switch__option"
        >
          {option.shortLabel ?? option.nhan}
        </button>
      ))}
    </div>
  );
}

export default ModeSwitch;
