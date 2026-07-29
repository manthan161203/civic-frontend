'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { adminApi } from '@/api/index';
import { formatDate } from '@/lib/dateUtils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePagedList } from '@/hooks/usePagedList';

import PageHeader from '@/components/ui/PageHeader';
import Card, { StatCard } from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Toolbar, { SearchInput, FilterSelect } from '@/components/ui/Toolbar';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import AsyncBoundary from '@/components/ui/AsyncBoundary';
import { SkeletonText } from '@/components/ui/Skeleton';
import SvgIcon from '@/components/ui/SvgIcon';
import { resolveTone } from '@/components/ui/statusTones';

/**
 * Satisfaction surveys.
 *
 * Two defects fixed here, one of them the reason this screen was on the list.
 *
 * **It rendered every row.** `GET /admin/surveys/stats` returns `all_surveys` —
 * genuinely all of them for the window, with no server-side paging available —
 * and the table mapped straight over the array. At 50 responses nobody notices;
 * at 5,000 the tab takes seconds to paint and scrolling is unusable. Paging is
 * now client-side, which is the honest match for an endpoint that hands over
 * the whole set in one payload. (The payload itself is still unbounded. That is
 * a backend change, noted below rather than papered over here.)
 *
 * **It dropped load failures on the floor** — `.catch(() => {})` — so a 500
 * rendered "Failed to load survey data" with no way to retry and no idea why.
 *
 * ── What was removed ─────────────────────────────────────────────────────────
 *
 * A 440-line issue-detail modal lived in this file, complete with its own
 * unblock and respond-to-block dialogs duplicated from `/dashboard/blocked-tasks`.
 * It found its issue by calling `getIssues({ search: issueId })` and scanning
 * the page for a matching id — a lookup that silently returned "Issue not
 * found" whenever the issue was not in the first page of search results.
 *
 * The issue link now goes to the issues console, which already deep-links on
 * `?issue_id=` and already has a working detail view. One issue modal, not two.
 */

const SPEED_OPTIONS = [
  { value: '3', label: 'Fast' },
  { value: '2', label: 'Average' },
  { value: '1', label: 'Slow' },
];

const RESOLVED_OPTIONS = [
  { value: 'yes', label: 'Fully resolved' },
  { value: 'no', label: 'Not resolved' },
];

const WINDOWS = [7, 30, 90];

/**
 * CSV of exactly what is on screen.
 *
 * Quoting matters more than it looks: `feedback` is free text a citizen typed,
 * so it routinely contains commas, quotes and newlines. The old version escaped
 * quotes but not the other two, which broke the row alignment of the export.
 */
