function ToggleSwitch({
  checked,
  onChange,
  ariaLabel = "Bật tắt",
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`ui-toggle-switch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mau-chinh)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mau-nen)] ${checked ? "ui-toggle-switch--checked" : ""}`}
    >
      <span className="ui-toggle-switch__thumb" aria-hidden="true" />
    </button>
  );
}

export default ToggleSwitch;
