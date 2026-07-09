/**
 * DashIcon — hand-crafted minimal SVG icons for the Dashboard.
 * 20×20 viewBox, 1.5px stroke, round linecap, currentColor.
 * No icon-library dependency. Each icon is a render function
 * so icons feel specific to this product, not a generic kit.
 *
 * Usage: <DashIcon name="decks" size={16} />
 */

function Decks({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="11" height="9" rx="1.5" />
      <path d="M6 6V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5v9A1.5 1.5 0 0 1 16.5 15H14" />
    </svg>
  );
}

function Add({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 7v6M7 10h6" />
    </svg>
  );
}

function Notebook({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h8a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 13 17H5a1.5 1.5 0 0 1-1.5-1.5V4.5A1.5 1.5 0 0 1 5 3Z" />
      <path d="M7 7.5h6M7 10.5h4" />
    </svg>
  );
}

function Review({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 10a5.5 5.5 0 1 0 5.5-5.5c-2 0-3.8.8-5.1 2.1" />
      <path d="M4.5 6.5V10H8" />
    </svg>
  );
}

function Stats({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M4 14.5V10.5M9.5 14.5V7.5M15 14.5V5" />
    </svg>
  );
}

function Flame({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 16.5c-2.5 0-4.5-1.8-4.5-4.5 0-2 1.5-3.5 2.5-4.5 0 1.5 1 2.5 2 2.5.5-1.5 0-3.5 1-5 2 2 3.5 4 3.5 7 0 2.5-2 4.5-4.5 4.5Z" />
    </svg>
  );
}

function Vocab({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 14 10 6l3.5 8" />
      <path d="M7.8 11h4.4" />
      <path d="M5 16.5h10" />
    </svg>
  );
}

function Star({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3.5l1.8 3.8 4 .6-2.9 2.8.7 4L10 12.6l-3.6 2.1.7-4-2.9-2.8 4-.6L10 3.5Z" />
    </svg>
  );
}

function Mastered({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10.5l2 2 4-4" />
    </svg>
  );
}

const MAP = {
  decks: Decks,
  add: Add,
  notebook: Notebook,
  review: Review,
  stats: Stats,
  flame: Flame,
  vocab: Vocab,
  star: Star,
  mastered: Mastered,
};

export default function DashIcon({ name, size = 16, className = "" }) {
  const Icon = MAP[name];
  if (!Icon) return null;
  return (
    <span
      className={`dash-icon${className ? ` ${className}` : ""}`}
      style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}
      aria-hidden="true"
    >
      <Icon size={size} />
    </span>
  );
}
