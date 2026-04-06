'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { formatDate } from '../../../src/lib/dateUtils';

export default function CustomTypesPage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApproved, setShowApproved] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getCustomIssueTypes({ approved_only: showApproved })
      .then(({ data }) => setTypes(data.items || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [showApproved]);

  const approve = async (id) => {
    try {
      await adminApi.approveCustomIssueType(id);
      setTypes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_approved: true } : t))
      );
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Custom Issue Types</h1>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3 items-center">
        <button
          onClick={() => setShowApproved(false)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${!showApproved ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setShowApproved(true)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${showApproved ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Approved Only
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : types.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No custom issue types yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Label</th>
                <th className="px-4 py-3 text-left font-semibold">Slug</th>
                <th className="px-4 py-3 text-center font-semibold">Usage</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
                <th className="px-4 py-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {types.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.label}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.slug}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                      {t.usage_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.is_approved ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(t.created_at, 'en-IN')}</td>
                  <td className="px-4 py-3 text-center">
                    {!t.is_approved && (
                      <button
                        onClick={() => approve(t.id)}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
