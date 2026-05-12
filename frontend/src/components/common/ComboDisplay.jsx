/**
 * ComboDisplay — hiển thị ⚡ Combo xN gần progress bar.
 *
 * Props:
 *   combo      - số combo hiện tại
 *   phase      - "idle" | "increment" | "break"
 */
function ComboDisplay({ combo, phase }) {
  // Chỉ hiện khi combo >= 2
  const visible = combo >= 2;

  if (!visible && phase !== "break") return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`ui-combo ui-combo--${phase}`}
    >
      <span className="ui-combo__icon" aria-hidden="true">⚡</span>
      <span className="ui-combo__label">
        Combo <span className="ui-combo__count">x{combo}</span>
      </span>
    </div>
  );
}

export default ComboDisplay;
