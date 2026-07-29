'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi, locationsApi } from '@/api/index';
import { qk } from '@/api/queryKeys';
import { getErrorMessage } from '@/api/errors';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { elapsed, ageTone } from '@/lib/relativeTime';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePagedList } from '@/hooks/usePagedList';

import AdminScopeHeader from '@/components/AdminScopeHeader';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Toolbar, { SearchInput, FilterSelect } from '@/components/ui/Toolbar';
import { StatusBadge } from '@/components/ui/Badge';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import SvgIcon from '@/components/ui/SvgIcon';

import AssignModal from './AssignModal';
import IssueDetailModal from './IssueDetailModal';

/**
 * Issue triage.
 *
 * The console's busiest screen, rebuilt on the shared primitives.
 *
 * Fixed here beyond the visual work:
 *
 *  - **`catch {}` swallowed every load failure** (old `load()`), so a failed
 *    fetch rendered an empty table that read as "no issues". Errors now reach
 *    `DataTable`'s error state.
 *  - **The priority filter offered `critical`**, which is not in the backend
 *    enum (`urgent | high | medium | low`) — so selecting it always returned
 *    zero rows, and there was no way to filter for `urgent` at all.
 *  - **Search fired a request per keystroke.** Seven requests for "pothole",
 *    six obsolete on arrival, and whichever landed last won.
 *  - **Select-all had no indeterminate state**, so "3 of 20 selected" looked
 *    identical to "0 selected".
 *  - **`window.confirm` / `alert()`** for delete and auto-assign.
 *  - **Three chained effects with a `useRef(new Set())` cache** backfilled
 *    worker names — a hand-rolled query cache, now one `useQuery`.
 */

const STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'escalated', 'closed'];

// Matches the backend enum exactly. There is no `critical`.
const PRIORITIES = ['urgent', 'high', 'medium', 'low'];

const AGE_TONE_CLASS = {
  none: 'text-ink-muted',
  watch: 'text-warning-strong',
  late: 'font-semibold text-danger',
};

