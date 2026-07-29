'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '@/api/index';
import { qk } from '@/api/queryKeys';
import { getErrorMessage } from '@/api/errors';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { formatDate } from '@/lib/dateUtils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePagedList } from '@/hooks/usePagedList';
import { useWardOptions } from '@/hooks/useWardOptions';

import AdminScopeHeader from '@/components/AdminScopeHeader';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import EmptyState from '@/components/ui/EmptyState';
import Toolbar, { SearchInput, FilterSelect } from '@/components/ui/Toolbar';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { useConfirm } from '@/components/ui/ConfirmDialog';

import WorkerFormModal from './WorkerFormModal';
import WorkerReportModal from './WorkerReportModal';
import WorkerMapTab from './WorkerMapTab';
import LeaderboardTab from './LeaderboardTab';

/**
 * Workers.
 *
 * ── The bug that mattered ────────────────────────────────────────────────────
 *
 * The tab labelled **"Invited Workers" listed deactivated workers.** It was
 * built on `is_active=false`, which is a different population entirely — and
 * because the "Resend invite" button only renders for `must_change_password &&
 * is_active`, that tab could never show the one action it existed for. Someone
 * whose invitation email bounced was invisible on the screen meant to find them,
 * and the only recovery was to delete and recreate the account.
 *
 * `GET /admin/workers` now takes `pending_invite`, which asks the real question:
 * still holding the temporary password, and still active. Deactivated accounts
 * are reachable through the status filter, where they belong.
 *
 * Also fixed here:
 *
 *  - **Search fired a request per keystroke.** No debounce, and `setSearch` also
 *    reset the page, so typing "patel" issued five paginated requests.
 *  - **`catch {}` twice inside one loader**, so a failed worker list and a
 *    failed location tree both rendered as an empty table.
 *  - **`GET /locations/tree` re-ran on every page change**, because it was
 *    nested inside the list loader. It is the whole hierarchy and it changes
 *    about never; it is a cached query now, shared with both forms.
 *  - **`load` omitted `showInactive` from its dependencies.** Harmless only
 *    because the two tabs were separate mounts — the kind of latent bug that
 *    surfaces the moment someone makes the tabs share a component.
 */

const STATUS_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Deactivated' },
];

const TABS = [
  { id: 'list', label: 'Workers' },
  { id: 'invited', label: 'Awaiting first sign-in' },
  { id: 'map', label: 'Live map' },
  { id: 'leaderboard', label: 'Leaderboard' },
];

/** Initials avatar. Cheap, and it makes a dense table scannable by shape. */
function WorkerAvatar({ name }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                 bg-primary-soft text-xs font-semibold text-primary-strong"
    >
      {name?.trim()?.[0]?.toUpperCase() || '?'}
    </span>
  );
}

/**
 * The worker table.
 *
 * @param {{ mode: 'list' | 'invited' }} props
 *   `invited` is not a filter on top of `list` — it asks the backend a different
 *   question and shows a different action set.
 */
