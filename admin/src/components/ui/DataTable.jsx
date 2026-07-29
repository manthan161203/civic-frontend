'use client';

import { useId, useMemo, useRef, useEffect, useState } from 'react';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import Pagination from './Pagination';
import { ErrorPanel } from './AsyncBoundary';
import { StatusRail } from './Badge';
import SvgIcon from './SvgIcon';

/**
 * The table.
 *
 * Eight `<table>` blocks are hand-written across seven screens, each repeating
 * `<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">`
 * and each solving loading, empty and selection slightly differently.
 *
 * ── Sorting is the decision that matters ─────────────────────────────────────
 *
 * Only `/admin/blocked-tasks` accepts a `sort` parameter. Sorting the current
 * page client-side on a server-paginated table is **a correctness bug, not a
 * compromise**: it reorders the twenty rows on screen while the user reads the
 * result as "oldest first" across all five thousand. A sort arrow that lies is
 * worse than no sort arrow.
 *
 * So `sortMode` is explicit and defaults to `'none'`, which renders no sort
 * affordance at all. A dev-time invariant throws on the combination that would
 * lie, turning a design argument into a build failure rather than a convention
 * someone has to remember.
 *
 * The invariant's real subject is **whether `rows` is the whole result set**,
 * which it originally inferred from `pagination` being present. That inference
 * is wrong for a screen like `/dashboard/surveys`, where the endpoint returns
 * every row in one payload and paging is purely a rendering concern — there,
 * sorting client-side is not just safe, it is the only thing that works.
 * `pagination.clientSide` states it outright: the caller hands over the full
 * array and DataTable owns both the sort and the slice, in that order. Slicing
 * in the caller and sorting here would sort one page and call it the whole set,
 * which is the exact bug the invariant exists to prevent.
 *
 * ── Precedence ───────────────────────────────────────────────────────────────
 *
 * error → loading → empty → rows. Screens get this wrong by checking
 * `rows.length === 0` first, so a failed request renders "No issues found" and
 * the user has no idea anything broke.
 */

/**
 * @template TRow
 * @typedef {object} Column
 * @property {string} key stable id; also the sort key
 * @property {React.ReactNode} header
 * @property {(row: TRow, index: number) => React.ReactNode} [render]
 *           omitted → `row[key]`, with an em dash for null
 * @property {boolean} [sortable=false] ignored unless sortMode !== 'none'
 * @property {'left'|'center'|'right'} [align='left']
 * @property {string} [width] e.g. '12rem'
 * @property {string} [className] applied to the <td>
 * @property {'md'|'lg'} [hideBelow] responsive drop
 */

