'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi, can } from '@/api/index';
import { qk } from '@/api/queryKeys';
import { getErrorMessage } from '@/api/errors';
import { creatableRoles } from '@/api/scopeFilter';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { formatDate } from '@/lib/dateUtils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePagedList } from '@/hooks/usePagedList';

import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Tabs, { TabPanel } from '@/components/ui/Tabs';
import Toolbar, { SearchInput, FilterSelect } from '@/components/ui/Toolbar';
import { StatusBadge } from '@/components/ui/Badge';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { resolveTone } from '@/components/ui/statusTones';

import AdminForm from './AdminForm';

/**
 * Sub-admin management.
 *
 * Second pilot screen, chosen because it covers what the issues screen does
 * not: the form layer, `Tabs`, and the app's only `window.prompt()`.
 *
 * Fixed here beyond the visual work:
 *
 *  - **The list silently truncated at fifty.** It requested
 *    `{page: 1, size: 50}` and rendered no pager at all, so an installation
 *    with more than fifty admins simply could not see the rest.
 *  - **No search**, only role pills — on a list that could not be paged.
 *  - **Delete used `window.prompt()`**, asking an operator to hand-type a value
 *    with no validation, for the most destructive action in the console.
 *  - **Three copies of the cascading-select logic**, each swallowing its fetch
 *    error into `console.error` and rendering an empty dropdown.
 */

const ROLE_FILTERS = ['admin', 'district_admin', 'taluka_admin', 'ward_admin'];

