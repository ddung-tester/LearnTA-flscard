/**
 * EmptyState — Hiển thị khi danh sách rỗng, kèm illustration SVG.
 *
 * Props:
 *   icon: "deck" | "card" | "favorite" | "search" | "error"
 *   title: tiêu đề chính
 *   description: mô tả phụ
 *   action: nội dung nút (text)
 *   onAction: callback khi nhấn nút
 *   actionIcon: JSX icon cho nút (tùy chọn)
 *   className: class thêm
 */

function EmptyIllustration({ icon }) {
  const size = 80;
  const common = { width: size, height: size, viewBox: "0 0 80 80", fill: "none", "aria-hidden": "true" };

  if (icon === "deck") {
    return (
      <svg {...common}>
        <rect x="14" y="20" width="52" height="40" rx="8" fill="var(--mau-chinh)" opacity="0.08" />
        <rect x="20" y="16" width="40" height="36" rx="6" fill="var(--mau-chinh)" opacity="0.15" />
        <rect x="22" y="24" width="36" height="6" rx="3" fill="var(--mau-chinh)" opacity="0.35" />
        <rect x="22" y="34" width="24" height="4" rx="2" fill="var(--mau-chinh)" opacity="0.2" />
        <circle cx="56" cy="52" r="12" fill="var(--mau-chinh)" opacity="0.12" />
        <path d="M52 52h8M56 48v8" stroke="var(--mau-chinh)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </svg>
    );
  }

  if (icon === "card") {
    return (
      <svg {...common}>
        <rect x="16" y="18" width="48" height="32" rx="6" fill="var(--mau-chinh)" opacity="0.08" />
        <rect x="20" y="14" width="40" height="28" rx="5" fill="var(--mau-chinh)" opacity="0.15" />
        <rect x="26" y="22" width="28" height="4" rx="2" fill="var(--mau-chinh)" opacity="0.35" />
        <rect x="26" y="30" width="18" height="3" rx="1.5" fill="var(--mau-chinh)" opacity="0.2" />
        <circle cx="54" cy="54" r="12" fill="var(--mau-chinh)" opacity="0.12" />
        <path d="M50 54h8M54 50v8" stroke="var(--mau-chinh)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </svg>
    );
  }

  if (icon === "favorite") {
    return (
      <svg {...common}>
        <circle cx="40" cy="38" r="22" fill="var(--mau-chinh)" opacity="0.06" />
        <path
          d="M40 52 C32 46 22 38 22 30 22 24 27 20 33 20 36 20 38 22 40 24 42 22 44 20 47 20 53 20 58 24 58 30 58 38 48 46 40 52Z"
          fill="none"
          stroke="var(--mau-chinh)"
          strokeWidth="2"
          opacity="0.3"
          strokeLinejoin="round"
        />
        <line x1="30" y1="58" x2="50" y2="58" stroke="var(--mau-chinh)" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
        <line x1="34" y1="63" x2="46" y2="63" stroke="var(--mau-chinh)" strokeWidth="2" strokeLinecap="round" opacity="0.1" />
      </svg>
    );
  }

  if (icon === "error") {
    return (
      <svg {...common}>
        <circle cx="40" cy="36" r="20" fill="var(--mau-loi)" opacity="0.08" />
        <circle cx="40" cy="36" r="16" fill="none" stroke="var(--mau-loi)" strokeWidth="2" opacity="0.25" />
        <line x1="40" y1="28" x2="40" y2="38" stroke="var(--mau-loi)" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
        <circle cx="40" cy="43" r="1.5" fill="var(--mau-loi)" opacity="0.4" />
        <line x1="28" y1="60" x2="52" y2="60" stroke="var(--mau-loi)" strokeWidth="2" strokeLinecap="round" opacity="0.12" />
      </svg>
    );
  }

  // default / search
  return (
    <svg {...common}>
      <circle cx="36" cy="34" r="16" fill="var(--mau-chinh)" opacity="0.08" />
      <circle cx="36" cy="34" r="12" fill="none" stroke="var(--mau-chinh)" strokeWidth="2" opacity="0.25" />
      <line x1="44" y1="42" x2="54" y2="52" stroke="var(--mau-chinh)" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
      <line x1="28" y1="62" x2="52" y2="62" stroke="var(--mau-chinh)" strokeWidth="2" strokeLinecap="round" opacity="0.12" />
    </svg>
  );
}

function EmptyState({
  icon = "deck",
  title,
  description,
  action,
  onAction,
  actionIcon,
  className = "",
}) {
  return (
    <div className={`ui-empty-state ${className}`.trim()}>
      <div className="ui-empty-state__illustration">
        <EmptyIllustration icon={icon} />
      </div>
      {title && (
        <p className="ui-empty-state__title">{title}</p>
      )}
      {description && (
        <p className="ui-empty-state__description">{description}</p>
      )}
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="ui-button ui-button--primary ui-empty-state__action"
        >
          {actionIcon && <span className="ui-empty-state__action-icon">{actionIcon}</span>}
          {action}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
