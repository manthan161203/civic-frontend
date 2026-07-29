'use client';

import { useMemo, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '@/api/index';
import { getErrorMessage } from '@/api/errors';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useApiForm } from '@/hooks/useApiForm';
import { usePagedList } from '@/hooks/usePagedList';
import { formatDateTime } from '@/lib/dateUtils';

import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Tabs from '@/components/ui/Tabs';
import EmptyState from '@/components/ui/EmptyState';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { TextField, SelectField, TextAreaField, FormError } from '@/components/ui/form';

/**
 * Cross-scope access overrides.
 *
 * **The reason this screen was on the list: neither tab could reach page 2.**
 * Both requests sent `page`, both endpoints return `total`, and the response's
 * `total` was thrown away — there were no pagination controls at all. A super
 * admin auditing override usage saw the twenty most recent grants and had no
 * indication anything else existed. On the audit tab, which is the record of who
 * used elevated access and why, that is the difference between an audit trail
 * and a sample of one.
 *
 * Both tabs now hold their own page state, so switching tabs does not drag the
 * audit log to whatever page the active list happened to be on.
 *
 * Also fixed: both loaders read `res.data?.messages || res.data?.items`, where
 * `messages` is a leftover from the admin-messages screen this was copied from.
 * It resolved to `items` by luck.
 */

const SCOPE_LEVELS = [
  { value: 'ward', label: 'Ward' },
  { value: 'taluka', label: 'Taluka' },
  { value: 'district', label: 'District' },
];

const TABS = [
  { id: 'active', label: 'Active grants' },
  { id: 'audit', label: 'Audit log' },
];

/** `ward:0f3c…` → a readable pair. */
function ScopeCell({ scope }) {
  const [level, id] = String(scope ?? '').split(':');
  if (!id) return <span className="text-ink-subtle">—</span>;
  return (
    <span className="flex items-center gap-1.5">
      <Badge tone="neutral">{level}</Badge>
      <code className="tabular text-xs text-ink-muted">{id.slice(0, 8)}</code>
    </span>
  );
}

