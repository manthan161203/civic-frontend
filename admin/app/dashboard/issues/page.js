'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { adminApi, locationsApi } from '../../../src/api/index';
import { formatDate } from '../../../src/lib/dateUtils';

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  escalated: 'bg-purple-100 text-purple-700',
  closed: 'bg-gray-100 text-gray-600',
  assigned: 'bg-cyan-100 text-cyan-700',
};

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
  critical: 'bg-purple-100 text-purple-700',
};

// ── Assign Modal ───────────────────────────────────────────────────────────────
function AssignModal({ issue, onClose, onAssigned }) {
  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [wardNames, setWardNames] = useState({});

  useEffect(() => {
    // Fetch both location tree and workers in parallel, then display together
    Promise.all([
      locationsApi.getTree(),
      adminApi.getWorkers({ size: 50, is_active: true })
    ])
      .then(([locationRes, workersRes]) => {
        // Build ward name mapping from location data
        const names = {};
        const data = locationRes.data;
        if (data && data.length) {
          data.forEach((district) => {
            (district.talukas || []).forEach((taluka) => {
              (taluka.wards || []).forEach((ward) => {
                names[ward.id] = ward.name;
              });
            });
          });
        }
        setWardNames(names);
        setWorkers(workersRes.data.items || workersRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = workers.filter((w) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const wardName = w.ward_id ? wardNames[w.ward_id] || '' : '';
    return (
      w.name?.toLowerCase().includes(searchLower) ||
      w.ward?.toLowerCase().includes(searchLower) ||
      wardName.toLowerCase().includes(searchLower)
    );
  });

  const handleAssign = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const fn = issue.assigned_worker_id ? adminApi.reassignIssue : adminApi.assignIssue;
      await fn(issue.id, selected);
      onAssigned();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to assign worker');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-gray-900 mb-1">
          {issue.assigned_worker_id ? 'Reassign Worker' : 'Assign Worker'}
        </h2>
        <p className="text-xs text-gray-500 mb-4 truncate">Issue: {issue.description}</p>

        <input
          type="text"
          placeholder="Search workers by name or ward…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 mb-3"
        />

        <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 max-h-56 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading workers…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No workers found</div>
          ) : (
            filtered.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelected(w.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${selected === w.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${w.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
                  {w.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{w.name}</div>
                  <div className="text-xs text-gray-400">{w.ward_id ? wardNames[w.ward_id] || 'Unknown Ward' : 'No ward'}</div>
                </div>
                {selected === w.id && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} style={{width:16,height:16}} className="text-blue-600 flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>}
              </button>
            ))
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-semibold">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selected || saving}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Issue Detail Modal ─────────────────────────────────────────────────────────
function IssueDetailModal({ issue, workerMap, onClose }) {
  const [photoError, setPhotoError] = useState(false);
  
  let photo = issue.before_photos?.[0];
  
  // If photo is a relative path, prepend the base URL
  if (photo && !photo.startsWith('http')) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    photo = `${baseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 pr-4">{issue.description}</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {photo && !photoError ? (
            <img 
              src={photo} 
              alt="Issue" 
              className="w-full max-h-80 object-contain rounded-xl mb-4 bg-gray-50" 
              onError={() => setPhotoError(true)}
            />
          ) : photo && photoError ? (
            <div className="w-full h-40 bg-gray-100 rounded-xl mb-4 flex items-center justify-center text-gray-400 text-sm">
              Image failed to load
            </div>
          ) : null}

          {/* Location map */}
          {issue.latitude && issue.longitude && (
            <div className="mb-4 rounded-xl overflow-hidden border border-gray-100" style={{ height: 180 }}>
              <Map
                defaultCenter={{ lat: issue.latitude, lng: issue.longitude }}
                defaultZoom={15}
                mapId="civic-issue-detail"
                gestureHandling="cooperative"
                disableDefaultUI
                zoomControl
                style={{ width: '100%', height: '100%' }}
              >
                <AdvancedMarker position={{ lat: issue.latitude, lng: issue.longitude }} />
              </Map>
            </div>
          )}

          <div className="space-y-3 text-sm">
            {[
              ['Address', issue.address || '—'],
              ['Ward', issue.ward || '—'],
              ['Type', issue.issue_type?.replace(/_/g, ' ') || '—'],
              ['Priority', issue.priority || '—'],
              ['Status', issue.status?.replace(/_/g, ' ') || '—'],
              ['Assigned Worker', issue.assigned_worker_id ? (workerMap[issue.assigned_worker_id] || 'Assigned') : 'Unassigned'],
              ['Upvotes', issue.upvote_count ?? 0],
              ['Created', formatDate(issue.created_at, 'en-IN')],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-3 border-b border-gray-50">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900 text-right max-w-xs truncate capitalize">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-semibold flex-shrink-0">
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function IssuesPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [assignIssue, setAssignIssue] = useState(null);
  const [detailIssue, setDetailIssue] = useState(null);
  const [workerMap, setWorkerMap] = useState({});
  const fetchedWorkerIds = useRef(new Set());

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: PAGE_SIZE };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search) params.search = filters.search;
      const { data } = await adminApi.getIssues(params);
      setIssues(data.items || data);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  // Pre-populate worker id→name map on mount
  useEffect(() => {
    adminApi.getWorkers({ size: 200 })
      .then(({ data }) => {
        const workers = data.items || data;
        const map = {};
        workers.forEach((w) => { map[w.id] = w.name; });
        setWorkerMap(map);
      })
      .catch(() => {});
  }, []);

  // After issues load, fetch any assigned worker not already in the map
  useEffect(() => {
    const missing = issues
      .map((i) => i.assigned_worker_id)
      .filter((id) => id && !workerMap[id] && !fetchedWorkerIds.current.has(id));

    if (missing.length === 0) return;
    missing.forEach((id) => fetchedWorkerIds.current.add(id));

    Promise.all(missing.map((id) => adminApi.getWorker(id).catch(() => null)))
      .then((results) => {
        const additions = {};
        results.forEach((r) => { if (r?.data?.id) additions[r.data.id] = r.data.name; });
        if (Object.keys(additions).length > 0) {
          setWorkerMap((prev) => ({ ...prev, ...additions }));
        }
      });
  }, [issues]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id) => {
    if (!confirm('Delete this issue? This cannot be undone.')) return;
    await adminApi.deleteIssue(id).catch(() => {});
    load();
  };

  const handleEscalate = async (id) => {
    await adminApi.escalateIssue(id).catch(() => {});
    load();
  };

  const handleBulk = async (action) => {
    if (!selected.length) return;
    setActionLoading(true);
    await adminApi.bulkAction(selected, action, {}).catch(() => {});
    setSelected([]);
    await load();
    setActionLoading(false);
  };

  const handleExport = async () => {
    try {
      const res = await adminApi.exportIssues();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'issues.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const toggleSelect = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelected(selected.length === issues.length ? [] : issues.map((i) => i.id));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Modals */}
      {assignIssue && (
        <AssignModal
          issue={assignIssue}
          onClose={() => setAssignIssue(null)}
          onAssigned={load}
        />
      )}
      {detailIssue && (
        <IssueDetailModal
          issue={detailIssue}
          workerMap={workerMap}
          onClose={() => setDetailIssue(null)}
        />
      )}

      {/* Filters + Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search issues…"
          value={filters.search}
          onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-52 outline-none focus:border-blue-400"
        />
        <select
          value={filters.status}
          onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
        >
          <option value="">All Statuses</option>
          {['open', 'assigned', 'in_progress', 'resolved', 'escalated', 'closed'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => { setFilters((f) => ({ ...f, priority: e.target.value })); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
        >
          <option value="">All Priorities</option>
          {['low', 'medium', 'high', 'critical'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {(filters.status || filters.priority || filters.search) && (
          <button
            onClick={() => { setFilters({ status: '', priority: '', search: '' }); setPage(1); }}
            className="text-sm text-gray-400 hover:text-gray-700 underline"
          >
            Reset
          </button>
        )}
        <div className="flex-1" />
        {selected.length > 0 && (
          <>
            <span className="text-xs text-gray-500 font-medium">{selected.length} selected</span>
            <button
              onClick={() => handleBulk('close')}
              disabled={actionLoading}
              className="px-3 py-2 bg-gray-600 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Close Selected
            </button>
            <button
              onClick={() => handleBulk('escalate')}
              disabled={actionLoading}
              className="px-3 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Escalate Selected
            </button>
          </>
        )}
        <button
          onClick={handleExport}
          className="px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selected.length === issues.length && issues.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ward</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Worker</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="flex justify-center mb-2 text-gray-200">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{width:40,height:40}}>
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div className="text-gray-400 text-sm">No issues found</div>
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(issue.id)}
                        onChange={() => toggleSelect(issue.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <button
                        onClick={() => setDetailIssue(issue)}
                        className="truncate font-medium text-blue-600 hover:underline text-left block w-full"
                      >
                        {issue.description}
                      </button>
                      <div className="text-xs text-gray-400 truncate">{issue.address}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 capitalize">{issue.issue_type?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[issue.status] || 'bg-gray-100 text-gray-600'}`}>
                        {issue.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PRIORITY_COLORS[issue.priority] || 'bg-gray-100 text-gray-600'}`}>
                        {issue.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{issue.ward || '—'}</td>
                    <td className="px-4 py-3">
                      {issue.assigned_worker_id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
                            {workerMap[issue.assigned_worker_id]?.charAt(0)?.toUpperCase() || '…'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-800 truncate max-w-24">
                              {workerMap[issue.assigned_worker_id] || <span className="text-gray-300">—</span>}
                            </div>
                            <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-100">
                              assigned
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{width:14,height:14}} className="text-gray-300">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <span className="text-xs text-gray-400">Unassigned</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDate(issue.created_at, 'en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setAssignIssue(issue)}
                          className="w-full py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-md border border-blue-200 transition-colors text-center"
                        >
                          {issue.assigned_worker_id ? 'Reassign' : 'Assign'}
                        </button>
                        <button
                          onClick={() => handleEscalate(issue.id)}
                          className="w-full py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold rounded-md border border-purple-200 transition-colors text-center"
                        >
                          Escalate
                        </button>
                        <button
                          onClick={() => handleDelete(issue.id)}
                          className="w-full py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold rounded-md border border-red-200 transition-colors text-center"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              {total} total · Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-sm"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
