'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '@/api/index';
import { qk } from '@/api/queryKeys';
import { getErrorMessage } from '@/api/errors';
import { useUiStore } from '@/store/uiStore';
import { formatDate } from '@/lib/dateUtils';
import { elapsed } from '@/lib/relativeTime';

import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Tabs from '@/components/ui/Tabs';
import { StatusBadge } from '@/components/ui/Badge';

/**
 * Moderation queue for flagged content.
 *
 * Previously a card list whose load error was logged to the console and
 * replaced with an empty array — so an outage looked exactly like a cleared
 * queue, which is the most misleading thing a moderation screen can do.
 */
const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'dismissed', label: 'Dismissed' },
];

export default function FlagsPage() {
  const addToast = useUiStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('pending');

  const flagsQuery = useQuery({
    queryKey: qk.moderation.flags({ status }),
    queryFn: () => adminApi.getFlags({ status }).then((r) => r.data),
  });

  const rows = flagsQuery.data?.items ?? flagsQuery.data ?? [];

  const resolve = useMutation({
    mutationFn: ({ id, nextStatus }) => adminApi.resolveFlag(id, nextStatus),
    onSuccess: (_r, { nextStatus }) => {
      addToast(`Flag marked as ${nextStatus}`, 'success');
      queryClient.invalidateQueries({ queryKey: qk.moderation.all });
    },
    onError: (e) => addToast(getErrorMessage(e, 'Could not update this flag'), 'error'),
  });

  const columns = useMemo(
    () => [
      {
        key: 'reason',
        header: 'Reason',
        render: (flag) => <StatusBadge kind="flagStatus" value={flag.reason} fallback="Other" />,
      },
      {
        key: 'details',
        header: 'Details',
        width: '28rem',
        render: (flag) => (
          <span className="block truncate text-ink">
            {flag.details || <span className="text-ink-subtle">No detail given</span>}
          </span>
        ),
      },
      {
        key: 'issue_id',
        header: 'Issue',
        hideBelow: 'md',
        render: (flag) => (
          <a
            href={`/dashboard/issues?issue_id=${flag.issue_id}`}
            className="font-mono text-xs text-primary hover:underline"
          >
            {String(flag.issue_id ?? '').slice(0, 8) || '—'}
          </a>
        ),
      },
      {
        key: 'created_at',
        header: 'Age',
        align: 'right',
        hideBelow: 'md',
        render: (flag) => (
          <span
            className="tabular text-xs text-ink-muted"
            title={formatDate(flag.created_at, 'en-IN')}
          >
            {elapsed(flag.created_at)}
          </span>
        ),
      },
      {
        key: '_actions',
        header: '',
        align: 'right',
        width: '13rem',
        render: (flag) =>
          status === 'pending' ? (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="outline"
                isLoading={resolve.isPending && resolve.variables?.id === flag.id}
                onClick={() => resolve.mutate({ id: flag.id, nextStatus: 'reviewed' })}
              >
                Uphold
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => resolve.mutate({ id: flag.id, nextStatus: 'dismissed' })}
              >
                Dismiss
              </Button>
            </div>
          ) : (
            <span className="text-xs text-ink-subtle">Closed</span>
          ),
      },
    ],
    [status, resolve],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Moderation"
        count={flagsQuery.isPending ? undefined : rows.length}
        subtitle="Content reported by citizens for review"
        actions={<Tabs tabs={TABS} value={status} onChange={setStatus} label="Flag status" />}
      />

      <Card flush>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(flag) => flag.id}
          caption="Flagged content"
          density="sm"
          loading={flagsQuery.isPending}
          error={flagsQuery.error}
          onRetry={flagsQuery.refetch}
          skeletonRows={6}
          sortMode="none"
          empty={
            <EmptyState
              size="sm"
              icon="checkCircle"
              title={status === 'pending' ? 'Nothing awaiting review' : `No ${status} flags`}
              description={
                status === 'pending'
                  ? 'Reports from citizens will appear here for a decision.'
                  : 'Flags you have acted on appear here.'
              }
            />
          }
        />
      </Card>
    </div>
  );
}