function GrantOverrideModal({ open, onClose }) {
  const addToast = useUiStore((s) => s.addToast);
  const queryClient = useQueryClient();

  // Capped at 100 deliberately: this is a picker, not a list. If an install
  // ever has more than 100 admins this becomes a search field.
  const adminsQuery = useQuery({
    queryKey: ['admin', 'admins', 'picker'],
    queryFn: ({ signal }) =>
      adminApi.getAdmins({ page: 1, size: 100 }, { signal }).then((r) => r.data),
    enabled: open,
    staleTime: 60_000,
  });

  const admins = adminsQuery.data?.items ?? adminsQuery.data ?? [];

  const form = useApiForm({
    defaultValues: {
      target_admin_id: '',
      scope_level: 'ward',
      target_scope_id: '',
      reason: '',
      duration_minutes: '',
    },
    onSubmit: (values) =>
      adminApi
        .grantOverride({
          ...values,
          // An empty string is not "no limit" to the backend, it is a validation
          // error. Null is the documented way to say permanent.
          duration_minutes: values.duration_minutes ? Number(values.duration_minutes) : null,
        })
        .then((r) => r.data),
    onSuccess: () => {
      addToast('Override granted', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin', 'overrides'] });
      form.reset();
      onClose();
    },
  });

  const reason = form.watch('reason') ?? '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Grant override access"
      description="Gives one admin temporary access outside their own jurisdiction. Every use is recorded in the audit log."
      size="md"
      dismissible={!form.formState.isSubmitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="grant-override-form"
            isLoading={form.formState.isSubmitting}
            loadingText="Granting…"
          >
            Grant access
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form id="grant-override-form" onSubmit={form.submit} className="space-y-4" noValidate>
          <FormError message={form.serverError} />

          <SelectField
            name="target_admin_id"
            label="Admin"
            options={admins.map((a) => ({ value: a.id, label: `${a.name} · ${a.role}` }))}
            placeholder="Select an admin"
            // These describe the *options* request. Without them a failed admin
            // fetch rendered as an empty dropdown with no explanation.
            loading={adminsQuery.isPending}
            error={adminsQuery.error}
            rules={{ required: 'Choose which admin receives access' }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              name="scope_level"
              label="Scope level"
              options={SCOPE_LEVELS}
              rules={{ required: 'Choose a scope level' }}
            />
            <TextField
              name="target_scope_id"
              label="Scope ID"
              hint="The ward, taluka or district UUID."
              rules={{ required: 'Enter the ID of the area to open up' }}
            />
          </div>

          <TextAreaField
            name="reason"
            label="Reason"
            rows={3}
            hint={`${reason.length}/500 — this is what appears in the audit log.`}
            rules={{
              required: 'A reason is required',
              maxLength: { value: 500, message: 'Keep the reason under 500 characters' },
            }}
          />

          <TextField
            name="duration_minutes"
            label="Duration (minutes)"
            type="number"
            min="1"
            hint="Leave blank to grant permanent access."
            rules={{
              min: { value: 1, message: 'Use at least one minute, or leave it blank' },
            }}
          />
        </form>
      </FormProvider>
    </Modal>
  );
}

export default function AdminOverridesPage() {
  const { user } = useAuthStore();
  const addToast = useUiStore((s) => s.addToast);
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('active');
  const [showGrant, setShowGrant] = useState(false);

  const isSuperAdmin = user?.role === 'admin';

  // One per tab. Sharing a single `page` meant switching to the audit log
  // landed you on its page 4 because that is where the grants list was.
  const activePaged = usePagedList({ initialPageSize: 20 });
  const auditPaged = usePagedList({ initialPageSize: 50 });

  const activeQuery = useQuery({
    queryKey: ['admin', 'overrides', 'active', activePaged.page, activePaged.pageSize],
    queryFn: ({ signal }) =>
      adminApi
        .getActiveOverrides(activePaged.page, activePaged.pageSize, { signal })
        .then((r) => r.data),
    enabled: tab === 'active',
  });

  const auditQuery = useQuery({
    queryKey: ['admin', 'overrides', 'audit', auditPaged.page, auditPaged.pageSize],
    queryFn: ({ signal }) =>
      adminApi
        .getOverrideAuditLog(auditPaged.page, auditPaged.pageSize, { signal })
        .then((r) => r.data),
    enabled: tab === 'audit',
  });

  const revoke = useMutation({
    mutationFn: (id) => adminApi.revokeOverride(id),
    onSuccess: () => {
      addToast('Override revoked', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin', 'overrides'] });
    },
    onError: (e) => addToast(getErrorMessage(e, 'Could not revoke this override'), 'error'),
  });

  const activeColumns = useMemo(
    () => [
      {
        key: 'admin_name',
        header: 'Admin',
        render: (o) => <span className="font-medium text-ink">{o.admin_name || 'Unknown'}</span>,
      },
      { key: 'target_scope', header: 'Scope', render: (o) => <ScopeCell scope={o.target_scope} /> },
      {
        key: 'reason',
        header: 'Reason',
        render: (o) => (
          <span className="line-clamp-2 max-w-sm text-ink-muted" title={o.reason}>
            {o.reason || '—'}
          </span>
        ),
      },
      {
        key: 'override_until',
        header: 'Expires',
        hideBelow: 'md',
        width: '11rem',
        render: (o) =>
          o.override_until ? (
            <span className="tabular text-xs text-ink-muted">
              {formatDateTime(o.override_until)}
            </span>
          ) : (
            // Permanent cross-scope access is the state worth noticing on this
            // screen, so it is a badge rather than the word "Never" in grey.
            <Badge tone="warning">Permanent</Badge>
          ),
      },
      ...(isSuperAdmin
        ? [
            {
              key: '_actions',
              header: '',
              align: 'right',
              width: '7rem',
              render: (o) => (
                <Button
                  size="sm"
                  variant="ghost"
                  tone="danger"
                  isLoading={revoke.isPending && revoke.variables === o.id}
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Revoke ${o.admin_name || 'this admin'}’s override?`,
                      description:
                        'Access outside their own jurisdiction stops immediately. The audit log keeps the record of what they did while it was active.',
                      tone: 'danger',
                      confirmLabel: 'Revoke',
                    });
                    if (ok) revoke.mutate(o.id);
                  }}
                >
                  Revoke
                </Button>
              ),
            },
          ]
        : []),
    ],
    [confirm, isSuperAdmin, revoke],
  );

  const auditColumns = useMemo(
    () => [
      {
        key: 'admin_id',
        header: 'Admin',
        render: (e) => <code className="tabular text-xs text-ink">{e.admin_id?.slice(0, 8)}</code>,
      },
      {
        key: 'admin_role',
        header: 'Role',
        width: '9rem',
        render: (e) => <StatusBadge kind="adminRole" value={e.admin_role} />,
      },
      { key: 'target_scope', header: 'Scope', render: (e) => <ScopeCell scope={e.target_scope} /> },
      {
        key: 'accessed_resource_type',
        header: 'Resource',
        hideBelow: 'md',
        render: (e) => <span className="text-ink-muted">{e.accessed_resource_type || '—'}</span>,
      },
      {
        key: 'reason',
        header: 'Reason',
        hideBelow: 'lg',
        render: (e) => (
          <span className="line-clamp-2 max-w-xs text-ink-muted" title={e.reason}>
            {e.reason || '—'}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'When',
        align: 'right',
        width: '11rem',
        render: (e) => (
          <span className="tabular text-xs text-ink-muted">{formatDateTime(e.created_at)}</span>
        ),
      },
    ],
    [],
  );

  const activeTotal = activeQuery.data?.total ?? 0;
  const auditTotal = auditQuery.data?.total ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admin overrides"
        subtitle="Temporary access outside an admin’s own jurisdiction, and the record of how it was used"
        actions={
          isSuperAdmin && (
            <Button size="sm" onClick={() => setShowGrant(true)}>
              Grant override
            </Button>
          )
        }
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Override views" />

      {tab === 'active' ? (
        <Card flush>
          <DataTable
            rows={activeQuery.data?.items ?? []}
            columns={activeColumns}
            getRowId={(o) => o.id}
            caption="Active override grants"
            density="sm"
            loading={activeQuery.isPending}
            error={activeQuery.error}
            onRetry={activeQuery.refetch}
            skeletonRows={6}
            pagination={activePaged.paginationProps(activeTotal)}
            empty={
              <EmptyState
                size="sm"
                icon="checkCircle"
                title="No active overrides"
                description="Every admin is currently working inside their own jurisdiction. That is the normal state."
              />
            }
          />
        </Card>
      ) : (
        <Card flush>
          <DataTable
            rows={auditQuery.data?.items ?? []}
            columns={auditColumns}
            getRowId={(e) => e.id}
            caption="Override access audit log"
            density="sm"
            loading={auditQuery.isPending}
            error={auditQuery.error}
            onRetry={auditQuery.refetch}
            skeletonRows={10}
            pagination={auditPaged.paginationProps(auditTotal)}
            empty={
              <EmptyState
                size="sm"
                icon="infoCircle"
                title="Nothing recorded yet"
                description="Entries appear here the first time an admin reads a record outside their own jurisdiction using an override."
              />
            }
          />
        </Card>
      )}

      <GrantOverrideModal open={showGrant} onClose={() => setShowGrant(false)} />
    </div>
  );
}
