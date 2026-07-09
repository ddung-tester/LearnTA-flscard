/**
 * DeckDetailSkeleton — Skeleton cho trang chi tiết bộ từ.
 * Hiển thị skeleton cho header, stats, actions, và danh sách từ.
 */
import Skeleton from "./Skeleton";

function DeckDetailSkeleton() {
  return (
    <div className="ui-page-stack" aria-busy="true" aria-label="Đang tải chi tiết bộ từ">
      {/* Header */}
      <div className="ui-page-header">
        <div className="ui-page-header__title ui-deck-detail-header__title">
          <Skeleton width="8rem" height="1rem" className="mb-2" />
          <Skeleton width="14rem" height="1.75rem" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="ui-stat-grid">
        <div className="ui-stat-card border border-[var(--mau-vien)]/40 bg-[var(--mau-mat)]">
          <Skeleton width="3rem" height="0.75rem" className="mb-2" />
          <Skeleton width="2rem" height="1.5rem" />
        </div>
        <div className="ui-stat-card border border-[var(--mau-vien)]/40 bg-[var(--mau-mat)]">
          <Skeleton width="3.5rem" height="0.75rem" className="mb-2" />
          <Skeleton width="2.5rem" height="1.5rem" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="ui-action-grid">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--mau-vien)]/40 bg-[var(--mau-mat)] p-4"
          >
            <Skeleton width="60%" height="1rem" className="mb-2" />
            <Skeleton width="40%" height="0.75rem" />
          </div>
        ))}
      </div>

      {/* Word list header */}
      <div className="flex items-center justify-between mt-2 mb-3">
        <Skeleton width="7rem" height="1.25rem" />
        <Skeleton width="5rem" height="1.75rem" className="rounded-full" />
      </div>

      {/* Word list skeleton */}
      <div className="ui-card-list">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="ui-reading-card rounded-xl border border-[var(--mau-vien)]/40 bg-[var(--mau-mat)] px-4 py-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Skeleton width="50%" height="1rem" className="mb-2" />
                <Skeleton width="35%" height="0.85rem" />
              </div>
              <Skeleton variant="circle" width="2rem" height="2rem" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DeckDetailSkeleton;
