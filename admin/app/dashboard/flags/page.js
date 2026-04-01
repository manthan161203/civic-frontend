'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { formatDate } from '../../../src/lib/dateUtils';

const REASON_COLORS = {
  spam: 'bg-yellow-100 text-yellow-700',
  inappropriate: 'bg-red-100 text-red-700',
  duplicate: 'bg-blue-100 text-blue-700',
  false_report: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function FlagsPage() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    setLoading(true);
    adminApi.getFlags({ status: filter })
      .then(({ data }) => setFlags(data.items || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const resolve = async (id, status) => {
    await adminApi.resolveFlag(id, status).catch(() => {});
    setFlags((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3 items-center">
        {['pending', 'reviewed', 'dismissed'].map((s) => (
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
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : flags.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No {filter} flags</div>
        ) : (
          flags.map((flag) => (
            <div key={flag.id} className="p-4 flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${REASON_COLORS[flag.reason] || REASON_COLORS.other}`}>
                    {flag.reason?.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {flag.issue_id ? 'Issue' : 'Comment'}
                  </span>
                </div>
                {flag.details && (
                  <p className="text-sm text-gray-700 mb-1">{flag.details}</p>
                )}
                <div className="text-xs text-gray-400">
                  {formatDate(flag.created_at, 'en-IN')}
                </div>
              </div>
              {filter === 'pending' && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => resolve(flag.id, 'reviewed')}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700"
                  >
                    Reviewed
                  </button>
                  <button
                    onClick={() => resolve(flag.id, 'dismissed')}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