export default function AdminsPage() {
  const { user: me } = useAuthStore();
  const addToast = useUiStore((s) => s.addToast);
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('list');
  const [filters, setFilters] = useState({ role: '', search: '' });
  const [editing, setEditing] = useState(null);

  const search = useDebouncedValue(filters.search, 350);

  const paged = usePagedList({
    initialPageSize: 20,
    resetOn: [filters.role, search],
  });

  const listParams = useMemo(
    () => ({
      ...paged.params,
      ...(filters.role && { role: filters.role }),
      ...(search && { search }),
    }),
    [paged.params, filters.role, search],
  );

  const adminsQuery = useQuery({
    queryKey: qk.admins.list(listParams),
    queryFn: ({ signal }) => adminApi.getAdmins(listParams, { signal }).then((r) => r.data),
  });

  const rows = adminsQuery.data?.items ?? [];
  const total = adminsQuery.data?.total ?? 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.admins.all });

  const remove = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => {
      addToast('Admin removed', 'success');
      invalidate();
    },
    onError: (e) => addToast(getErrorMessage(e, 'Could not remove this admin'), 'error'),
  });

  const canManage = can(me, 'manageAdmins');
  const canDelete = can(me, 'deleteUser');
  const hasFilters = Boolean(filters.role || filters.search);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (admin) => (
          <>
            <span className="block truncate font-medium text-ink">{admin.name || '—'}</span>
            <span className="tabular block truncate text-xs text-ink-subtle">
              {admin.phone || '—'}
            </span>
          </>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        render: (admin) => <StatusBadge kind="adminRole" value={admin.role} />,
      },
      {
        key: 'scope',
        header: 'Jurisdiction',
        hideBelow: 'md',
        render: (admin) => {
          // The most specific level they hold. Printing all three ids would be
          // three UUIDs; the level is what an operator actually needs.
          const level = admin.ward_id
            ? 'Ward'
            : admin.taluka_id
              ? 'Taluka'
              : admin.district_id
                ? 'District'
                : 'Statewide';
          return <span className="text-xs text-ink-muted">{level}</span>;
        },
      },
      {
        key: 'is_active',
        header: 'Status',
        hideBelow: 'md',
        render: (admin) => (
          <StatusBadge kind="presence" value={admin.is_active ? 'online' : 'offline'} />
        ),
      },
      {
        key: 'created_at',
        header: 'Added',
        hideBelow: 'lg',
        render: (admin) => (
          <span className="tabular text-xs text-ink-muted">
            {formatDate(admin.created_at, 'en-IN')}
          </span>
        ),
      },
      {
        key: '_actions',
        header: '',
        align: 'right',
        width: '11rem',
        render: (admin) => {
          const isSelf = admin.id === me?.id;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={!canManage || isSelf}
                title={isSelf ? 'You cannot edit your own record here' : undefined}
                onClick={() => setEditing(admin)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                tone="danger"
                disabled={!canDelete || isSelf}
                onClick={async () => {
                  // Replaces window.prompt(). Typing the name is still required
                  // — this is irreversible — but it is validated, and Cancel is
                  // what holds focus.
                  const ok = await confirm({
                    title: `Remove ${admin.name}?`,
                    description: 'They lose access immediately. This cannot be undone.',
                    tone: 'danger',
                    confirmLabel: 'Remove admin',
                    requireTyping: admin.name,
                  });
                  if (ok) remove.mutate(admin.id);
                }}
              >
                Remove
              </Button>
            </div>
          );
        },
      },
    ],
    [me?.id, canManage, canDelete, confirm, remove],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Administrators"
        count={adminsQuery.isPending ? undefined : total}
        subtitle="Sub-admins you can manage within your jurisdiction"
        actions={
          <Tabs
            value={tab}
            onChange={setTab}
            label="Administrator views"
            tabs={[
              { id: 'list', label: 'All admins' },
              {
                id: 'create',
                label: 'Add admin',
                disabled: !canManage || creatableRoles(me).length === 0,
              },
            ]}
          />
        }
      />

      <TabPanel id="list" value={tab}>
        <div className="space-y-4">
          <Toolbar>
            <SearchInput
              value={filters.search}
              onChange={(v) => setFilters((f) => ({ ...f, search: v }))}
              placeholder="Search by name or phone…"
            />
            <FilterSelect
              value={filters.role}
              onChange={(v) => setFilters((f) => ({ ...f, role: v }))}
              options={ROLE_FILTERS.map((r) => ({
                value: r,
                label: resolveTone('adminRole', r).label,
              }))}
              placeholder="All roles"
              label="Filter by role"
            />
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ role: '', search: '' })}
              >
                Reset
              </Button>
            )}
          </Toolbar>

          <Card flush>
            <DataTable
              rows={rows}
              columns={columns}
              getRowId={(admin) => admin.id}
              caption="Administrators in your jurisdiction"
              density="sm"
              loading={adminsQuery.isPending}
              error={adminsQuery.error}
              onRetry={adminsQuery.refetch}
              skeletonRows={Math.min(paged.pageSize, 8)}
              // `/admin/admins` accepts no sort parameter.
              sortMode="none"
              // The pager this screen never rendered — it asked for 50 rows and
              // stopped there.
              pagination={paged.paginationProps(total)}
              empty={
                <EmptyState
                  size="sm"
                  icon="users"
                  title={hasFilters ? 'No admins match these filters' : 'No sub-admins yet'}
                  description={
                    hasFilters
                      ? 'Try clearing the role filter or the search.'
                      : 'Add one to delegate part of your jurisdiction.'
                  }
                  action={
                    hasFilters ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setFilters({ role: '', search: '' })}
                      >
                        Clear filters
                      </Button>
                    ) : canManage ? (
                      <Button size="sm" onClick={() => setTab('create')}>
                        Add an admin
                      </Button>
                    ) : undefined
                  }
                />
              }
            />
          </Card>
        </div>
      </TabPanel>

      <TabPanel id="create" value={tab}>
        <Card title="New sub-admin" className="max-w-2xl">
          <AdminForm
            onDone={() => {
              invalidate();
              setTab('list');
            }}
          />
        </Card>
      </TabPanel>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name ?? 'admin'}`}
        size="lg"
      >
        {editing && (
          <AdminForm
            admin={editing}
            onCancel={() => setEditing(null)}
            onDone={() => {
              invalidate();
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