/**
 * @template TRow
 * @typedef {object} DataTableProps
 * @property {TRow[]} rows
 * @property {Column<TRow>[]} columns
 * @property {(row: TRow) => string} getRowId
 * @property {string} [caption] visually hidden, for screen readers
 *
 * @property {boolean} [loading=false]
 * @property {unknown} [error]
 * @property {() => void} [onRetry]
 * @property {number} [skeletonRows=8]
 * @property {React.ReactNode} [empty]
 *
 * @property {boolean} [selectable=false]
 * @property {string[]} [selectedIds]
 * @property {(ids: string[]) => void} [onSelectionChange]
 * @property {React.ReactNode} [bulkActions]
 *
 * @property {'none'|'server'|'client'} [sortMode='none']
 * @property {{ key: string, dir: 'asc'|'desc' }|null} [sort]
 * @property {(next: { key: string, dir: 'asc'|'desc' }|null) => void} [onSortChange]
 *
 * @property {object|null} [pagination] props for <Pagination>, or null for none
 * @property {boolean} [pagination.clientSide=false]
 *           `rows` is the complete result set, not one page of it. DataTable
 *           sorts then slices; `pagination.total` must be the full length.
 *
 * @property {(row: TRow) => void} [onRowClick]
 * @property {(row: TRow) => string} [rowClassName]
 * @property {{ kind: string, value: (row: TRow) => string }} [rail]
 *           the leading status bar — the console's main status affordance
 * @property {'sm'|'md'} [density='md']
 */

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };
const HIDE = { md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

/** @param {DataTableProps<any>} props */
export default function DataTable({
  rows,
  columns,
  getRowId,
  caption,
  loading = false,
  error,
  onRetry,
  skeletonRows = 8,
  empty,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  bulkActions,
  sortMode = 'none',
  sort = null,
  onSortChange,
  pagination = null,
  onRowClick,
  rowClassName,
  rail,
  density = 'md',
}) {
  const captionId = useId();
  const selectAllRef = useRef(null);

  if (
    process.env.NODE_ENV !== 'production' &&
    sortMode === 'client' &&
    pagination &&
    !pagination.clientSide
  ) {
    throw new Error(
      '[DataTable] sortMode="client" with server-side pagination sorts only the ' +
        'rows currently on screen, which users read as sorting the whole result ' +
        'set. Use sortMode="server" if the endpoint accepts a sort parameter, ' +
        'pagination.clientSide if `rows` is already the complete result set, ' +
        'otherwise sortMode="none".',
    );
  }

  /*
   * Client sorting keeps its own state unless the caller supplies some.
   *
   * Requiring `sort` + `onSortChange` in client mode would mean every screen
   * holds state for something the table is doing entirely by itself — and the
   * failure is silent: the header renders an arrow, the click goes nowhere.
   * Server mode is still fully controlled, because there the caller has to fold
   * the sort into its query.
   */
  const [internalSort, setInternalSort] = useState(null);
  const controlledSort = onSortChange !== undefined;
  const activeSort = controlledSort ? sort : (sortMode === 'client' ? internalSort : sort);
  const applySort = controlledSort ? onSortChange : setInternalSort;

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const sortedRows = useMemo(() => {
    if (sortMode !== 'client' || !activeSort) return rows;
    const { key, dir } = activeSort;
    const factor = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a?.[key];
      const bv = b?.[key];
      if (av === bv) return 0;
      // Nulls sort last in both directions — a blank cell is not "smallest",
      // it is "unknown", and burying it at the top of an ascending sort hides
      // real data behind it.
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return (av > bv ? 1 : -1) * factor;
    });
  }, [rows, activeSort, sortMode]);

  // Sort first, then slice. The other order sorts one page and presents it as
  // the whole set — the very thing the invariant above rejects.
  const clientPage = pagination?.clientSide ? pagination : null;
  const visibleRows = useMemo(() => {
    if (!clientPage) return sortedRows;
    const start = ((clientPage.page ?? 1) - 1) * (clientPage.pageSize ?? 20);
    return sortedRows.slice(start, start + (clientPage.pageSize ?? 20));
  }, [sortedRows, clientPage]);

  // Selection is scoped to what is on screen, which under client paging is the
  // slice rather than everything handed in.
  const pageIds = useMemo(() => visibleRows.map(getRowId), [visibleRows, getRowId]);

  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  // `indeterminate` is a DOM property, not an attribute, so React cannot set it
  // declaratively. Without it "3 of 20 selected" renders identically to
  // "0 selected" — which is exactly what the old issues table did.
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someOnPageSelected && !allOnPageSelected;
    }
  }, [someOnPageSelected, allOnPageSelected]);

  const toggleAll = () => {
    if (!onSelectionChange) return;
    // Scoped to the current page. "Select all" meaning every row across every
    // page is how a bulk action ends up touching records the user never saw.
    const next = new Set(selected);
    if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
    else pageIds.forEach((id) => next.add(id));
    onSelectionChange([...next]);
  };

  const toggleOne = (id) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange([...next]);
  };

  const headerSort = (column) => {
    if (sortMode === 'none' || !column.sortable || !applySort) return;
    if (activeSort?.key !== column.key) applySort({ key: column.key, dir: 'asc' });
    else if (activeSort.dir === 'asc') applySort({ key: column.key, dir: 'desc' });
    else applySort(null); // third click clears, rather than cycling forever
  };

  const colCount = columns.length + (selectable ? 1 : 0);
  // Density is expressed as cell padding rather than a row height: a <tr> does
  // not honour height reliably across browsers, and padding also keeps the
  // skeleton rows exactly the same height as the real ones, so nothing shifts
  // when data lands.
  const cellPad = density === 'sm' ? 'px-3 py-1.5' : 'px-3 py-2.5';

  return (
    <div>
      {bulkActions && selected.size > 0 && (
        <div className="border-b border-divider px-3 py-2">{bulkActions}</div>
      )}

      {error ? (
        <ErrorPanel error={error} onRetry={onRetry} compact />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" aria-describedby={caption ? captionId : undefined}>
            {caption && (
              <caption id={captionId} className="sr-only">
                {caption}
              </caption>
            )}

            <thead>
              <tr className="border-b border-border bg-surface-alt">
                {selectable && (
                  <th scope="col" className="w-9 px-3 py-2">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      aria-label="Select all rows on this page"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      disabled={pageIds.length === 0}
                      className="h-3.5 w-3.5 accent-[var(--color-primary)]"
                    />
                  </th>
                )}

                {columns.map((column) => {
                  const canSort = sortMode !== 'none' && column.sortable;
                  const active = activeSort?.key === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      style={column.width ? { width: column.width } : undefined}
                      aria-sort={
                        active ? (activeSort.dir === 'asc' ? 'ascending' : 'descending') : undefined
                      }
                      className={`${cellPad} text-[11px] font-semibold uppercase tracking-wide
                        text-ink-muted ${ALIGN[column.align ?? 'left']}
                        ${column.hideBelow ? HIDE[column.hideBelow] : ''}`}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={() => headerSort(column)}
                          className="inline-flex items-center gap-1 uppercase hover:text-ink"
                        >
                          {column.header}
                          <span className={active ? 'text-primary' : 'text-ink-subtle/50'}>
                            <SvgIcon
                              name={active && activeSort.dir === 'desc' ? 'chevronDown' : 'chevronUp'}
                              size={11}
                            />
                          </span>
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={`skeleton-${i}`} className="border-b border-divider">
                    {selectable && (
                      <td className={cellPad}>
                        <Skeleton width={14} height={14} />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`${cellPad} ${column.hideBelow ? HIDE[column.hideBelow] : ''}`}
                      >
                        <Skeleton height={12} width={`${55 + ((i * 7) % 35)}%`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={colCount}>
                    {empty ?? <EmptyState size="sm" title="Nothing to show" />}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, index) => {
                  const id = getRowId(row);
                  const isSelected = selected.has(id);
                  return (
                    <tr
                      key={id}
                      data-selected={isSelected || undefined}
                      onClick={
                        onRowClick
                          ? (e) => {
                              // A click on a checkbox, button or link inside a
                              // cell must not also open the row — otherwise the
                              // detail modal opens behind every Delete press.
                              if (e.target.closest('button, a, input, select, textarea, label')) {
                                return;
                              }
                              onRowClick(row);
                            }
                          : undefined
                      }
                      className={`relative border-b border-divider transition-colors
                        ${isSelected ? 'bg-primary-soft/60' : 'hover:bg-surface-alt'}
                        ${onRowClick ? 'cursor-pointer' : ''}
                        ${rowClassName?.(row) ?? ''}`}
                    >
                      {selectable && (
                        <td className={`${cellPad} relative`}>
                          {rail && <StatusRail kind={rail.kind} value={rail.value(row)} />}
                          <input
                            type="checkbox"
                            aria-label={`Select row ${index + 1}`}
                            checked={isSelected}
                            onChange={() => toggleOne(id)}
                            className="h-3.5 w-3.5 accent-[var(--color-primary)]"
                          />
                        </td>
                      )}

                      {columns.map((column, columnIndex) => (
                        <td
                          key={column.key}
                          className={`${cellPad} ${ALIGN[column.align ?? 'left']}
                            ${column.hideBelow ? HIDE[column.hideBelow] : ''}
                            ${column.className ?? ''}
                            ${!selectable && columnIndex === 0 ? 'relative' : ''}`}
                        >
                          {!selectable && columnIndex === 0 && rail && (
                            <StatusRail kind={rail.kind} value={rail.value(row)} />
                          )}
                          {column.render
                            ? column.render(row, index)
                            : formatCell(row?.[column.key])}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {pagination && !error && !loading && <Pagination {...pagination} />}
    </div>
  );
}

/**
 * A column with no `render` still has to show *something* for null.
 * `String(null)` is the literal text "null", which has shipped to users before.
 */
function formatCell(value) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-ink-subtle">—</span>;
  }
  return String(value);
}
