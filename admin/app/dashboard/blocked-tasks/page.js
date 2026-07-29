'use client';

import { useMemo, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '@/api/index';
import { qk } from '@/api/queryKeys';
import { getErrorMessage } from '@/api/errors';
import { useUiStore } from '@/store/uiStore';
import { useApiForm } from '@/hooks/useApiForm';
import { usePagedList } from '@/hooks/usePagedList';

import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Toolbar, { FilterSelect } from '@/components/ui/Toolbar';
import Badge from '@/components/ui/Badge';
import { TextField, TextAreaField, ChoiceField, FormError } from '@/components/ui/form';

/**
 * Tasks a worker has flagged as blocked.
 *
 * **The reason this screen was on the list: page 6 did not exist.** The pager
 * rendered `Math.min(5, pages)` numbered buttons starting at 1, so with 400
 * blocked tasks at 50 per page the last three pages were unreachable — and
 * because the default sort is longest-blocked-first, the pages you could not
 * reach were the *newest* blocks. Next/Prev worked, so the bug looked like a
 * cosmetic gap in the numbers rather than lost records. `Pagination` slides its
 * window instead, and the last page is always one click away.
 *
 * ── Why there are no sort arrows on the headers ──────────────────────────────
 *
 * This is the one endpoint in the console that sorts server-side, but its `sort`
 * parameter is a three-value enum — `blocked_duration | blocked_at | status` —
 * with no direction. A clickable header implies ascending/descending, which the
 * API cannot do, so the control stays a select that says exactly what it offers.
 */

const SORTS = [
  { value: 'blocked_duration', label: 'Longest blocked first' },
  { value: 'blocked_at', label: 'Recently blocked' },
  { value: 'status', label: 'By status' },
];

/**
 * Hours blocked, coloured by how bad it has got.
 *
 * A block is someone standing next to a hole in the road waiting for a decision,
 * so the number is the point of the screen and grey text undersells it.
 */
function BlockedFor({ hours }) {
  if (hours === null || hours === undefined) return <span className="text-ink-subtle">—</span>;

  const tone = hours >= 72 ? 'danger' : hours >= 24 ? 'warning' : 'neutral';
  const label = hours < 1 ? '<1h' : hours < 48 ? `${hours.toFixed(0)}h` : `${(hours / 24).toFixed(1)}d`;

  return (
    <Badge tone={tone} dot>
      <span className="tabular">{label}</span>
    </Badge>
  );
}

/**
 * Unblock one task, or every selected task — one form, because the note the
 * admin writes and the validation on it are identical either way. `ids` is what
 * distinguishes them, and it is always an array so there is no null-vs-single
 * branch inside the submit handler.
 */
function UnblockModal({ open, task, ids, onClose, onDone }) {
  const addToast = useUiStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const bulk = !task;

  const form = useApiForm({
    defaultValues: { admin_notes: '' },
    onSubmit: (values) =>
      bulk
        ? adminApi.bulkUnblockTasks(ids, values.admin_notes.trim()).then((r) => r.data)
        : adminApi.unblockTask(task.id, values.admin_notes.trim()).then((r) => r.data),
    onSuccess: () => {
      addToast(bulk ? `${ids.length} tasks unblocked` : 'Task unblocked', 'success');
      queryClient.invalidateQueries({ queryKey: qk.issues.all });
      form.reset();
      onDone?.();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={bulk ? `Unblock ${ids.length} tasks` : 'Unblock task'}
      description={
        bulk
          ? 'The same note is recorded against every task, and each assigned worker is notified.'
          : task.issue_type
      }
      size="md"
      dismissible={!form.formState.isSubmitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="unblock-form"
            isLoading={form.formState.isSubmitting}
            loadingText="Unblocking…"
          >
            {bulk ? `Unblock ${ids.length}` : 'Unblock'}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id="unblock-form" onSubmit={form.submit} className="space-y-4" noValidate>
          <FormError message={form.serverError} />

          {!bulk && (
            <dl className="rounded-control bg-surface-alt px-3 py-2">
              {[
                ['Reason given', task.blocked_reason || 'None recorded'],
                ['Worker', task.assigned_worker_name || 'Unassigned'],
                [
                  'Blocked for',
                  task.blocked_duration_hours != null
                    ? `${task.blocked_duration_hours.toFixed(1)} hours`
                    : 'Unknown',
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-1">
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="min-w-0 truncate text-right text-sm text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <TextAreaField
            name="admin_notes"
            label="Why is this unblocked?"
            rows={3}
            hint="The worker sees this. “Permits approved” beats “ok”."
            rules={{ required: 'Say what changed — the worker sees this note' }}
          />
        </form>
      </FormProvider>
    </Modal>
  );
}

function RespondModal({ task, open, onClose }) {
  const addToast = useUiStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const form = useApiForm({
    defaultValues: { message: '', resources_provided: '', can_proceed: 'no' },
    onSubmit: (values) =>
      adminApi
        .respondToBlock(
          task.id,
          values.message.trim(),
          values.resources_provided.trim(),
          // ChoiceField is a radio group, so this is the string 'yes' or 'no'.
          values.can_proceed === 'yes',
        )
        .then((r) => r.data),
    onSuccess: () => {
      addToast('Response sent to the worker', 'success');
      queryClient.invalidateQueries({ queryKey: qk.issues.all });
      form.reset();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Respond to block"
      description={task?.issue_type}
      size="md"
      dismissible={!form.formState.isSubmitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="respond-form"
            isLoading={form.formState.isSubmitting}
            loadingText="Sending…"
          >
            Send response
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id="respond-form" onSubmit={form.submit} className="space-y-4" noValidate>
          <FormError message={form.serverError} />

          {task?.blocked_reason && (
            <blockquote className="rounded-control border-l-2 border-warning bg-surface-alt px-3 py-2 text-sm text-ink">
              <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-ink-muted">
                {task.assigned_worker_name || 'The worker'} said
              </span>
              {task.blocked_reason}
            </blockquote>
          )}

          <TextAreaField
            name="message"
            label="Message to the worker"
            rows={3}
            rules={{ required: 'Write something for the worker to act on' }}
          />

          <TextField
            name="resources_provided"
            label="Resources provided"
            hint="Optional — e.g. “excavator, pump, fuel”."
          />

          <ChoiceField
            name="can_proceed"
            label="Can they start again?"
            hint="Choosing yes clears the block as well as sending the message."
            options={[
              { value: 'no', label: 'Not yet — still blocked' },
              { value: 'yes', label: 'Yes — they can proceed' },
            ]}
          />
        </form>
      </FormProvider>
    </Modal>
  );
}

export default function BlockedTasksPage() {
  const [sort, setSort] = useState('blocked_duration');
  const [selectedIds, setSelectedIds] = useState([]);
  const [unblockTask, setUnblockTask] = useState(null);
  const [respondTask, setRespondTask] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const paged = usePagedList({
    // This endpoint is the console's one `limit`/`offset` exception.
    mode: 'offset',
    initialPageSize: 50,
    resetOn: [sort],
    onReset: () => setSelectedIds([]),
  });

  const params = useMemo(() => ({ ...paged.params, sort }), [paged.params, sort]);

  const tasksQuery = useQuery({
    queryKey: qk.issues.blocked(params),
    queryFn: ({ signal }) => adminApi.getBlockedTasks(params, { signal }).then((r) => r.data),
  });

  const rows = tasksQuery.data?.items ?? [];
  const total = tasksQuery.data?.total ?? 0;

  const columns = useMemo(
    () => [
      {
        key: 'issue_type',
        header: 'Issue',
        render: (t) => (
          <>
            <a
              href={`/dashboard/issues?issue_id=${t.id}`}
              className="block truncate font-medium text-ink hover:text-primary hover:underline"
            >
              {t.issue_type || 'Untyped'}
            </a>
            <span className="tabular block text-xs text-ink-subtle">
              #{String(t.id ?? '').slice(0, 8)}
            </span>
          </>
        ),
      },
      {
        key: 'blocked_reason',
        header: 'Reason given',
        render: (t) =>
          t.blocked_reason ? (
            <span className="line-clamp-2 max-w-sm text-ink-muted" title={t.blocked_reason}>
              {t.blocked_reason}
            </span>
          ) : (
            // Worth flagging rather than dashing: a block with no reason is
            // one an admin cannot act on without chasing the worker.
            <span className="text-warning-strong">No reason given</span>
          ),
      },
      {
        key: 'blocked_duration_hours',
        header: 'Blocked for',
        width: '8rem',
        render: (t) => <BlockedFor hours={t.blocked_duration_hours} />,
      },
      {
        key: 'assigned_worker_name',
        header: 'Worker',
        hideBelow: 'md',
        render: (t) =>
          t.assigned_worker_name ? (
            <span className="text-ink-muted">{t.assigned_worker_name}</span>
          ) : (
            <span className="text-ink-subtle">Unassigned</span>
          ),
      },
      {
        key: '_actions',
        header: '',
        align: 'right',
        width: '12rem',
        render: (t) => (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setRespondTask(t)}>
              Respond
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setUnblockTask(t)}>
              Unblock
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Blocked tasks"
        count={tasksQuery.isPending ? undefined : total}
        subtitle="Work a field worker has stopped on, waiting for a decision or a resource"
      />

      <Toolbar>
        <FilterSelect
          value={sort}
          onChange={setSort}
          options={SORTS}
          // Not a filter — there is no "all" here, the list is always ordered
          // somehow — so the placeholder never applies.
          placeholder="Longest blocked first"
          label="Order"
        />
      </Toolbar>

      <Card flush>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(t) => t.id}
          caption="Blocked tasks"
          density="sm"
          loading={tasksQuery.isPending}
          error={tasksQuery.error}
          onRetry={tasksQuery.refetch}
          skeletonRows={8}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          rail={{ kind: 'issueStatus', value: (t) => t.status }}
          bulkActions={
            <div className="flex items-center gap-3">
              <span className="text-xs text-ink-muted">
                {selectedIds.length} selected on this page
              </span>
              <Button size="sm" onClick={() => setBulkOpen(true)}>
                Unblock selected
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                Clear
              </Button>
            </div>
          }
          pagination={paged.paginationProps(total)}
          empty={
            <EmptyState
              size="sm"
              icon="checkCircle"
              title="Nothing is blocked"
              description="Workers flag a task as blocked when they cannot continue. An empty list is the good outcome."
            />
          }
        />
      </Card>

      {/* Mounted only while open, so each modal starts from a clean form rather
          than whatever the last task left in it. */}
      {unblockTask && (
        <UnblockModal open task={unblockTask} onClose={() => setUnblockTask(null)} />
      )}

      {bulkOpen && (
        <UnblockModal
          open
          ids={selectedIds}
          onDone={() => setSelectedIds([])}
          onClose={() => setBulkOpen(false)}
        />
      )}

      {respondTask && <RespondModal open task={respondTask} onClose={() => setRespondTask(null)} />}
    </div>
  );
}
