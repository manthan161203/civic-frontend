'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { adminApi } from '@/api/index';
import { qk } from '@/api/queryKeys';

import Card from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

/**
 * Worker leaderboard.
 *
 * Eleven columns of numbers with no way to reorder them — the score column
 * decided the ranking and every other figure was there to be squinted at. The
 * whole list arrives in one response (the endpoint caps at 50 and takes no page
 * parameter), so every column here sorts client-side, which is honest: the table
 * really does hold everything there is.
 *
 * The medal glyphs are gone. Rank is a number, and three coloured circles that
 * only appear in the first three rows were doing less work than `#1` does.
 */

/** Resolution rate as a bar plus its number, so the row scans at a glance. */
function RateBar({ value }) {
  const rate = value ?? 0;
  const tone = rate >= 80 ? 'bg-success' : rate >= 50 ? 'bg-warning' : 'bg-danger';

  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-alt">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${rate}%` }} />
      </span>
      <span className="tabular text-xs text-ink-muted">{rate}%</span>
    </span>
  );
}

export default function LeaderboardTab() {
  const leaderboardQuery = useQuery({
    queryKey: qk.workers.leaderboard({ limit: 50 }),
    queryFn: ({ signal }) => adminApi.getWorkerLeaderboard(50, { signal }).then((r) => r.data),
    staleTime: 60_000,
  });

  // `List[Dict]` from the API, but the loader has historically also seen an
  // `{items}` envelope; accept both rather than rendering nothing.
  const rows = useMemo(() => {
    const data = leaderboardQuery.data;
    return Array.isArray(data) ? data : (data?.items ?? []);
  }, [leaderboardQuery.data]);

  const columns = useMemo(
    () => [
      {
        key: '_rank',
        header: '#',
        width: '3rem',
        align: 'right',
        render: (_w, i) => <span className="tabular text-xs text-ink-subtle">{i + 1}</span>,
      },
      {
        key: 'name',
        header: 'Worker',
        sortable: true,
        render: (w) => (
          <>
            <span className="block truncate font-medium text-ink">{w.name}</span>
            <span className="tabular block truncate text-xs text-ink-subtle">
              {[w.department, w.ward].filter(Boolean).join(' · ') || '—'}
            </span>
          </>
        ),
      },
      {
        key: 'is_online',
        header: 'Status',
        sortable: true,
        width: '8rem',
        render: (w) => (
          <span className="flex flex-wrap gap-1">
            <StatusBadge kind="presence" value={w.is_online ? 'online' : 'offline'} />
            {/* Availability is only meaningful while they are online — an
                offline worker is not "available", they are just away. */}
            {w.is_online && !w.is_available && <StatusBadge kind="presence" value="busy" />}
          </span>
        ),
      },
      {
        key: 'tasks_resolved',
        header: 'Resolved',
        sortable: true,
        align: 'right',
        width: '6rem',
        render: (w) => (
          <span className="tabular font-medium text-success">{w.tasks_resolved ?? 0}</span>
        ),
      },
      {
        key: 'tasks_in_progress',
        header: 'Open',
        sortable: true,
        align: 'right',
        hideBelow: 'md',
        width: '5rem',
        render: (w) => <span className="tabular text-ink-muted">{w.tasks_in_progress ?? 0}</span>,
      },
      {
        key: 'tasks_total',
        header: 'Total',
        sortable: true,
        align: 'right',
        hideBelow: 'md',
        width: '5rem',
        render: (w) => <span className="tabular text-ink-muted">{w.tasks_total ?? 0}</span>,
      },
      {
        key: 'resolution_rate',
        header: 'Rate',
        sortable: true,
        hideBelow: 'lg',
        width: '8rem',
        render: (w) => <RateBar value={w.resolution_rate} />,
      },
      {
        key: 'avg_rating',
        header: 'Rating',
        sortable: true,
        align: 'right',
        hideBelow: 'md',
        width: '6rem',
        render: (w) =>
          w.avg_rating != null ? (
            <span className="tabular text-ink">{w.avg_rating.toFixed(1)}</span>
          ) : (
            <span className="text-ink-subtle">—</span>
          ),
      },
      {
        key: 'score',
        header: 'Score',
        sortable: true,
        align: 'right',
        width: '5.5rem',
        render: (w) => (
          <Badge tone="primary">
            <span className="tabular">{w.score ?? 0}</span>
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <Card
      flush
      title="Worker leaderboard"
      subtitle="Ranked by score — tasks resolved weighted by citizen rating. Top 50."
    >
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(w) => w.worker_id ?? w.id ?? w.name}
        caption="Worker performance leaderboard"
        density="sm"
        loading={leaderboardQuery.isPending}
        error={leaderboardQuery.error}
        onRetry={leaderboardQuery.refetch}
        skeletonRows={10}
        // Safe here specifically because there is no pagination: the table holds
        // the entire result set, so a client sort reorders all of it.
        sortMode="client"
        empty={
          <EmptyState
            size="sm"
            icon="users"
            title="No ranked workers yet"
            description="Workers appear once they have resolved at least one issue."
          />
        }
      />
    </Card>
  );
}
