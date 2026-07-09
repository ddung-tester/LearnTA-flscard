/**
 * Skeleton — Loading placeholder dùng chung.
 *
 * Props:
 *   variant: "text" | "circle" | "rect" (mặc định "rect")
 *   width: CSS width (mặc định "100%")
 *   height: CSS height (mặc định dựa theo variant)
 *   className: thêm class tùy ý
 *   count: số lượng skeleton hiển thị (mặc định 1)
 */
function Skeleton({
  variant = "rect",
  width,
  height,
  className = "",
  count = 1,
}) {
  const baseClass = "ui-skeleton";
  const variantClass = variant !== "rect" ? `ui-skeleton--${variant}` : "";

  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  if (count <= 1) {
    return (
      <span
        className={`${baseClass} ${variantClass} ${className}`.trim()}
        style={style}
        aria-hidden="true"
      />
    );
  }

  return Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className={`${baseClass} ${variantClass} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  ));
}

/**
 * DeckCardSkeleton — Skeleton giống hình dạng deck card.
 */
export function DeckCardSkeleton() {
  return (
    <div className="ui-deck-card rounded-xl border border-[var(--mau-vien)]/40 bg-[var(--mau-mat)] px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 pt-0.5">
          <Skeleton width="65%" height="1.25rem" className="mb-2.5" />
          <Skeleton width="90%" height="0.85rem" className="mb-1.5" />
          <Skeleton width="45%" height="0.85rem" />
        </div>
      </div>
      <div className="mt-3 border-t border-[var(--mau-vien)]/30 pt-3 flex gap-2">
        <Skeleton width="3.5rem" height="1.5rem" className="rounded-full" />
        <Skeleton width="7rem" height="1.5rem" className="rounded-full" />
      </div>
    </div>
  );
}

/**
 * DeckListSkeleton — Skeleton cho toàn bộ danh sách deck.
 */
export function DeckListSkeleton({ count = 3 }) {
  return (
    <div className="ui-deck-grid" aria-busy="true" aria-label="Đang tải danh sách bộ từ">
      {Array.from({ length: count }, (_, i) => (
        <DeckCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
