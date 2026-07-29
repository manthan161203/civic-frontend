'use client';

import Skeleton from './Skeleton';

/**
 * The dashboard's loading shape.
 *
 * ── What this used to be ─────────────────────────────────────────────────────
 *
 * A blue-tinted skeleton with its own `@keyframes shimmer` in an inline
 * `<style>` block. Three problems, in rising order of seriousness:
 *
 *  - **Blue.** A skeleton stands in for content that has not arrived. Tinting it
 *    with the brand colour makes it read as content — several small blue cards
 *    where the real screen has white ones — so the moment data lands the whole
 *    page changes colour.
 *  - **The inline `<style>`.** Rendered once per mount, and the same trick
 *    elsewhere put sixty duplicate `<style>` elements on the issues table.
 *    `civic-shimmer` lives in globals.css now.
 *  - **No reduced-motion handling.** globals.css stops the shared animation for
 *    anyone who has asked for that; a component-local keyframe ignores it.
 *
 * `CardSkeleton`, `ListSkeleton` and `FormSkeleton` used to live here too. Their
 * only consumer was `/dashboard/loading-preview`, a dev gallery that was still
 * routed in production builds; it and they are gone.
 *
 * ── Why it stays a bespoke component ─────────────────────────────────────────
 *
 * `SkeletonCards` covers a plain grid. This screen is a grid *and* two charts
 * *and* a table, and a skeleton is only worth having if it is the same shape and
 * height as what replaces it — otherwise the page jumps when data lands, which
 * is the thing skeletons exist to prevent.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading dashboard">
      <div className="space-y-2">
        <Skeleton height={20} width="12rem" />
        <Skeleton height={12} width="20rem" />
      </div>

      {/* Stat tiles — matches the four StatCards on the real screen. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-card border border-border bg-surface p-4">
            <Skeleton height={11} width="60%" />
            <Skeleton height={26} width="45%" className="mt-3" />
            <Skeleton height={10} width="70%" className="mt-2" />
          </div>
        ))}
      </div>

      {/* Two charts side by side. Fixed height so the row does not resize. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="rounded-card border border-border bg-surface p-4">
            <Skeleton height={13} width="10rem" />
            <div className="mt-5 flex h-40 items-end gap-2">
              {/* Deterministic heights, not random: a skeleton that reshuffles
                  on every render reads as content still arriving. */}
              {[45, 70, 30, 85, 55, 65, 40].map((h, j) => (
                <Skeleton key={j} height={`${h}%`} className="flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-border bg-surface p-4">
        <Skeleton height={13} width="10rem" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-divider pb-3 last:border-0">
              <Skeleton width={32} height={32} rounded="full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton height={12} width={`${45 + ((i * 13) % 30)}%`} />
                <Skeleton height={10} width="60%" />
              </div>
              <Skeleton height={22} width="4.5rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
