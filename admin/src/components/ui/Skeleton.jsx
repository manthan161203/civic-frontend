'use client';

/**
 * Loading placeholders shaped like the content that is coming.
 *
 * The console had four competing idioms for "loading": the literal text
 * `Loading…` (9 screens), a bordered spinner div (7), hand-rolled
 * `animate-pulse` blocks (9), and the real skeleton components (1). A skeleton
 * beats a spinner here because these screens are dense — reserving the layout
 * stops the page reflowing when data lands, and it tells the user what shape of
 * thing to expect.
 *
 * The shimmer respects `prefers-reduced-motion` via the global rule in
 * globals.css.
 */

/**
 * @typedef {object} SkeletonProps
 * @property {number|string} [width='100%']
 * @property {number|string} [height=16]
 * @property {'control'|'card'|'full'} [rounded='control']
 * @property {string} [className]
 */

/** @param {SkeletonProps} props */
export default function Skeleton({
  width = '100%',
  height = 16,
  rounded = 'control',
  className = '',
}) {
  const radius = {
    control: 'rounded-control',
    card: 'rounded-card',
    full: 'rounded-full',
  }[rounded];

  return (
    <span
      aria-hidden="true"
      className={`block bg-divider ${radius} ${className}`}
      style={{
        width,
        height,
        // A moving highlight rather than a pulse: at 32px row height a pulsing
        // block reads as flicker, while a sweep reads as progress.
        backgroundImage:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.75) 50%, transparent 100%)',
        backgroundSize: '800px 100%',
        backgroundRepeat: 'no-repeat',
        animation: 'civic-shimmer 1.4s ease-in-out infinite',
      }}
    />
  );
}

/**
 * A block of text lines, the last one short so it reads as a paragraph rather
 * than a stack of bars.
 *
 * @param {{ lines?: number, className?: string }} props
 */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

/**
 * Placeholder for a stat card — the shape the dashboard and SLA screens use.
 *
 * @param {{ count?: number }} props
 */
export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-card border border-border bg-surface p-4">
          <Skeleton width="55%" height={10} />
          <Skeleton width="35%" height={24} className="mt-3" />
        </div>
      ))}
    </div>
  );
}

/**
 * A wrapper that announces loading once, politely, for screen readers.
 *
 * The individual skeleton bars are `aria-hidden` — a dozen "loading" elements
 * announced separately is noise, and announcing nothing at all leaves a
 * non-sighted user with silence while the page fetches.
 *
 * @param {{ children: React.ReactNode, label?: string }} props
 */
export function SkeletonRegion({ children, label = 'Loading' }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
