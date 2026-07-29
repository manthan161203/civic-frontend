'use client';

/**
 * Title, subtitle, and a slot for the screen's primary actions.
 *
 * Every screen re-rolls this, and `layout/Header.js` only knows the titles for
 * 14 of the 27 routes — the other thirteen (blocked-tasks, surveys, disputes,
 * complaints, sla, leaderboard, custom-types, squads, bulk-notifications,
 * geofence, ai-insights, info, profile) render a bare "Admin" in the top bar
 * with no indication of where you are.
 *
 * Putting the name in the page rather than only in the chrome means a screen
 * cannot be nameless.
 *
 * @param {{ title: string, subtitle?: string, actions?: React.ReactNode,
 *           count?: number|string, className?: string }} props
 *   `count` renders beside the title — in a triage console the size of the
 *   queue is part of the heading, not a detail below it.
 */
export default function PageHeader({ title, subtitle, actions, count, className = '' }) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
          {count !== undefined && count !== null && (
            <span className="tabular text-sm text-ink-muted">
              {typeof count === 'number' ? count.toLocaleString() : count}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
