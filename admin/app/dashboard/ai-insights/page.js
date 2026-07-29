'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { adminApi } from '@/api/index';
import { qk } from '@/api/queryKeys';
import { formatDateTime } from '@/lib/dateUtils';
import { elapsed } from '@/lib/relativeTime';
import { usePagedList } from '@/hooks/usePagedList';

import PageHeader from '@/components/ui/PageHeader';
import Card, { StatCard } from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Tabs from '@/components/ui/Tabs';
import Toolbar, { FilterSelect } from '@/components/ui/Toolbar';
import AsyncBoundary from '@/components/ui/AsyncBoundary';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { SkeletonCards } from '@/components/ui/Skeleton';

/**
 * Insights.
 *
 * This screen used to have no endpoint at all. It paged `/admin/issues` 200
 * rows at a time up to a 2,000-row ceiling, aggregated in the browser, and
 * rendered an amber banner conceding the figures were "a sample, not a total".
 * Anyone past 2,000 issues was reading numbers wrong by whatever factor their
 * dataset happened to be.
 *
 * `GET /admin/insights` now computes all of it in SQL over the whole scoped
 * dataset, and the drill-down lists page server-side through the new `ai_flag`
 * filter. The banner is gone because the caveat it described is gone.
 */

const TABS = [
  { id: 'low_confidence', label: 'Low confidence' },
  { id: 'poor_resolution', label: 'Poor resolution' },
];

const PERIODS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

