'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';

// SVG Icons
const IconBlockedAlert = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
const IconClock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconUnlock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const IconMessage = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const IconCheckCircle = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;

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
    return <div style={{padding: '40px', textAlign: 'center'}}>Loading blocked tasks...</div>;
  }

  const pages = Math.ceil(total / pageSize);
  const currentPage = Math.floor(offset / pageSize) + 1;

  return (
    <div style={{padding: '20px'}}>
      {/* Header */}
      <div style={{marginBottom: '30px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px'}}>
          <IconBlockedAlert />
          <h1 style={{margin: 0, fontSize: '28px', fontWeight: '700'}}>Blocked Tasks</h1>
          <span style={{backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '9999px', fontSize: '14px', fontWeight: '600'}}>
            {total} total
          </span>
        </div>
        <p style={{color: '#6b7280', margin: '8px 0 0 0', fontSize: '14px'}}>
          Manage tasks blocked by workers waiting for resources or resolution
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '20px'}}>
          {error}
        </div>
      )}

      {/* Controls */}
      <div style={{display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap'}}>
        <select
          value={sortBy}
          onChange={e => { setSortBy(e.target.value); setOffset(0); }}
          style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px'}}
        >
          <option value="blocked_duration">Sort: Longest Blocked First</option>
          <option value="blocked_at">Sort: Recently Blocked</option>
          <option value="status">Sort: By Status</option>
        </select>

        <select
          value={pageSize}
          onChange={e => { setPageSize(parseInt(e.target.value)); setOffset(0); }}
          style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px'}}
        >
          <option value={20}>Show: 20 per page</option>
          <option value={50}>Show: 50 per page</option>
          <option value={100}>Show: 100 per page</option>
        </select>

        {selectedTasks.size > 0 && (
          <button
            onClick={() => setBulkUnblockModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Unblock {selectedTasks.size}
          </button>
        )}
      </div>

      {/* Tasks Table */}
      <div style={{overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
          <thead>
            <tr style={{backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb'}}>
              <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>
                <input
                  type="checkbox"
                  checked={selectedTasks.size === blockedTasks.length && blockedTasks.length > 0}
                  onChange={toggleSelectAll}
                  style={{width: '18px', height: '18px', cursor: 'pointer'}}
                />
              </th>
              <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Issue</th>
              <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Blocked Reason</th>
              <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Duration</th>
              <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Worker</th>
              <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {blockedTasks.length === 0 ? (
              <tr>
                <td colSpan="6" style={{padding: '40px', textAlign: 'center', color: '#6b7280'}}>
                  No blocked tasks in your jurisdiction
                </td>
              </tr>
            ) : (
              blockedTasks.map(task => (
                <tr key={task.id} style={{borderBottom: '1px solid #e5e7eb', backgroundColor: selectedTasks.has(task.id) ? '#f0fdf4' : 'transparent'}}>
                  <td style={{padding: '12px'}}>
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={() => toggleTaskSelection(task.id)}
                      style={{width: '18px', height: '18px', cursor: 'pointer'}}
                    />
                  </td>
                  <td style={{padding: '12px'}}>
                    <div>
                      <div style={{fontWeight: '600', color: '#111827'}}>{task.issue_type}</div>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>{(task.id + '').substring(0, 8)}</div>
                    </div>
                  </td>
                  <td style={{padding: '12px'}}>
                    <div style={{fontSize: '13px', color: '#374151', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {task.blocked_reason || 'No reason provided'}
                    </div>
                  </td>
                  <td style={{padding: '12px', textAlign: 'center'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#ef4444'}}>
                      <IconClock />
                      {task.blocked_duration_hours ? `${task.blocked_duration_hours.toFixed(1)}h` : '-'}
                    </div>
                  </td>
                  <td style={{padding: '12px', textAlign: 'center'}}>
                    <div style={{fontSize: '13px', color: '#6b7280'}}>
                      {task.assigned_worker_name || 'Unassigned'}
                    </div>
                  </td>
                  <td style={{padding: '12px', textAlign: 'center'}}>
                    <div style={{display: 'flex', gap: '6px', justifyContent: 'center'}}>
                      <button
                        onClick={() => { setRespondModal(task); setRespondMessage(''); setRespondResources(''); setRespondCanProceed(false); }}
                        title="Respond to block"
                        style={{padding: '6px 10px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}
                      >
                        <IconMessage style={{width: 14, height: 14}} /> Respond
                      </button>
                      <button
                        onClick={() => { setUnblockModal(task); setUnblockNotes(''); }}
                        title="Unblock task"
                        style={{padding: '6px 10px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}
                      >
                        <IconUnlock style={{width: 14, height: 14}} /> Unblock
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
      <div style={{marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: '#6b7280'}}>
        <div>
          Showing {Math.min(offset + 1, total)} to {Math.min(offset + pageSize, total)} of {total}
        </div>
        <div style={{display: 'flex', gap: '8px'}}>
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
            style={{padding: '6px 12px', backgroundColor: offset === 0 ? '#e5e7eb' : '#fff', border: '1px solid #d1d5db', borderRadius: '4px', cursor: offset === 0 ? 'not-allowed' : 'pointer'}}
          >
            ← Prev
          </button>
          {Array.from({length: Math.min(5, pages)}, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setOffset((pageNum - 1) * pageSize)}
                style={{padding: '6px 10px', backgroundColor: currentPage === pageNum ? '#3b82f6' : '#fff', color: currentPage === pageNum ? '#fff' : '#111827', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontWeight: currentPage === pageNum ? '600' : '400'}}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            disabled={offset + pageSize >= total}
            onClick={() => setOffset(offset + pageSize)}
            style={{padding: '6px 12px', backgroundColor: offset + pageSize >= total ? '#e5e7eb' : '#fff', border: '1px solid #d1d5db', borderRadius: '4px', cursor: offset + pageSize >= total ? 'not-allowed' : 'pointer'}}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Unblock Modal */}
      {unblockModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{backgroundColor: '#fff', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
              <IconUnlock />
              <h2 style={{margin: 0, fontSize: '18px', fontWeight: '700'}}>Unblock Task</h2>
            </div>
            <div style={{backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px'}}>
              <div><strong>Issue:</strong> {unblockModal.issue_type}</div>
              <div><strong>Blocked Reason:</strong> {unblockModal.blocked_reason || 'N/A'}</div>
              <div><strong>Duration:</strong> {unblockModal.blocked_duration_hours?.toFixed(1)}h</div>
            </div>
            <label style={{display: 'block', marginBottom: '16px'}}>
              <div style={{fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#111827'}}>Reason for unblocking *</div>
              <textarea
                value={unblockNotes}
                onChange={e => setUnblockNotes(e.target.value)}
                placeholder="e.g., 'Permits approved', 'Equipment now available'"
                style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', fontFamily: 'inherit', minHeight: '80px', boxSizing: 'border-box'}}
              />
            </label>
            <div style={{display: 'flex', gap: '12px'}}>
              <button
                onClick={() => setUnblockModal(null)}
                style={{flex: 1, padding: '10px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'}}
              >
                Cancel
              </button>
              <button
                onClick={handleUnblock}
                disabled={submitting || !unblockNotes.trim()}
                style={{flex: 1, padding: '10px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: submitting || !unblockNotes.trim() ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: submitting || !unblockNotes.trim() ? 0.6 : 1}}
              >
                {submitting ? 'Unblocking...' : 'Unblock Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Respond Modal */}
      {respondModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{backgroundColor: '#fff', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
              <IconMessage />
              <h2 style={{margin: 0, fontSize: '18px', fontWeight: '700'}}>Respond to Block</h2>
            </div>
            <div style={{backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px'}}>
              <div><strong>Issue:</strong> {respondModal.issue_type}</div>
              <div><strong>Blocked Reason:</strong> {respondModal.blocked_reason || 'N/A'}</div>
              <div><strong>Worker:</strong> {respondModal.assigned_worker_name || 'Unassigned'}</div>
            </div>
            <label style={{display: 'block', marginBottom: '12px'}}>
              <div style={{fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#111827'}}>Message to Worker *</div>
              <textarea
                value={respondMessage}
                onChange={e => setRespondMessage(e.target.value)}
                placeholder="e.g., 'Equipment dispatched tomorrow morning', 'Waiting for permit approval'"
                style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', fontFamily: 'inherit', minHeight: '80px', boxSizing: 'border-box'}}
              />
            </label>
            <label style={{display: 'block', marginBottom: '12px'}}>
              <div style={{fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#111827'}}>Resources Provided (optional)</div>
              <input
                type="text"
                value={respondResources}
                onChange={e => setRespondResources(e.target.value)}
                placeholder="e.g., 'excavator, pump, fuel'"
                style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', boxSizing: 'border-box'}}
              />
            </label>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={respondCanProceed}
                onChange={e => setRespondCanProceed(e.target.checked)}
                style={{width: '18px', height: '18px', cursor: 'pointer'}}
              />
              <span style={{fontSize: '13px', color: '#374151'}}>✓ Worker can proceed now</span>
            </label>
            <div style={{display: 'flex', gap: '12px'}}>
              <button
                onClick={() => setRespondModal(null)}
                style={{flex: 1, padding: '10px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'}}
              >
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={submitting || !respondMessage.trim()}
                style={{flex: 1, padding: '10px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: submitting || !respondMessage.trim() ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: submitting || !respondMessage.trim() ? 0.6 : 1}}
              >
                {submitting ? 'Sending...' : 'Send Response'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Unblock Modal */}
      {bulkUnblockModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{backgroundColor: '#fff', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px'}}>
              <IconCheckCircle />
              <h2 style={{margin: 0, fontSize: '18px', fontWeight: '700'}}>Bulk Unblock Tasks</h2>
            </div>
            <div style={{backgroundColor: '#f0fdf4', border: '1px solid #86efac', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', color: '#166534'}}>
              Unblocking <strong>{selectedTasks.size}</strong> task(s)
            </div>
            <label style={{display: 'block', marginBottom: '16px'}}>
              <div style={{fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#111827'}}>Reason for bulk unblocking *</div>
              <textarea
                value={bulkNotes}
                onChange={e => setBulkNotes(e.target.value)}
                placeholder="e.g., 'Emergency: All equipment allocated', 'Policy change: Permits no longer needed'"
                style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', fontFamily: 'inherit', minHeight: '80px', boxSizing: 'border-box'}}
              />
            </label>
            <div style={{display: 'flex', gap: '12px'}}>
              <button
                onClick={() => {setBulkUnblockModal(false); setBulkNotes('');}}
                style={{flex: 1, padding: '10px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'}}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUnblock}
                disabled={submitting || !bulkNotes.trim()}
                style={{flex: 1, padding: '10px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: submitting || !bulkNotes.trim() ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: submitting || !bulkNotes.trim() ? 0.6 : 1}}
              >
                {submitting ? 'Unblocking...' : `Unblock ${selectedTasks.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
