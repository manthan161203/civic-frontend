'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { adminApi } from '@/api/index';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import AsyncBoundary from '@/components/ui/AsyncBoundary';
import { StatCard } from '@/components/ui/Card';
import { SkeletonText } from '@/components/ui/Skeleton';
import { humanise } from '@/components/ui/statusTones';

/**
 * One worker's performance over a window.
 *
 * The old version's `catch { setReport(null) }` rendered "Failed to load report"
 * with no retry and no reason, and it looked identical to a worker who genuinely
 * had no data. Errors now carry their message and a retry.
 */

const WINDOWS = [7, 14, 30, 90];

/**
 * Daily resolutions as bars.
 *
 * Deliberately not a chart library: it is a single series of small integers,
 * and recharts is already the heaviest thing in this bundle.
 */
function DailyBars({ series }) {
  if (!series?.length) return null;

  const max = Math.max(...series.map((d) => d.count), 1);

  return (
    <div>
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
        Resolved per day
      </h3>
      <div className="flex h-20 items-end gap-px" role="img" aria-label={`Daily resolutions, peak ${max}`}>
        {series.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-t-[2px] bg-success"
            // A zero day keeps a hairline so the axis stays legible; a day with
            // work always looks taller than a day without.
            style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 6 : 1)}%` }}
            title={`${d.date}: ${d.count} resolved`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-subtle">
        <span className="tabular">{series[0]?.date}</span>
        <span className="tabular">{series.at(-1)?.date}</span>
      </div>
    </div>
  );
}

export default function WorkerReportModal({ worker, onClose }) {
  const [days, setDays] = useState(30);

  const reportQuery = useQuery({
    queryKey: qkReport(worker.id, days),
    queryFn: ({ signal }) => adminApi.getWorkerReport(worker.id, days, { signal }).then((r) => r.data),
  });

  const report = reportQuery.data;

  return (
    <Modal
      open
      onClose={onClose}
      title={worker.name}
      description={[worker.department, worker.phone].filter(Boolean).join(' · ') || undefined}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div
          className="flex items-center gap-0.5 rounded-control border border-border p-0.5"
          role="group"
          aria-label="Reporting window"
        >
          {WINDOWS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={`tabular flex-1 rounded-control px-2 py-1 text-xs font-medium transition-colors ${
                days === d
                  ? 'bg-primary text-white'
                  : 'text-ink-muted hover:bg-surface-alt hover:text-ink'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>

        <AsyncBoundary
          loading={reportQuery.isPending}
          error={reportQuery.error}
          onRetry={reportQuery.refetch}
          skeleton={<SkeletonText lines={8} />}
        >
          {report && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Assigned" value={report.total_assigned ?? 0} />
                <StatCard label="Resolved" value={report.resolved ?? 0} tone="success" />
                <StatCard label="In progress" value={report.in_progress ?? 0} />
                <StatCard
                  label="Rejected"
                  value={report.rejected_count ?? 0}
                  tone={report.rejected_count > 0 ? 'danger' : 'default'}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Resolution rate"
                  value={`${report.resolution_rate ?? 0}%`}
                  tone={
                    report.resolution_rate >= 80
                      ? 'success'
                      : report.resolution_rate < 50
                        ? 'warning'
                        : 'default'
                  }
                />
                <StatCard
                  label="Avg time to fix"
                  value={
                    report.avg_resolution_hours != null
                      ? `${report.avg_resolution_hours.toFixed(1)}h`
                      : '—'
                  }
                />
                <StatCard
                  label="Avg rating"
                  value={
                    report.avg_citizen_rating != null ? report.avg_citizen_rating.toFixed(1) : '—'
                  }
                  hint={
                    report.five_star_count
                      ? `${report.five_star_count} five-star`
                      : 'No ratings yet'
                  }
                />
              </div>

              {report.by_issue_type && Object.keys(report.by_issue_type).length > 0 && (
                <div>
                  <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                    What they worked on
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(report.by_issue_type)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <Badge key={type} tone="neutral">
                          {humanise(type)} · <span className="tabular">{count}</span>
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              <DailyBars series={report.daily_resolved} />
            </div>
          )}
        </AsyncBoundary>
      </div>
    </Modal>
  );
}

/** Local to this modal — not worth a slot in the shared registry. */
function qkReport(id, days) {
  return ['admin', 'workers', 'report', id, days];
}
