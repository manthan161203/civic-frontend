'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Pagination state for a server-paginated list.
 *
 * Two things this hides.
 *
 * **The two conventions.** Most admin endpoints take `page`/`size`;
 * `/admin/blocked-tasks` takes `limit`/`offset`. That difference is documented
 * in `src/api/index.js` and every screen has to remember which it is on. Here
 * it is a `mode` flag and the caller just spreads `params`.
 *
 * **The reset triple.** `app/dashboard/issues/page.js` repeats
 *
 *     setPage(1); setSelected([]); setDetailIssue(null);
 *
 * verbatim inside three separate onChange handlers. Forgetting it leaves the
 * user on page 4 of a filter that now has one page of results — an empty table
 * that looks like "no matches".
 *
 * Deliberately **not** the dead `usePagination` in `src/store/uiStore.js`: that
 * one is a global Zustand singleton, so two tables mounted at once would share
 * a single `page`. This is per-instance.
 */

/**
 * @typedef {object} PagedListOptions
 * @property {'page'|'offset'} [mode='page']
 * @property {number} [initialPageSize=20]
 * @property {unknown[]} [resetOn=[]] page returns to 1 when any of these change
 * @property {() => void} [onReset] clear selection, close detail panes, etc.
 */

/**
 * @param {PagedListOptions} [options]
 */
export function usePagedList({
  mode = 'page',
  initialPageSize = 20,
  resetOn = [],
  onReset,
} = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Keep the callback in a ref so a caller passing an inline arrow does not
  // re-trigger the reset effect on every render.
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  const resetKey = JSON.stringify(resetOn);
  const firstRun = useRef(true);

  useEffect(() => {
    // Skip the mount pass — otherwise every list clears its selection and
    // resets to page 1 immediately after rendering, which looks like a flash.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setPage(1);
    onResetRef.current?.();
  }, [resetKey]);

  const params = useMemo(
    () =>
      mode === 'offset'
        ? { limit: pageSize, offset: (page - 1) * pageSize }
        : { page, size: pageSize },
    [mode, page, pageSize],
  );

  const changePageSize = useCallback((size) => {
    setPageSize(size);
    // Page 7 at 20 rows does not exist at 100. Staying put shows an empty
    // table; going back to the start is the only answer that always holds.
    setPage(1);
  }, []);

  /**
   * Props for `<Pagination>`, so a screen never wires five callbacks by hand.
   * @param {number} total
   */
  const paginationProps = useCallback(
    (total) => ({
      page,
      pageSize,
      total: total ?? 0,
      onPageChange: setPage,
      onPageSizeChange: changePageSize,
    }),
    [page, pageSize, changePageSize],
  );

  return { page, pageSize, setPage, setPageSize: changePageSize, params, paginationProps };
}

export default usePagedList;
