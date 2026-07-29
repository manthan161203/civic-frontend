'use client';

/**
 * A surface.
 *
 * The console renders `bg-white rounded-xl shadow-sm border border-gray-100`
 * in hundreds of places, with the radius drifting between `rounded-lg` and
 * `rounded-xl` from screen to screen and sometimes within one modal footer.
 *
 * (A `.card` class did exist in globals.css, unused, and specified
 * `rounded-lg border-gray-200` — adopting it would have been a regression. It
 * has been deleted along with the other seven dead `@apply` rules.)
 *
 * @typedef {object} CardProps
 * @property {React.ReactNode} children
 * @property {string} [title]
 * @property {string} [subtitle]
 * @property {React.ReactNode} [actions] right-aligned in the header
 * @property {'none'|'sm'|'md'|'lg'} [padding='md']
 * @property {boolean} [flush=false] no padding at all — for a DataTable body
 * @property {string} [className]
 */

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/** @param {CardProps} props */
export default function Card({
  children,
  title,
  subtitle,
  actions,
  padding = 'md',
  flush = false,
  className = '',
}) {
  const hasHeader = Boolean(title || subtitle || actions);
  const bodyPadding = flush ? '' : PADDING[padding];

  return (
    <section
      className={`overflow-hidden rounded-card border border-border bg-surface ${className}`}
    >
      {hasHeader && (
        <header className="flex items-start justify-between gap-4 border-b border-divider px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}

      <div className={bodyPadding}>{children}</div>
    </section>
  );
}

/**
 * A single figure with a label — the stat tile used across the dashboard, SLA
 * and surveys screens.
 *
 * `StatCard` was defined twice, independently, in `app/dashboard/page.js` and
 * `app/dashboard/surveys/page.js`, with different props.
 *
 * @param {{ label: string, value: React.ReactNode, hint?: string,
 *           tone?: 'default'|'danger'|'warning'|'success', icon?: React.ReactNode }} props
 */
export function StatCard({ label, value, hint, tone = 'default', icon }) {
  const valueTone = {
    default: 'text-ink',
    danger: 'text-danger',
    warning: 'text-warning-strong',
    success: 'text-success',
  }[tone];

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
          {label}
        </p>
        {icon && <span className="text-ink-subtle">{icon}</span>}
      </div>
      {/* tabular so a row of these does not ripple as the numbers change */}
      <p className={`tabular mt-2 text-2xl font-semibold ${valueTone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}
