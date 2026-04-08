'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';

export default function BlockedTasksPage() {
  const [blockedTasks, setBlockedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [pageSize, setPageSize] = useState(50);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('blocked_duration');
  
  // Modals
  const [unblockModal, setUnblockModal] = useState(null);
  const [respondModal, setRespondModal] = useState(null);
  const [bulkUnblockModal, setBulkUnblockModal] = useState(false);
  
  // Form states
  const [unblockNotes, setUnblockNotes] = useState('');
  const [respondMessage, setRespondMessage] = useState('');
  const [respondResources, setRespondResources] = useState('');
  const [respondCanProceed, setRespondCanProceed] = useState(false);
  const [bulkNotes, setBulkNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load blocked tasks
  const loadBlockedTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.getBlockedTasks({
        limit: pageSize,
        offset,
        sort: sortBy,
      });
      setBlockedTasks(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load blocked tasks'));
    } finally {
      setLoading(false);
    }
  }, [pageSize, offset, sortBy]);

  useEffect(() => {
    loadBlockedTasks();
  }, [loadBlockedTasks]);

  const handleUnblock = async () => {
    if (!unblockModal || !unblockNotes.trim()) {
      setError('Please provide a reason for unblocking');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.unblockTask(unblockModal.id, unblockNotes.trim());
      setUnblockModal(null);
      setUnblockNotes('');
      await loadBlockedTasks();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to unblock task'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async () => {
    if (!respondModal || !respondMessage.trim()) {
      setError('Please provide a message');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.respondToBlock(
        respondModal.id,
        respondMessage.trim(),
        respondResources.trim(),
        respondCanProceed
      );
      setRespondModal(null);
      setRespondMessage('');
      setRespondResources('');
      setRespondCanProceed(false);
      await loadBlockedTasks();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send response'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUnblock = async () => {
    if (selectedTasks.size === 0) {
      setError('Please select at least one task');
      return;
    }
    if (!bulkNotes.trim()) {
      setError('Please provide a reason for bulk unblocking');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.bulkUnblockTasks(Array.from(selectedTasks), bulkNotes.trim());
      setBulkUnblockModal(false);
      setBulkNotes('');
      setSelectedTasks(new Set());
      await loadBlockedTasks();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to bulk unblock tasks'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTaskSelection = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === blockedTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(blockedTasks.map(t => t.id)));
    }
  };

  if (loading && blockedTasks.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const pages = Math.ceil(total / pageSize);
  const currentPage = Math.floor(offset / pageSize) + 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Blocked Tasks</h1>
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{total} total</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Manage tasks blocked by workers waiting for resources or resolution</p>
        </div>
        {selectedTasks.size > 0 && (
          <button
            onClick={() => setBulkUnblockModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Unblock {selectedTasks.size} selected
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">{error}</div>
      )}

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={sortBy}
          onChange={e => { setSortBy(e.target.value); setOffset(0); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
        >
          <option value="blocked_duration">Longest blocked first</option>
          <option value="blocked_at">Recently blocked</option>
          <option value="status">By status</option>
        </select>

        <select
          value={pageSize}
          onChange={e => { setPageSize(parseInt(e.target.value)); setOffset(0); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
        >
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={selectedTasks.size === blockedTasks.length && blockedTasks.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 cursor-pointer accent-blue-600"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Issue</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Blocked Reason</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Worker</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {blockedTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-sm text-gray-400">
                  No blocked tasks in your jurisdiction
                </td>
              </tr>
            ) : (
              blockedTasks.map(task => (
                <tr key={task.id} className={`hover:bg-gray-50 transition-colors ${selectedTasks.has(task.id) ? 'bg-green-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={() => toggleTaskSelection(task.id)}
                      className="w-4 h-4 cursor-pointer accent-blue-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{task.issue_type}</div>
                    <div className="text-xs text-gray-400 font-mono">{(task.id + '').substring(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{task.blocked_reason || 'No reason provided'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {task.blocked_duration_hours ? `${task.blocked_duration_hours.toFixed(1)}h` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{task.assigned_worker_name || <span className="text-gray-400">Unassigned</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setRespondModal(task); setRespondMessage(''); setRespondResources(''); setRespondCanProceed(false); }}
                        className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Respond
                      </button>
                      <button
                        onClick={() => { setUnblockModal(task); setUnblockNotes(''); }}
                        className="px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        Unblock
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
      {total > pageSize && (
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>Showing {Math.min(offset + 1, total)}–{Math.min(offset + pageSize, total)} of {total}</span>
          <div className="flex gap-1">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setOffset((pageNum - 1) * pageSize)}
                  className={`px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              disabled={offset + pageSize >= total}
              onClick={() => setOffset(offset + pageSize)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Unblock Modal */}
      {unblockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setUnblockModal(null)}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Unblock Task</h2>
              <button onClick={() => setUnblockModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div><span className="text-xs font-semibold text-gray-500 uppercase">Issue</span><p className="text-gray-900 font-medium">{unblockModal.issue_type}</p></div>
                <div><span className="text-xs font-semibold text-gray-500 uppercase">Blocked Reason</span><p className="text-gray-700">{unblockModal.blocked_reason || 'N/A'}</p></div>
                <div><span className="text-xs font-semibold text-gray-500 uppercase">Duration</span><p className="text-red-600 font-semibold">{unblockModal.blocked_duration_hours?.toFixed(1)}h</p></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Reason for unblocking *</label>
                <textarea
                  value={unblockNotes}
                  onChange={e => setUnblockNotes(e.target.value)}
                  placeholder="e.g., 'Permits approved', 'Equipment now available'"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none h-20"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setUnblockModal(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button
                  onClick={handleUnblock}
                  disabled={submitting || !unblockNotes.trim()}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Unblocking…' : 'Unblock Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Respond Modal */}
      {respondModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setRespondModal(null)}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Respond to Block</h2>
              <button onClick={() => setRespondModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div><span className="text-xs font-semibold text-gray-500 uppercase">Issue</span><p className="text-gray-900 font-medium">{respondModal.issue_type}</p></div>
                <div><span className="text-xs font-semibold text-gray-500 uppercase">Worker</span><p className="text-gray-700">{respondModal.assigned_worker_name || 'Unassigned'}</p></div>
                <div><span className="text-xs font-semibold text-gray-500 uppercase">Blocked Reason</span><p className="text-gray-700">{respondModal.blocked_reason || 'N/A'}</p></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Message to Worker *</label>
                <textarea
                  value={respondMessage}
                  onChange={e => setRespondMessage(e.target.value)}
                  placeholder="e.g., 'Equipment dispatched tomorrow morning'"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none h-20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Resources Provided (optional)</label>
                <input
                  type="text"
                  value={respondResources}
                  onChange={e => setRespondResources(e.target.value)}
                  placeholder="e.g., 'excavator, pump, fuel'"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={respondCanProceed}
                  onChange={e => setRespondCanProceed(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Worker can proceed now</span>
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setRespondModal(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button
                  onClick={handleRespond}
                  disabled={submitting || !respondMessage.trim()}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Sending…' : 'Send Response'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Unblock Modal */}
      {bulkUnblockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => { setBulkUnblockModal(false); setBulkNotes(''); }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Bulk Unblock Tasks</h2>
              <button onClick={() => { setBulkUnblockModal(false); setBulkNotes(''); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-green-800">
                Unblocking <strong>{selectedTasks.size}</strong> task{selectedTasks.size !== 1 ? 's' : ''}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Reason *</label>
                <textarea
                  value={bulkNotes}
                  onChange={e => setBulkNotes(e.target.value)}
                  placeholder="e.g., 'Emergency: All equipment allocated'"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none h-20"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setBulkUnblockModal(false); setBulkNotes(''); }} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button
                  onClick={handleBulkUnblock}
                  disabled={submitting || !bulkNotes.trim()}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Unblocking…' : `Unblock ${selectedTasks.size}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
