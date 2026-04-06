'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { formatDate } from '../../../src/lib/dateUtils';
import { useUiStore } from '../../../src/store/uiStore';
import { getErrorMessage } from '../../../src/lib/apiError';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-600',
};

const REASON_LABELS = {
  rude_behavior: 'Rude Behavior',
  poor_work: 'Poor Work',
  delayed: 'Delayed',
  no_show: 'No Show',
  other: 'Other',
};

export default function ComplaintsPage() {
  const { addToast } = useUiStore();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveStatus, setResolveStatus] = useState('resolved');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminApi.getComplaints({ status: filter })
      .then(({ data }) => setComplaints(data.items || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const handleResolve = async () => {
    if (!resolveModal) return;
    setActionLoading(true);
    try {
      await adminApi.resolveComplaint(resolveModal.id, resolveStatus, adminNotes);
      setComplaints((prev) => prev.filter((c) => c.id !== resolveModal.id));
      setResolveModal(null);
      setAdminNotes('');
      addToast(`Complaint ${resolveStatus} successfully!`, 'success');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to resolve complaint');
      addToast(errorMsg, 'error');
    }
    setActionLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Worker Complaints</h1>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3 items-center">
        {['pending', 'resolved', 'dismissed'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg capitalize transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-50">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No {filter} complaints</div>
        ) : (
          complaints.map((c) => (
            <div key={c.id} className="p-4 flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[c.status || 'pending']}`}>
                    {c.status || 'pending'}
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 capitalize">
                    {REASON_LABELS[c.reason] || c.reason}
                  </span>
                </div>
                {c.description && (
                  <p className="text-sm text-gray-700 mb-1">{c.description}</p>
                )}
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  <span>Worker: {c.worker_name || c.worker_id?.slice(0, 8)}</span>
                  <span>By: {c.citizen_name || c.citizen_id?.slice(0, 8)}</span>
                  <span>{formatDate(c.created_at, 'en-IN')}</span>
                </div>
                {c.admin_notes && (
                  <p className="text-xs text-gray-500 italic mt-1">Admin: {c.admin_notes}</p>
                )}
              </div>
              {filter === 'pending' && (
                <button
                  onClick={() => setResolveModal(c)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 flex-shrink-0"
                >
                  Resolve
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setResolveModal(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-4">Resolve Complaint</h3>
            <div className="text-sm text-gray-600 mb-3 space-y-1">
              <p>Worker: <span className="font-medium text-gray-800">{resolveModal.worker_name || resolveModal.worker_id?.slice(0, 8)}</span></p>
              <p>Reason: <span className="font-medium text-gray-800 capitalize">{REASON_LABELS[resolveModal.reason] || resolveModal.reason}</span></p>
            </div>
            {resolveModal.description && (
              <p className="text-sm text-gray-700 mb-4 bg-gray-50 p-3 rounded-lg">{resolveModal.description}</p>
            )}

            <label className="block text-xs font-semibold text-gray-500 mb-2">Resolution</label>
            <div className="flex gap-2 mb-4">
              {['resolved', 'dismissed'].map((s) => (
                <button
                  key={s}
                  onClick={() => setResolveStatus(s)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg capitalize transition-colors ${resolveStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <label className="block text-xs font-semibold text-gray-500 mb-2">Admin Notes</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Notes about the resolution..."
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setResolveModal(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
