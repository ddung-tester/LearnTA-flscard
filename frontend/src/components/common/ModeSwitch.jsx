import { useEffect, useState } from "react";

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
  const [dangXoay, setDangXoay] = useState(false);

  useEffect(() => {
    if (!dangXoay) return undefined;

    const timer = window.setTimeout(() => {
      setDangXoay(false);
    }, 260);

    return () => window.clearTimeout(timer);
  }, [dangXoay]);

  if (variant === "compact") {
    const nextOption = options[(activeIndex + 1) % options.length] ?? options[0];
    return (
      <button
        type="button"
        onClick={() => {
          setDangXoay(false);
          requestAnimationFrame(() => {
            setDangXoay(true);
            onChange(nextOption.key);
          });
        }}
        className={`ui-mode-rotate-button ${dangXoay ? "ui-mode-rotate-button--spinning" : ""}`}
        aria-label={`${ariaLabel}: ${activeOption?.nhan}. Bấm để đổi sang ${nextOption?.nhan}`}
        title={`Đổi sang ${nextOption?.shortLabel ?? nextOption?.nhan}`}
      >
        <span className="ui-mode-rotate-button__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 2l4 4-4 4" />
            <path d="M3 11V8a2 2 0 0 1 2-2h16" />
            <path d="M7 22l-4-4 4-4" />
            <path d="M21 13v3a2 2 0 0 1-2 2H3" />
          </svg>
        </span>
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