export default function IssuesPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const addToast = useUiStore((s) => s.addToast);
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignIssue, setAssignIssue] = useState(null);
  const [detailIssue, setDetailIssue] = useState(null);

  const search = useDebouncedValue(filters.search, 350);

  const paged = usePagedList({
    initialPageSize: 20,
    resetOn: [filters.status, filters.priority, search],
    onReset: () => {
      // Selection is page-scoped; keeping it across a filter change would let a
      // bulk action touch rows that are no longer on screen.
      setSelectedIds([]);
      setDetailIssue(null);
    },
  });

  const listParams = useMemo(
    () => ({
      ...paged.params,
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(search && { search }),
    }),
    [paged.params, filters.status, filters.priority, search],
  );

  const issuesQuery = useQuery({
    queryKey: qk.issues.list(listParams),
    queryFn: ({ signal }) => adminApi.getIssues(listParams, { signal }).then((r) => r.data),
  });

  const rows = issuesQuery.data?.items ?? [];
  const total = issuesQuery.data?.total ?? 0;

  /**
   * Worker id → name, for the assignment column.
   *
   * Replaces three chained effects plus a `useRef(new Set())` de-dupe cache
   * that fetched missing workers one at a time after every page change.
   */
  const { data: workerMap = {} } = useQuery({
    queryKey: qk.workers.nameMap(),
    queryFn: ({ signal }) =>
      adminApi.getWorkers({ size: 200 }, { signal }).then(({ data }) =>
        Object.fromEntries((data.items ?? data).map((w) => [w.id, w.name])),
      ),
    staleTime: 5 * 60_000,
  });

  const { data: locationTree = [] } = useQuery({
    queryKey: qk.locations.all,
    queryFn: () => locationsApi.getTree().then((r) => r.data),
    staleTime: 10 * 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.issues.all });

  /* ── Mutations ──────────────────────────────────────────────────────────── */

  const escalate = useMutation({
    mutationFn: (id) => adminApi.escalateIssue(id),
    onSuccess: () => {
      addToast('Issue escalated', 'success');
      invalidate();
    },
    onError: (e) => addToast(getErrorMessage(e, 'Could not escalate'), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id) => adminApi.deleteIssue(id),
    onSuccess: () => {
      addToast('Issue deleted', 'success');
      invalidate();
    },
    onError: (e) => addToast(getErrorMessage(e, 'Could not delete'), 'error'),
  });

  const bulk = useMutation({
    mutationFn: (action) => adminApi.bulkAction(selectedIds, action, {}),
    onSuccess: (_result, action) => {
      addToast(`${selectedIds.length} issue(s) ${action}d`, 'success');
      setSelectedIds([]);
      invalidate();
    },
    onError: (e) => addToast(getErrorMessage(e, 'Bulk action failed'), 'error'),
  });

  const autoAssign = useMutation({
    mutationFn: () => adminApi.autoAssignOpen(100).then((r) => r.data),
    onSuccess: (data) => {
      addToast(
        `Assigned ${data.assigned} of ${data.total_open} open issues (${data.skipped} skipped)`,
        'success',
      );
      invalidate();
    },
    onError: (e) => addToast(getErrorMessage(e, 'Auto-assign failed'), 'error'),
  });

  /* ── Deep link from the SLA dashboard ───────────────────────────────────── */

  useEffect(() => {
    const id = searchParams.get('issue_id');
    if (!id || rows.length === 0) return;
    const found = rows.find((i) => i.id === id);
    if (found) setDetailIssue(found);
  }, [searchParams, rows]);

  /* ── Columns ────────────────────────────────────────────────────────────── */

  const columns = useMemo(
    () => [
      {
        key: 'description',
        header: 'Issue',
        width: '24rem',
        render: (issue) => (
          <>
            <button
              type="button"
              onClick={() => setDetailIssue(issue)}
              className="block max-w-full truncate text-left font-medium text-ink hover:text-primary hover:underline"
            >
              {issue.description || 'Untitled'}
            </button>
            <span className="block truncate text-xs text-ink-subtle">
              {issue.address || '—'}
            </span>
          </>
        ),
      },
      {
        key: 'issue_type',
        header: 'Type',
        hideBelow: 'md',
        render: (issue) => (
          <span className="text-xs capitalize text-ink-muted">
            {issue.issue_type?.replace(/_/g, ' ') || '—'}
          </span>
        ),
      },
      {
        key: 'ward',
        header: 'Ward',
        hideBelow: 'lg',
        render: (issue) => <span className="text-xs text-ink-muted">{issue.ward || '—'}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (issue) => <StatusBadge kind="issueStatus" value={issue.status} />,
      },
      {
        key: 'priority',
        header: 'Priority',
        render: (issue) => <StatusBadge kind="priority" value={issue.priority} />,
      },
      {
        key: 'created_at',
        header: 'Age',
        align: 'right',
        // The column an operator is really scanning. A date answers "when";
        // triage asks "how long has this been sitting there".
        render: (issue) => (
          <span
            className={`tabular text-xs ${AGE_TONE_CLASS[ageTone(issue.created_at, issue.status)]}`}
            title={issue.created_at}
          >
            {elapsed(issue.created_at)}
          </span>
        ),
      },
      {
        key: 'assigned_worker_id',
        header: 'Assigned',
        render: (issue) =>
          issue.assigned_worker_id ? (
            <span className="truncate text-xs text-ink">
              {workerMap[issue.assigned_worker_id] ?? '…'}
            </span>
          ) : (
            <span className="text-xs text-ink-subtle">—</span>
          ),
      },
      {
        key: '_actions',
        header: '',
        align: 'right',
        width: '13rem',
        render: (issue) => (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => setAssignIssue(issue)}>
              {issue.assigned_worker_id ? 'Reassign' : 'Assign'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={issue.is_escalated}
              isLoading={escalate.isPending && escalate.variables === issue.id}
              onClick={() => escalate.mutate(issue.id)}
            >
              Escalate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              tone="danger"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Delete this issue?',
                  description: issue.description,
                  tone: 'danger',
                  confirmLabel: 'Delete',
                });
                if (ok) remove.mutate(issue.id);
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [workerMap, escalate, remove, confirm],
  );

  const hasFilters = Boolean(filters.status || filters.priority || filters.search);

  const handleExport = async () => {
    try {
      const res = await adminApi.exportIssues();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'issues.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      // Was `catch {}` — an export that silently did nothing.
      addToast(getErrorMessage(error, 'Export failed'), 'error');
    }
  };

  return (
    <div className="space-y-4">
      {user && <AdminScopeHeader user={user} locationTree={locationTree} />}

      <PageHeader
        title="Issues"
        count={issuesQuery.isPending ? undefined : total}
        subtitle="Triage, assign and escalate reports in your jurisdiction"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<SvgIcon name="download" size={14} />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              isLoading={autoAssign.isPending}
              loadingText="Assigning…"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Auto-assign open issues?',
                  description:
                    'Up to 100 unassigned open issues will be matched to the nearest available worker.',
                  confirmLabel: 'Auto-assign',
                });
                if (ok) autoAssign.mutate();
              }}
            >
              Auto-assign
            </Button>
          </>
        }
      />

      <Toolbar>
        <SearchInput
          value={filters.search}
          onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
          placeholder="Search issues…"
        />
        <FilterSelect
          value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
          placeholder="All statuses"
          label="Filter by status"
        />
        <FilterSelect
          value={filters.priority}
          onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
          options={PRIORITIES}
          placeholder="All priorities"
          label="Filter by priority"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ status: '', priority: '', search: '' })}
          >
            Reset
          </Button>
        )}

        <Toolbar.Spacer />

        <Toolbar.Selection count={selectedIds.length} onClear={() => setSelectedIds([])}>
          <Button
            size="sm"
            variant="secondary"
            isLoading={bulk.isPending && bulk.variables === 'close'}
            onClick={() => bulk.mutate('close')}
          >
            Close
          </Button>
          <Button
            size="sm"
            variant="secondary"
            isLoading={bulk.isPending && bulk.variables === 'escalate'}
            onClick={() => bulk.mutate('escalate')}
          >
            Escalate
          </Button>
        </Toolbar.Selection>
      </Toolbar>

      <Card flush>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(issue) => issue.id}
          caption="Civic issues in your jurisdiction"
          density="sm"
          loading={issuesQuery.isPending}
          error={issuesQuery.error}
          onRetry={issuesQuery.refetch}
          skeletonRows={Math.min(paged.pageSize, 10)}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={setDetailIssue}
          // Status as a rail on the row rather than relying on the badge alone —
          // the pattern that lets a screenful of issues be scanned as a shape.
          rail={{ kind: 'issueStatus', value: (issue) => issue.status }}
          /* `/admin/issues` accepts no `sort` parameter. Rendering sort arrows
             would reorder the 20 rows on this page while reading as a sort of
             all {total} — see the invariant in DataTable. */
          sortMode="none"
          pagination={paged.paginationProps(total)}
          empty={
            <EmptyState
              size="sm"
              icon="search"
              title={hasFilters ? 'No issues match these filters' : 'No issues yet'}
              description={
                hasFilters
                  ? 'Try widening the status or priority filter.'
                  : 'Reports submitted by citizens in your jurisdiction will appear here.'
              }
              action={
                hasFilters ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setFilters({ status: '', priority: '', search: '' })}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </Card>

      <AssignModal
        open={Boolean(assignIssue)}
        issue={assignIssue}
        onClose={() => setAssignIssue(null)}
        onAssigned={invalidate}
      />

      <IssueDetailModal
        open={Boolean(detailIssue)}
        issue={detailIssue}
        workerName={detailIssue ? workerMap[detailIssue.assigned_worker_id] : undefined}
        onClose={() => setDetailIssue(null)}
      />
    </div>
  );
}