export default function AIInsightsPage() {
  const [days, setDays] = useState('30');
  const [tab, setTab] = useState('low_confidence');

  const paged = usePagedList({ initialPageSize: 20, resetOn: [tab] });

  const insightsQuery = useQuery({
    queryKey: qk.insights.summary({ days }),
    queryFn: ({ signal }) =>
      adminApi.getInsights({ days: Number(days), narrative: true }, { signal }).then((r) => r.data),
  });

  const listParams = useMemo(
    () => ({ ...paged.params, ai_flag: tab }),
    [paged.params, tab],
  );

  const issuesQuery = useQuery({
    queryKey: qk.issues.list(listParams),
    queryFn: ({ signal }) => adminApi.getIssues(listParams, { signal }).then((r) => r.data),
  });

  const insights = insightsQuery.data;
  const ai = insights?.ai_quality;
  const rows = issuesQuery.data?.items ?? [];
  const total = issuesQuery.data?.total ?? 0;

  const coverage =
    ai && ai.total_issues > 0 ? Math.round((ai.analysed / ai.total_issues) * 100) : null;

  const columns = useMemo(
    () => [
      {
        key: 'description',
        header: 'Issue',
        width: '26rem',
        render: (issue) => (
          <>
            <a
              href={`/dashboard/issues?issue_id=${issue.id}`}
              className="block max-w-full truncate font-medium text-ink hover:text-primary hover:underline"
            >
              {issue.description || 'Untitled'}
            </a>
            <span className="block truncate text-xs text-ink-subtle">{issue.address || '—'}</span>
          </>
        ),
      },
      {
        key: 'ai_issue_type',
        header: 'AI type',
        hideBelow: 'md',
        render: (issue) => (
          <span className="text-xs capitalize text-ink-muted">{issue.ai_issue_type || '—'}</span>
        ),
      },
      {
        key: 'ai_confidence',
        header: 'Confidence',
        align: 'right',
        render: (issue) =>
          issue.ai_confidence == null ? (
            <span className="text-xs text-ink-subtle">—</span>
          ) : (
            <span
              className={`tabular text-xs ${
                issue.ai_confidence < 0.5 ? 'font-semibold text-danger' : 'text-warning-strong'
              }`}
            >
              {Math.round(issue.ai_confidence * 100)}%
            </span>
          ),
      },
      {
        key: 'ai_resolution_quality',
        header: 'Resolution',
        render: (issue) =>
          issue.ai_resolution_quality ? (
            <StatusBadge kind="aiQuality" value={issue.ai_resolution_quality} />
          ) : (
            <span className="text-xs text-ink-subtle">—</span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        hideBelow: 'md',
        render: (issue) => <StatusBadge kind="issueStatus" value={issue.status} />,
      },
      {
        key: 'created_at',
        header: 'Age',
        align: 'right',
        hideBelow: 'lg',
        render: (issue) => (
          <span className="tabular text-xs text-ink-muted">{elapsed(issue.created_at)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Insights"
        subtitle="Classifier quality and reporting trends across your jurisdiction"
        actions={
          <Toolbar>
            <FilterSelect
              value={days}
              onChange={setDays}
              options={PERIODS}
              placeholder="Period"
              label="Reporting period"
            />
          </Toolbar>
        }
      />

      <AsyncBoundary
        loading={insightsQuery.isPending}
        error={insightsQuery.error}
        onRetry={insightsQuery.refetch}
        skeleton={<SkeletonCards count={4} />}
      >
        {insights && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                label="Issues analysed"
                value={ai.analysed.toLocaleString()}
                hint={coverage !== null ? `${coverage}% of ${ai.total_issues.toLocaleString()}` : undefined}
              />
              <StatCard
                label="Low confidence"
                value={ai.low_confidence.toLocaleString()}
                tone={ai.low_confidence > 0 ? 'warning' : 'default'}
                hint={`below ${Math.round(ai.low_confidence_threshold * 100)}%`}
              />
              <StatCard
                label="Poor resolution"
                value={ai.poor_resolutions.toLocaleString()}
                tone={ai.poor_resolutions > 0 ? 'danger' : 'default'}
                hint="flagged on the after-photo"
              />
              <StatCard
                label="Mean confidence"
                value={ai.avg_confidence == null ? '—' : `${Math.round(ai.avg_confidence * 100)}%`}
                hint="across analysed issues only"
              />
            </div>

            {/* Best-effort. Absent when no provider is configured, or when the
                provider is down — the numbers above stand on their own. */}
            {insights.narrative && (
              <Card title="Summary" subtitle={
                insights.narrative_generated_at
                  ? `Written ${elapsed(insights.narrative_generated_at)} ago from the figures above`
                  : undefined
              }>
                <p className="text-sm leading-relaxed text-ink">{insights.narrative}</p>
              </Card>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              <Card title="Category movement" subtitle={`This ${days}-day period against the one before`}>
                {insights.movement.length === 0 ? (
                  <EmptyState size="sm" title="No reports in either period" />
                ) : (
                  <ul className="divide-y divide-divider">
                    {insights.movement.slice(0, 6).map((m) => (
                      <li key={m.issue_type} className="flex items-center justify-between gap-3 py-2">
                        <span className="flex items-center gap-2">
                          <span className="text-sm capitalize text-ink">
                            {m.issue_type.replace(/_/g, ' ')}
                          </span>
                          {m.notable && <Badge tone="warning">Notable</Badge>}
                        </span>
                        <span className="flex items-baseline gap-2">
                          <span className="tabular text-sm text-ink">{m.current}</span>
                          <span
                            className={`tabular text-xs ${
                              m.delta > 0 ? 'text-danger' : m.delta < 0 ? 'text-success' : 'text-ink-subtle'
                            }`}
                          >
                            {/* A brand-new category has no baseline, so it
                                reports a delta and no percentage rather than
                                "infinite growth". */}
                            {m.change_pct == null
                              ? `+${m.delta} new`
                              : `${m.change_pct > 0 ? '+' : ''}${m.change_pct}%`}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Ward anomalies" subtitle="Wards whose volume moved sharply">
                {insights.anomalies.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon="checkCircle"
                    title="Nothing unusual"
                    description="No ward moved enough, off a large enough base, to be worth flagging."
                  />
                ) : (
                  <ul className="divide-y divide-divider">
                    {insights.anomalies.map((a) => (
                      <li key={a.ward} className="flex items-center justify-between gap-3 py-2">
                        <span className="truncate text-sm text-ink">{a.ward}</span>
                        <span className="flex items-baseline gap-2">
                          <span className="tabular text-xs text-ink-muted">
                            {a.previous} → {a.current}
                          </span>
                          <Badge tone={a.direction === 'up' ? 'danger' : 'success'}>
                            {a.change_pct > 0 ? '+' : ''}
                            {a.change_pct}%
                          </Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )}
      </AsyncBoundary>

      <div className="space-y-3">
        <Tabs tabs={TABS} value={tab} onChange={setTab} label="Issues needing a look" />

        <Card flush>
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={(issue) => issue.id}
            caption="Issues flagged by the classifier"
            density="sm"
            loading={issuesQuery.isPending}
            error={issuesQuery.error}
            onRetry={issuesQuery.refetch}
            skeletonRows={8}
            sortMode="none"
            // Server-paginated now. The old screen sliced a client-side array
            // that had itself been truncated at 2,000 rows.
            pagination={paged.paginationProps(total)}
            empty={
              <EmptyState
                size="sm"
                icon="checkCircle"
                title={
                  tab === 'low_confidence'
                    ? 'Nothing below the confidence threshold'
                    : 'No resolutions flagged as poor'
                }
                description="Issues the classifier is unsure about would appear here for a human look."
              />
            }
          />
        </Card>
      </div>

      {insights?.generated_at && (
        <p className="text-xs text-ink-subtle">
          Figures computed {formatDateTime(insights.generated_at, 'en-IN')} across the whole
          dataset in your jurisdiction.
        </p>
      )}
    </div>
  );
}
