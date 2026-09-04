'use client';

/**
 * Loading placeholders. These replace the "empty screen then pop-in" behaviour
 * so the layout does not shift once real data lands.
 */

export function Skeleton({ w = '100%', h = 14, style }: { w?: string | number; h?: string | number; style?: React.CSSProperties }) {
  return <span className="skel" style={{ width: w, height: h, ...style }} aria-hidden="true" />;
}

export function CupCardSkeleton() {
  return (
    <div className="skel-card" aria-hidden="true">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton w={78} h={12} />
        <Skeleton w={62} h={12} />
      </div>
      <Skeleton w="55%" h={11} />
      <Skeleton w="82%" h={26} />
      <Skeleton w="42%" h={15} />
      <Skeleton h={8} style={{ borderRadius: 99 }} />
      <Skeleton h={42} style={{ marginTop: 'auto', borderRadius: 8 }} />
    </div>
  );
}

export function CupGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="cup-grid" role="status" aria-label="Loading tournaments">
      <span className="sr-only">Loading tournaments…</span>
      {Array.from({ length: count }).map((_, i) => (
        <CupCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="ranking-table" role="status" aria-label="Loading standings">
      <span className="sr-only">Loading standings…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          className="ranking-row"
          key={i}
          style={{ opacity: 1 - i * 0.11 }}
          aria-hidden="true"
        >
          <Skeleton w={26} h={13} />
          <Skeleton w="58%" h={13} />
          <Skeleton w={26} h={13} />
          <Skeleton w={26} h={13} />
          <Skeleton w={34} h={13} />
        </div>
      ))}
    </div>
  );
}