function WorkerList({ mode }) {
  const { user } = useAuthStore();
  const addToast = useUiStore((s) => s.addToast);
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { wardNames, tree } = useWardOptions();

  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('active');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [formWorker, setFormWorker] = useState(null); // a worker, or 'new'
  const [reportWorker, setReportWorker] = useState(null);

  const invited = mode === 'invited';
  const search = useDebouncedValue(searchInput, 350);

  const paged = usePagedList({
    initialPageSize: 20,
    resetOn: [search, status, onlineOnly, mode],
  });

  const listParams = useMemo(
    () => ({
      ...paged.params,
      ...(search && { search }),
      ...(onlineOnly && { is_online: true }),
      ...(invited ? { pending_invite: true } : { is_active: status === 'active' }),
    }),
    [paged.params, search, onlineOnly, invited, status],
  );

  const workersQuery = useQuery({
    queryKey: qk.workers.list(listParams),
    queryFn: ({ signal }) => adminApi.getWorkers(listParams, { signal }).then((r) => r.data),
  });

  const rows = workersQuery.data?.items ?? workersQuery.data ?? [];
  const total = workersQuery.data?.total ?? rows.length;

  const setActive = useMutation({
    mutationFn: ({ id, isActive }) =>
      isActive ? adminApi.deactivateWorker(id) : adminApi.reactivateWorker(id),
    onSuccess: (_r, { isActive }) => {
      addToast(isActive ? 'Worker deactivated' : 'Worker reactivated', 'success');
      queryClient.invalidateQueries({ queryKey: qk.workers.all });
    },
    onError: (e) => addToast(getErrorMessage(e, 'Could not update this worker'), 'error'),
  });

  /*
   * Re-send a worker's invitation.
   *
   * `POST /admin/workers/{id}/resend-invitation` existed on the backend the
   * whole time with nothing calling it, so a bounced or expired invitation left
   * the account permanently unreachable.
   */
  const resend = useMutation({
    mutationFn: (id) => adminApi.resendWorkerInvitation(id).then((r) => r.data),
    onSuccess: (data, id) => {
      const worker = rows.find((w) => w.id === id);
      addToast(
        data?.email_sent === false
          ? 'Invitation recorded, but the email could not be delivered. Check the mail configuration.'
          : `Invitation re-sent to ${worker?.email || worker?.name || 'the worker'}.`,
        data?.email_sent === false ? 'warning' : 'success',
        6000,
      );
      queryClient.invalidateQueries({ queryKey: qk.workers.all });
    },
    onError: (e) => addToast(getErrorMessage(e, 'Could not re-send the invitation'), 'error'),
  });

  const columns = useMemo(() => {
    const base = [
      {
        key: 'name',
        header: 'Worker',
        render: (w) => (
          <span className="flex items-center gap-2.5">
            <WorkerAvatar name={w.name} />
            <span className="min-w-0">
              <button
                type="button"
                onClick={() => setReportWorker(w)}
                className="block max-w-full truncate text-left font-medium text-ink hover:text-primary hover:underline"
              >
                {w.name || 'Unnamed'}
              </button>
              <span className="tabular block truncate text-xs text-ink-subtle">{w.phone}</span>
            </span>
          </span>
        ),
      },
      {
        key: 'ward_id',
        header: 'Ward',
        hideBelow: 'md',
        render: (w) =>
          w.ward_id ? (
            <span className="text-xs text-ink-muted">{wardNames[w.ward_id] ?? 'Unknown ward'}</span>
          ) : (
            // Not cosmetic: auto-assignment matches on ward, so a blank here
            // means this worker is only ever reachable by manual assignment.
            <span className="text-xs text-warning-strong">Unassigned</span>
          ),
      },
      {
        key: 'department',
        header: 'Dept.',
        hideBelow: 'md',
        width: '8rem',
        render: (w) =>
          w.department ? (
            <span className="text-xs capitalize text-ink-muted">{w.department}</span>
          ) : (
            <span className="text-xs text-ink-subtle">—</span>
          ),
      },
    ];

    if (invited) {
      base.push(
        {
          key: 'email',
          header: 'Invitation sent to',
          render: (w) => (
            <span className="truncate text-xs text-ink-muted" title={w.email}>
              {w.email || <span className="text-warning-strong">No address on file</span>}
            </span>
          ),
        },
        {
          key: 'created_at',
          header: 'Invited',
          align: 'right',
          hideBelow: 'md',
          width: '7rem',
          render: (w) => (
            <span className="tabular text-xs text-ink-muted">{formatDate(w.created_at)}</span>
          ),
        },
        {
          key: '_actions',
          header: '',
          align: 'right',
          width: '10rem',
          render: (w) => (
            <Button
              size="sm"
              variant="secondary"
              isLoading={resend.isPending && resend.variables === w.id}
              loadingText="Sending…"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Re-send the invitation?',
                  description: `A new sign-in link goes to ${w.email || w.name}. Any earlier link stops working immediately.`,
                  confirmLabel: 'Re-send',
                });
                if (ok) resend.mutate(w.id);
              }}
            >
              Resend invite
            </Button>
          ),
        },
      );
      return base;
    }

    base.push(
      {
        key: 'is_online',
        header: 'Presence',
        width: '7rem',
        render: (w) => <StatusBadge kind="presence" value={w.is_online ? 'online' : 'offline'} />,
      },
      {
        key: 'is_active',
        header: 'Account',
        width: '9rem',
        render: (w) => (
          <span className="flex flex-wrap gap-1">
            <StatusBadge kind="presence" value={w.is_active ? 'online' : 'offline'} />
            {/* Surfaced on the main list too, so an outstanding invitation is
                visible without switching tabs. */}
            {w.must_change_password && w.is_active && <Badge tone="warning">Not signed in</Badge>}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'Joined',
        align: 'right',
        hideBelow: 'lg',
        width: '7rem',
        render: (w) => (
          <span className="tabular text-xs text-ink-muted">{formatDate(w.created_at)}</span>
        ),
      },
      {
        key: '_actions',
        header: '',
        align: 'right',
        width: '13rem',
        render: (w) => (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setFormWorker(w)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              tone={w.is_active ? 'danger' : undefined}
              isLoading={setActive.isPending && setActive.variables?.id === w.id}
              onClick={async () => {
                const ok = await confirm({
                  title: w.is_active
                    ? `Deactivate ${w.name || 'this worker'}?`
                    : `Reactivate ${w.name || 'this worker'}?`,
                  description: w.is_active
                    ? 'They stop receiving new assignments immediately. Tasks already assigned to them stay assigned — reassign those separately.'
                    : 'They can sign in and receive assignments again.',
                  tone: w.is_active ? 'danger' : 'primary',
                  confirmLabel: w.is_active ? 'Deactivate' : 'Reactivate',
                });
                if (ok) setActive.mutate({ id: w.id, isActive: w.is_active });
              }}
            >
              {w.is_active ? 'Deactivate' : 'Reactivate'}
            </Button>
          </div>
        ),
      },
    );

    return base;
  }, [confirm, invited, resend, setActive, wardNames]);

  const isFiltered = Boolean(search || onlineOnly || (!invited && status !== 'active'));

  return (
    <div className="space-y-4">
      {user && <AdminScopeHeader user={user} locationTree={tree} />}

      <Toolbar>
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by name or phone…"
        />

        {!invited && (
          <>
            <FilterSelect
              value={status}
              onChange={setStatus}
              options={STATUS_FILTERS}
              placeholder="Any status"
              label="Account status"
            />
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--color-primary)]"
              />
              Online only
            </label>
          </>
        )}

        <div className="flex-1" />

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput('');
              setStatus('active');
              setOnlineOnly(false);
            }}
          >
            Clear
          </Button>
        )}

        <Button size="sm" onClick={() => setFormWorker('new')}>
          Add worker
        </Button>
      </Toolbar>

      <Card flush>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(w) => w.id}
          caption={invited ? 'Workers awaiting first sign-in' : 'Workers'}
          density="sm"
          loading={workersQuery.isPending}
          error={workersQuery.error}
          onRetry={workersQuery.refetch}
          skeletonRows={Math.min(paged.pageSize, 8)}
          pagination={paged.paginationProps(total)}
          empty={
            invited ? (
              <EmptyState
                size="sm"
                icon="checkCircle"
                title="Everyone has signed in"
                description="Workers appear here between being invited and their first sign-in."
              />
            ) : (
              <EmptyState
                size="sm"
                icon="users"
                title={
                  isFiltered
                    ? 'No workers match these filters'
                    : status === 'inactive'
                      ? 'No deactivated workers'
                      : 'No workers yet'
                }
                description={
                  isFiltered
                    ? 'Try a different search, or clear the filters.'
                    : 'Add a worker and they will get an email invitation to sign in.'
                }
                action={
                  isFiltered ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSearchInput('');
                        setStatus('active');
                        setOnlineOnly(false);
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setFormWorker('new')}>
                      Add the first worker
                    </Button>
                  )
                }
              />
            )
          }
        />
      </Card>

      {/* Keyed on the worker so switching straight from one Edit to another
          rebuilds the form rather than keeping the first worker's values. */}
      {formWorker && (
        <WorkerFormModal
          key={formWorker === 'new' ? 'new' : formWorker.id}
          open
          worker={formWorker === 'new' ? null : formWorker}
          onClose={() => setFormWorker(null)}
        />
      )}

      {reportWorker && (
        <WorkerReportModal worker={reportWorker} onClose={() => setReportWorker(null)} />
      )}
    </div>
  );
}

export default function WorkersPage() {
  const [tab, setTab] = useState('list');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Workers"
        subtitle="Field staff in your jurisdiction — accounts, positions and performance"
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Worker views" />

      {tab === 'list' && <WorkerList mode="list" />}
      {tab === 'invited' && <WorkerList mode="invited" />}
      {tab === 'map' && <WorkerMapTab />}
      {tab === 'leaderboard' && <LeaderboardTab />}
    </div>
  );
}
