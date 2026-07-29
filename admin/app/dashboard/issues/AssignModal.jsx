'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { adminApi, locationsApi } from '@/api/index';
import { qk } from '@/api/queryKeys';
import { getErrorMessage } from '@/api/errors';
import { useUiStore } from '@/store/uiStore';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Toolbar';
import AsyncBoundary from '@/components/ui/AsyncBoundary';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';

/**
 * Pick a worker for an issue.
 *
 * Extracted from `page.js`, where it was one of two inline modals inside a
 * 634-line file. Behaviour preserved; three things fixed:
 *
 *  - `.catch(() => {})` on the workers fetch rendered an empty list that was
 *    indistinguishable from "no workers in your jurisdiction".
 *  - The dialog could be dismissed by a text-selection drag that ended outside
 *    the panel, losing the selection (see the note in Modal.jsx).
 *  - Nothing indicated *why* a worker might be a poor choice. Presence is now
 *    shown as a labelled dot rather than an unexplained coloured circle.
 */
export default function AssignModal({ open, issue, onClose, onAssigned }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const addToast = useUiStore((s) => s.addToast);

  const workersQuery = useQuery({
    queryKey: qk.workers.list({ size: 50, is_active: true }),
    queryFn: ({ signal }) =>
      adminApi.getWorkers({ size: 50, is_active: true }, { signal }).then((r) => r.data),
    enabled: open,
  });

  // The location tree is only needed to turn ward_id into a readable name. It
  // rarely changes, so it is cached far longer than the worker list.
  const treeQuery = useQuery({
    queryKey: qk.locations.all,
    queryFn: () => locationsApi.getTree().then((r) => r.data),
    staleTime: 10 * 60_000,
    enabled: open,
  });

  const wardNames = useMemo(() => {
    const names = {};
    for (const district of treeQuery.data ?? []) {
      for (const taluka of district.talukas ?? []) {
        for (const ward of taluka.wards ?? []) names[ward.id] = ward.name;
      }
    }
    return names;
  }, [treeQuery.data]);

  const workers = workersQuery.data?.items ?? workersQuery.data ?? [];

  const filtered = useMemo(() => {
    if (!search) return workers;
    const needle = search.toLowerCase();
    return workers.filter((w) => {
      const ward = w.ward_id ? wardNames[w.ward_id] ?? '' : '';
      return (
        w.name?.toLowerCase().includes(needle) ||
        w.ward?.toLowerCase().includes(needle) ||
        ward.toLowerCase().includes(needle)
      );
    });
  }, [workers, search, wardNames]);

  const assign = useMutation({
    mutationFn: (workerId) =>
      (issue.assigned_worker_id ? adminApi.reassignIssue : adminApi.assignIssue)(
        issue.id,
        workerId,
      ),
    onSuccess: () => {
      addToast(issue.assigned_worker_id ? 'Issue reassigned' : 'Issue assigned', 'success');
      onAssigned?.();
      close();
    },
    // The backend rejects an assignment for several concrete reasons — worker
    // offline, not accepting tasks, outside the admin's jurisdiction, at
    // capacity. Surfacing the server's own message beats a generic failure.
    onError: (error) => addToast(getErrorMessage(error, 'Could not assign worker'), 'error'),
  });

  function close() {
    setSearch('');
    setSelected(null);
    onClose();
  }

  if (!issue) return null;

  return (
    <Modal
      open={open}
      onClose={close}
      title={issue.assigned_worker_id ? 'Reassign worker' : 'Assign worker'}
      description={issue.description}
      size="md"
      // Closing mid-request would leave the user unsure whether it applied.
      dismissible={!assign.isPending}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selected}
            isLoading={assign.isPending}
            loadingText="Assigning…"
            onClick={() => assign.mutate(selected)}
          >
            {issue.assigned_worker_id ? 'Reassign' : 'Assign'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or ward…"
          width="w-full"
          label="Search workers"
        />

        <AsyncBoundary
          loading={workersQuery.isPending}
          error={workersQuery.error}
          onRetry={workersQuery.refetch}
          isEmpty={filtered.length === 0}
          skeleton={
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2">
                  <Skeleton width={28} height={28} rounded="full" />
                  <div className="flex-1">
                    <Skeleton width="45%" height={11} />
                    <Skeleton width="30%" height={9} className="mt-1.5" />
                  </div>
                </div>
              ))}
            </div>
          }
          empty={
            <EmptyState
              size="sm"
              icon="users"
              title={search ? 'No workers match that search' : 'No workers available'}
              description={
                search
                  ? 'Try a different name or ward.'
                  : 'Workers must be active and within your jurisdiction to appear here.'
              }
            />
          }
        >
          <ul className="max-h-64 divide-y divide-divider overflow-y-auto rounded-control border border-border">
            {filtered.map((worker) => {
              const isSelected = selected === worker.id;
              return (
                <li key={worker.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(worker.id)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      isSelected ? 'bg-primary-soft' : 'hover:bg-surface-alt'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                        text-xs font-semibold ${
                          worker.is_online
                            ? 'bg-success-soft text-success-strong'
                            : 'bg-neutral-soft text-ink-muted'
                        }`}
                    >
                      {worker.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{worker.name}</span>
                      <span className="block truncate text-xs text-ink-subtle">
                        {worker.ward_id ? wardNames[worker.ward_id] ?? 'Unknown ward' : 'No ward'}
                        {/* Spelled out rather than left as a coloured dot: a dot
                            requires a legend the dialog does not have. */}
                        {' · '}
                        {worker.is_online ? 'Online' : 'Offline'}
                      </span>
                    </span>

                    {isSelected && (
                      <span className="shrink-0 text-primary" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </AsyncBoundary>
      </div>
    </Modal>
  );
}
