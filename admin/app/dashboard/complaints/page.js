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
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Tabs from '@/components/ui/Tabs';
import { StatusBadge } from '@/components/ui/Badge';
import Field, { CONTROL_CLASSES, borderClass } from '@/components/ui/Field';
import { humanise } from '@/components/ui/statusTones';

/**
 * Complaints citizens have raised about a worker's conduct.
 *
 * The resolve form previously had **no validation at all** — an empty decision
 * could be submitted, and the outcome was recorded against a worker's record
 * with no note explaining it.
 */
const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
];

export default function ComplaintsPage() {
  const addToast = useUiStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('pending');
  const [resolving, setResolving] = useState(null);
  const [outcome, setOutcome] = useState('resolved');
  const [notes, setNotes] = useState('');
  const [noteError, setNoteError] = useState('');

  const complaintsQuery = useQuery({
    queryKey: qk.moderation.complaints({ status }),
    queryFn: () => adminApi.getComplaints({ status }).then((r) => r.data),
  });

  const rows = complaintsQuery.data?.items ?? complaintsQuery.data ?? [];

  const resolve = useMutation({
    mutationFn: () => adminApi.resolveComplaint(resolving.id, outcome, notes.trim()),
    onSuccess: () => {
      addToast(`Complaint ${outcome}`, 'success');
      queryClient.invalidateQueries({ queryKey: qk.moderation.all });
      closeResolve();
    },
    onError: (e) => addToast(getErrorMessage(e, 'Could not record this decision'), 'error'),
  });

  function closeResolve() {
    setResolving(null);
    setNotes('');
    setNoteError('');
    setOutcome('resolved');
  }

  function submitResolve() {
    // A decision against a worker's record with no reasoning attached is not
    // reviewable later. Required, and said so before the request is sent.
    if (!notes.trim()) {
      setNoteError('Explain the decision — this is kept on the worker’s record.');
      return;
    }
    setNoteError('');
    resolve.mutate();
  }

  const columns = useMemo(
    () => [
      {
        key: 'worker_name',
        header: 'Worker',
        render: (c) => (
          <>
            <span className="block truncate font-medium text-ink">{c.worker_name || 'Unknown'}</span>
            <span className="block truncate text-xs text-ink-subtle">
              reported by {c.citizen_name || 'a citizen'}
            </span>
          </>
        ),
      },
      {
        key: 'reason',
        header: 'Reason',
        render: (c) => (
          <span className="text-xs text-ink-muted">{humanise(c.reason) || '—'}</span>
        ),
      },
      {
        key: 'description',
        header: 'Detail',
        width: '24rem',
        hideBelow: 'md',
        render: (c) => <span className="block truncate text-ink">{c.description || '—'}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (c) => <StatusBadge kind="complaintStatus" value={c.status} />,
      },
      {
        key: 'created_at',
        header: 'Age',
        align: 'right',
        hideBelow: 'lg',
        render: (c) => (
          <span className="tabular text-xs text-ink-muted" title={formatDate(c.created_at, 'en-IN')}>
            {elapsed(c.created_at)}
          </span>
        ),
      },
      {
        key: '_actions',
        header: '',
        align: 'right',
        width: '8rem',
        render: (c) =>
          c.status === 'pending' ? (
            <Button size="sm" variant="outline" onClick={() => setResolving(c)}>
              Review
            </Button>
          ) : (
            <span className="text-xs text-ink-subtle">Closed</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Worker complaints"
        count={complaintsQuery.isPending ? undefined : rows.length}
        subtitle="Conduct reports raised by citizens"
        actions={<Tabs tabs={TABS} value={status} onChange={setStatus} label="Complaint status" />}
      />

      <Card flush>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(c) => c.id}
          caption="Worker complaints"
          density="sm"
          loading={complaintsQuery.isPending}
          error={complaintsQuery.error}
          onRetry={complaintsQuery.refetch}
          skeletonRows={6}
          sortMode="none"
          empty={
            <EmptyState
              size="sm"
              icon="checkCircle"
              title={status === 'pending' ? 'No complaints to review' : `No ${status} complaints`}
              description={
                status === 'pending'
                  ? 'Conduct reports from citizens will appear here.'
                  : 'Decisions you have recorded appear here.'
              }
            />
          }
        />
      </Card>

      <Modal
        open={Boolean(resolving)}
        onClose={closeResolve}
        title={`Review complaint against ${resolving?.worker_name ?? 'worker'}`}
        description={resolving?.description}
        dismissible={!resolve.isPending}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeResolve}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={resolve.isPending}
              loadingText="Recording…"
              onClick={submitResolve}
            >
              Record decision
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Decision" htmlFor="outcome">
            {() => (
              <div className="flex gap-1.5">
                {[
                  { value: 'resolved', label: 'Upheld — action taken' },
                  { value: 'dismissed', label: 'Dismissed' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-control border px-3 py-1.5 text-xs font-medium ${
                      outcome === option.value
                        ? 'border-primary bg-primary-soft text-primary-strong'
                        : 'border-border text-ink-muted hover:bg-surface-alt'
                    }`}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value={option.value}
                      checked={outcome === option.value}
                      onChange={() => setOutcome(option.value)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            )}
          </Field>

          <Field
            label="Notes"
            htmlFor="admin_notes"
            error={noteError}
            required
            hint="Kept on the worker’s record and visible to other admins."
          >
            {({ describedBy, invalid }) => (
              <textarea
                id="admin_notes"
                rows={4}
                value={notes}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (noteError) setNoteError('');
                }}
                className={`w-full rounded-control border bg-surface px-2.5 py-2 text-sm
                  text-ink outline-none ${borderClass(invalid)}`}
                placeholder="What was found, and what was done about it."
              />
            )}
          </Field>
        </div>
      </Modal>
    </div>
  );
}
