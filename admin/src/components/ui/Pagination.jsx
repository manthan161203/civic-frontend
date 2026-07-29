'use client';

import IconButton from './IconButton';

/**
 * Pagination.
 *
 * Six independent implementations exist, and three of them are broken in ways a
 * user would notice:
 *
 *   - `/dashboard/admins` requests `{page: 1, size: 50}` and renders no pager
 *     at all, so the admin list silently stops at fifty.
 *   - `/dashboard/admin-overrides` passes server pagination params on both tabs
 *     and renders no controls, so page 1 is the only reachable page.
 *   - `/dashboard/blocked-tasks` shows at most five numbered pages and never
 *     advances past the fifth.
 *
 * @typedef {object} PaginationProps
 * @property {number} page 1-indexed
 * @property {number} pageSize
 * @property {number} total
 * @property {(page: number) => void} onPageChange
 * @property {(size: number) => void} [onPageSizeChange] omit to hide the selector
 * @property {number[]} [pageSizeOptions=[20, 50, 100]]
 * @property {boolean} [compact=false] Prev/Next only, no page numbers
 */

/**
 * Page numbers with ellipses, always including first, last and the current
 * neighbourhood. The window slides, so the last page is always reachable —
 * blocked-tasks capped the list at five and stranded everything beyond it.
 *
 * @param {number} current
 * @param {number} pageCount
 * @returns {(number|'gap')[]}
 */
function pageWindow(current, pageCount) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set([1, pageCount, current, current - 1, current + 1]);
  // Keep the row a stable width near the ends, so the control does not resize
  // as you page through it.
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  const out = [];
  let previous = 0;
  for (const p of sorted) {
    if (p - previous > 1) out.push('gap');
    out.push(p);
    previous = p;
  }
  return out;
}

/** @param {PaginationProps} props */
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
  compact = false,
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Nothing to paginate. Rendering a disabled "Page 1 of 1" under an empty
  // table is noise.
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-3 py-2"
    >
      <p className="tabular text-xs text-ink-muted">
        {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()}
      </p>

      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            Rows
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="tabular rounded-control border border-border bg-surface px-1.5 py-1
                         text-xs text-ink outline-none focus:border-primary"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center gap-0.5">
          <IconButton
            icon="chevronLeft"
            label="Previous page"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          />

          {compact ? (
            <span className="tabular px-2 text-xs text-ink-muted">
              {page} / {pageCount}
            </span>
          ) : (
            pageWindow(page, pageCount).map((entry, i) =>
              entry === 'gap' ? (
                <span key={`gap-${i}`} className="px-1 text-xs text-ink-subtle">
                  …
                </span>
              ) : (
                <button
                  key={entry}
                  type="button"
                  aria-current={entry === page ? 'page' : undefined}
                  onClick={() => onPageChange(entry)}
                  className={`tabular h-7 min-w-7 rounded-control px-1.5 text-xs transition-colors ${
                    entry === page
                      ? 'bg-primary text-white font-semibold'
                      : 'text-ink-muted hover:bg-surface-alt hover:text-ink'
                  }`}
                >
                  {entry}
                </button>
              ),
            )
          )}

          <IconButton
            icon="chevronRight"
            label="Next page"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          />
        </div>
      </div>
    </nav>
  );
}

export { pageWindow };