function exportCsv(rows, days) {
  const cell = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = ['Issue ID', 'Speed', 'Fully resolved', 'Would report again', 'Feedback', 'Date'];
  const body = rows.map((s) => [
    s.issue_id ?? '',
    resolveTone('surveySpeed', s.speed_rating).label,
    s.fully_resolved ? 'Yes' : 'No',
    s.would_report_again ? 'Yes' : 'No',
    s.feedback ?? '',
    s.created_at ? new Date(s.created_at).toISOString() : '',
  ]);

  const csv = [header, ...body].map((row) => row.map(cell).join(',')).join('\r\n');
  // The BOM is what makes Excel read this as UTF-8 rather than mojibake —
  // feedback is often Gujarati or Hindi.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `surveys-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SurveysPage() {
  const [days, setDays] = useState(30);
  const [searchInput, setSearchInput] = useState('');
  const [speed, setSpeed] = useState('');
  const [resolved, setResolved] = useState('');

  const search = useDebouncedValue(searchInput, 300);

  const statsQuery = useQuery({
    queryKey: ['admin', 'surveys', 'stats', days],
    queryFn: ({ signal }) => adminApi.getSurveyStats(days, { signal }).then((r) => r.data),
  });

  const stats = statsQuery.data;
  const total = stats?.total_responses ?? 0;
  const allSurveys = useMemo(() => stats?.all_surveys ?? [], [stats]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allSurveys.filter((s) => {
      if (speed && String(s.speed_rating) !== speed) return false;
      if (resolved === 'yes' && !s.fully_resolved) return false;
      if (resolved === 'no' && s.fully_resolved) return false;
      if (needle) {
        const haystack = `${s.feedback ?? ''} ${s.issue_id ?? ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [allSurveys, speed, resolved, search]);

  // Filtering shrinks the set, so page 7 can stop existing. `resetOn` is what
  // stops the table showing an empty page that reads as "no matches".
  const paged = usePagedList({ initialPageSize: 25, resetOn: [days, speed, resolved, search] });

  const pct = (n) => (total > 0 ? Math.round(((n ?? 0) / total) * 100) : 0);

  const columns = useMemo(
    () => [
      {
        key: 'issue_id',
        header: 'Issue',
        width: '7rem',
        render: (s) => (
          <a
            href={`/dashboard/issues?issue_id=${s.issue_id}`}
            className="tabular font-medium text-primary hover:underline"
          >
            #{String(s.issue_id ?? '').slice(0, 8)}
          </a>
        ),
      },
      {
        key: 'speed_rating',
        header: 'Speed',
        sortable: true,
        width: '7rem',
        render: (s) => <StatusBadge kind="surveySpeed" value={String(s.speed_rating)} />,
      },
      {
        key: 'fully_resolved',
        header: 'Resolved',
        sortable: true,
        width: '7rem',
        render: (s) => <StatusBadge kind="yesNo" value={s.fully_resolved ? 'yes' : 'no'} />,
      },
      {
        key: 'would_report_again',
        header: 'Would report again',
        sortable: true,
        hideBelow: 'md',
        width: '11rem',
        render: (s) => <StatusBadge kind="yesNo" value={s.would_report_again ? 'yes' : 'no'} />,
      },
      {
        key: 'feedback',
        header: 'Feedback',
        render: (s) =>
          s.feedback ? (
            // `title` rather than a modal: the text is a sentence or two, and a
            // dialog for reading one sentence is a click nobody wants.
            <span className="line-clamp-2 max-w-md text-ink" title={s.feedback}>
              {s.feedback}
            </span>
          ) : (
            <span className="text-ink-subtle">No comment</span>
          ),
      },
      {
        key: 'created_at',
        header: 'Date',
        sortable: true,
        align: 'right',
        hideBelow: 'md',
        width: '8rem',
        render: (s) => (
          <span className="tabular text-xs text-ink-muted">
            {s.created_at ? formatDate(s.created_at, 'en-IN') : '—'}
          </span>
        ),
      },
    ],
    [],
  );

  const isFiltered = Boolean(search || speed || resolved);

  const clearFilters = () => {
    setSearchInput('');
    setSpeed('');
    setResolved('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Satisfaction surveys"
        count={statsQuery.isPending ? undefined : total}
        subtitle={`Responses from citizens whose issues were resolved in the last ${days} days`}
        actions={
          <>
            <div className="flex items-center gap-0.5 rounded-control border border-border p-0.5">
              {WINDOWS.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days === d}
                  onClick={() => setDays(d)}
                  className={`tabular rounded-control px-2.5 py-1 text-xs font-medium transition-colors ${
                    days === d
                      ? 'bg-primary text-white'
                      : 'text-ink-muted hover:bg-surface-alt hover:text-ink'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="secondary"
              disabled={filtered.length === 0}
              onClick={() => exportCsv(filtered, days)}
              leadingIcon={<SvgIcon name="download" size={13} />}
            >
              Export {isFiltered ? `${filtered.length} rows` : 'CSV'}
            </Button>
          </>
        }
      />

      <AsyncBoundary
        loading={statsQuery.isPending}
        error={statsQuery.error}
        onRetry={statsQuery.refetch}
        skeleton={<SkeletonText lines={6} />}
      >
        {/* `!stats` matters as much as the count: JSX children are built eagerly,
            so the branch below would dereference `stats` while the query is
            still pending even though AsyncBoundary would never render it. */}
        {!stats || total === 0 ? (
          <Card>
            <EmptyState
              icon="infoCircle"
              title="No responses in this window"
              description={
                days === 90
                  ? 'Surveys are sent when an issue is closed. None have been answered in the last 90 days.'
                  : 'Try a wider window — surveys are only sent once an issue is closed.'
              }
              action={
                days !== 90 ? (
                  <Button size="sm" variant="secondary" onClick={() => setDays(90)}>
                    Look back 90 days
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Responses" value={total.toLocaleString()} />
              <StatCard
                label="Fully resolved"
                value={`${pct(stats.fully_resolved_count)}%`}
                hint={`${stats.fully_resolved_count ?? 0} of ${total}`}
                tone={pct(stats.fully_resolved_count) < 60 ? 'warning' : 'success'}
              />
              <StatCard
                label="Avg speed"
                value={stats.avg_speed_rating != null ? stats.avg_speed_rating.toFixed(1) : '—'}
                hint={
                  stats.avg_speed_rating != null
                    ? resolveTone('surveySpeed', String(Math.round(stats.avg_speed_rating))).label
                    : 'No ratings yet'
                }
              />
              <StatCard
                label="Would report again"
                value={`${pct(stats.would_report_again_count)}%`}
                hint={`${stats.would_report_again_count ?? 0} said yes`}
                tone={pct(stats.would_report_again_count) < 60 ? 'danger' : 'success'}
              />
            </div>

            {stats.speed_breakdown && (
              <Card title="Speed rating" subtitle="How fast citizens felt the fix arrived">
                <div className="space-y-2">
                  {['3', '2', '1'].map((rating) => {
                    const count = stats.speed_breakdown[rating] ?? 0;
                    const share = pct(count);
                    const { tone, label } = resolveTone('surveySpeed', rating);
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <span className="w-16 shrink-0 text-xs text-ink-muted">{label}</span>
                        <div className="h-4 flex-1 overflow-hidden rounded-control bg-surface-alt">
                          <div
                            className={`h-full rounded-control ${
                              { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[
                                tone
                              ]
                            }`}
                            // Zero stays zero-width rather than showing a stub
                            // that reads as "a few".
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="tabular w-20 shrink-0 text-right text-xs text-ink-muted">
                          {count.toLocaleString()} · {share}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <Toolbar>
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search feedback or issue ID…"
              />
              <FilterSelect
                value={speed}
                onChange={setSpeed}
                options={SPEED_OPTIONS}
                placeholder="All speeds"
                label="Speed rating"
              />
              <FilterSelect
                value={resolved}
                onChange={setResolved}
                options={RESOLVED_OPTIONS}
                placeholder="All outcomes"
                label="Resolution outcome"
              />
              {isFiltered && (
                <>
                  <Badge tone="info">
                    {filtered.length.toLocaleString()} of {allSurveys.length.toLocaleString()}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                </>
              )}
            </Toolbar>

            <Card flush>
              <DataTable
                rows={filtered}
                columns={columns}
                getRowId={(s) => s.id}
                caption="Survey responses"
                density="sm"
                skeletonRows={8}
                // The endpoint returns the complete set, so the table owns both
                // the sort and the slice — see DataTable's note on `clientSide`.
                sortMode="client"
                pagination={{ ...paged.paginationProps(filtered.length), clientSide: true }}
                empty={
                  <EmptyState
                    size="sm"
                    icon="search"
                    title="No responses match these filters"
                    description="Try a different rating, outcome or search term."
                    action={
                      <Button size="sm" variant="secondary" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    }
                  />
                }
              />
            </Card>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}
