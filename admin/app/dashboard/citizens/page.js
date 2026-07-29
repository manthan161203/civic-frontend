'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi, locationsApi } from '@/api/index';
import { qk } from '@/api/queryKeys';
import { getErrorMessage } from '@/api/errors';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { formatDate } from '@/lib/dateUtils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePagedList } from '@/hooks/usePagedList';

import AdminScopeHeader from '@/components/AdminScopeHeader';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Toolbar, { SearchInput } from '@/components/ui/Toolbar';
import { StatusBadge } from '@/components/ui/Badge';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import AsyncBoundary from '@/components/ui/AsyncBoundary';
import { SkeletonText } from '@/components/ui/Skeleton';

/**
 * Citizen accounts.
 *
 * Same three fixes as the pilot — `catch {}` on the list load, per-keystroke
 * search, `window.confirm` — plus one specific to this screen: deactivation is
 * what stops someone reporting a problem in their own ward, so the dialog now
 * says what it does and what it leaves alone.
 */
export default function CitizensPage() {
  const { user } = useAuthStore();
  const addToast = useUiStore((s) => s.addToast);
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [detailId, setDetailId] = useState(null);

  const search = useDebouncedValue(searchInput, 350);
  const paged = usePagedList({ initialPageSize: 20, resetOn: [search] });

  const listParams = useMemo(
    () => ({ ...paged.params, ...(search && { search }) }),
    [paged.params, search],
  );

  const citizensQuery = useQuery({
    queryKey: qk.citizens.list(listParams),
    queryFn: ({ signal }) => adminApi.getCitizens(listParams, { signal }).then((r) => r.data),
  });

  const { data: locationTree = [] } = useQuery({
    queryKey: qk.locations.all,
    queryFn: () => locationsApi.getTree().then((r) => r.data),
    staleTime: 10 * 60_000,
  });

  // Fetched on demand rather than reusing the row: the list payload is a
  // summary and the detail endpoint carries more.
  const detailQuery = useQuery({
    queryKey: ['admin', 'citizens', 'detail', detailId],
    queryFn: () => adminApi.getCitizen(detailId).then((r) => r.data),
    enabled: Boolean(detailId),
  });

  const rows = citizensQuery.data?.items ?? [];
  const total = citizensQuery.data?.total ?? 0;

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) =>
      isActive ? adminApi.deactivateCitizen(id) : adminApi.reactivateCitizen(id),
    onSuccess: (_r, { isActive }) => {
      addToast(isActive ? 'Citizen deactivated' : 'Citizen reactivated', 'success');
      queryClient.invalidateQueries({ queryKey: qk.citizens.all });
    },
    onError: (e) => addToast(getErrorMessage(e, 'Could not update this account'), 'error'),
  });

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Citizen',
        render: (c) => (
          <>
            <button
              type="button"
              onClick={() => setDetailId(c.id)}
              className="block max-w-full truncate text-left font-medium text-ink hover:text-primary hover:underline"
            >
              {c.name || 'Unnamed'}
            </button>
            <span className="tabular block truncate text-xs text-ink-subtle">{c.phone || '—'}</span>
          </>
        ),
      },
      {
        key: 'ward',
        header: 'Ward',
        hideBelow: 'md',
        render: (c) => <span className="text-xs text-ink-muted">{c.ward || '—'}</span>,
      },
      {
        key: 'aadhar_verified',
        header: 'Verified',
        hideBelow: 'md',
        render: (c) =>
          c.aadhar_verified ? (
            <StatusBadge kind="presence" value="online" />
          ) : (
            <span className="text-xs text-ink-subtle">Not verified</span>
          ),
      },
      {
        key: 'is_active',
        header: 'Account',
        render: (c) => <StatusBadge kind="presence" value={c.is_active ? 'online' : 'offline'} />,
      },
      {
        key: 'created_at',
        header: 'Joined',
        hideBelow: 'lg',
        render: (c) => (
          <span className="tabular text-xs text-ink-muted">
            {formatDate(c.created_at, 'en-IN')}
          </span>
        ),
      },
      {
        key: '_actions',
        header: '',
        align: 'right',
        width: '9rem',
        render: (c) => (
          <Button
            size="sm"
            variant={c.is_active ? 'ghost' : 'outline'}
            tone={c.is_active ? 'danger' : undefined}
            isLoading={toggleActive.isPending && toggleActive.variables?.id === c.id}
            onClick={async () => {
              const ok = await confirm({
                title: c.is_active
                  ? `Deactivate ${c.name || 'this citizen'}?`
                  : `Reactivate ${c.name || 'this citizen'}?`,
                description: c.is_active
                  ? 'They will not be able to sign in or report new issues. Reports they have already filed are unaffected.'
                  : 'They will be able to sign in and report issues again.',
                tone: c.is_active ? 'danger' : 'primary',
                confirmLabel: c.is_active ? 'Deactivate' : 'Reactivate',
              });
              if (ok) toggleActive.mutate({ id: c.id, isActive: c.is_active });
            }}
          >
            {c.is_active ? 'Deactivate' : 'Reactivate'}
          </Button>
        ),
      },
    ],
    [confirm, toggleActive],
  );

  const detail = detailQuery.data;

  return (
    <div className="space-y-4">
      {user && <AdminScopeHeader user={user} locationTree={locationTree} />}

      <PageHeader
        title="Citizens"
        count={citizensQuery.isPending ? undefined : total}
        subtitle="Accounts registered in your jurisdiction"
      />

      <Toolbar>
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by name or phone…"
        />
        {searchInput && (
          <Button variant="ghost" size="sm" onClick={() => setSearchInput('')}>
            Reset
          </Button>
        )}
      </Toolbar>

      <Card flush>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(c) => c.id}
          caption="Citizen accounts"
          density="sm"
          loading={citizensQuery.isPending}
          error={citizensQuery.error}
          onRetry={citizensQuery.refetch}
          skeletonRows={Math.min(paged.pageSize, 8)}
          sortMode="none"
          pagination={paged.paginationProps(total)}
          empty={
            <EmptyState
              size="sm"
              icon="users"
              title={search ? 'No citizens match that search' : 'No citizens yet'}
              description={
                search
                  ? 'Try a different name or phone number.'
                  : 'Accounts appear here once people register in your jurisdiction.'
              }
              action={
                search ? (
                  <Button size="sm" variant="secondary" onClick={() => setSearchInput('')}>
                    Clear search
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </Card>

      <Modal
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={detail?.name || 'Citizen'}
        description={detail?.phone}
        size="md"
      >
        <AsyncBoundary
          loading={detailQuery.isPending}
          error={detailQuery.error}
          onRetry={detailQuery.refetch}
          skeleton={<SkeletonText lines={5} />}
        >
          {detail && (
            <dl>
              {[
                ['Ward', detail.ward || '—'],
                ['Email', detail.email || '—'],
                ['Aadhaar verified', detail.aadhar_verified ? 'Yes' : 'No'],
                ['Language', detail.language || '—'],
                ['Joined', formatDate(detail.created_at, 'en-IN')],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-divider py-2 last:border-0"
                >
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="truncate text-right text-sm text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </AsyncBoundary>
      </Modal>
    </div>
  );
}
