'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { formatDate } from '../../../src/lib/dateUtils';

const OUTCOME_COLORS = {
  upheld: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [resolveModal, setResolveModal] = useState(null);
  const [outcome, setOutcome] = useState('upheld');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminApi.getDisputes({ status: filter })
      .then(({ data }) => setDisputes(data.items || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const handleResolve = async () => {
    if (!resolveModal) return;
    setActionLoading(true);
    try {
      await adminApi.resolveDispute(resolveModal.id, outcome, adminNotes);
      setDisputes((prev) => prev.filter((d) => d.id !== resolveModal.id));
      setResolveModal(null);
      setAdminNotes('');
    } catch {}
    setActionLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Disputes</h1>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3 items-center">
        {['pending', 'upheld', 'dismissed'].map((s) => (
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
        ) : disputes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No {filter} disputes</div>
        ) : (
          disputes.map((d) => (
            <div key={d.id} className="p-4 flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${OUTCOME_COLORS[d.outcome || 'pending']}`}>
                    {d.outcome || 'pending'}
                  </span>
                  <span className="text-xs text-gray-400">
                    Issue #{d.issue_id?.slice(0, 8)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-1">{d.reason}</p>
                {d.admin_notes && (
                  <p className="text-xs text-gray-500 italic">Admin: {d.admin_notes}</p>
                )}
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  <span>By: {d.citizen_name || d.citizen_id?.slice(0, 8)}</span>
                  <span>{formatDate(d.created_at, 'en-IN')}</span>
                </div>
              </div>
              {filter === 'pending' && (
                <button
                  onClick={() => setResolveModal(d)}
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
            <h3 className="text-base font-bold text-gray-900 mb-4">Resolve Dispute</h3>
            <p className="text-sm text-gray-600 mb-3">Issue #{resolveModal.issue_id?.slice(0, 8)}</p>
            <p className="text-sm text-gray-700 mb-4 bg-gray-50 p-3 rounded-lg">{resolveModal.reason}</p>

            <label className="block text-xs font-semibold text-gray-500 mb-2">Outcome</label>
            <div className="flex gap-2 mb-4">
              {['upheld', 'dismissed'].map((o) => (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg capitalize transition-colors ${outcome === o ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {o}
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
