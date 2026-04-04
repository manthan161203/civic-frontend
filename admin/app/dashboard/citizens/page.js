'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminApi, locationsApi } from '../../../src/api/index';
import { useAuthStore } from '../../../src/store/authStore';
import AdminScopeHeader from '../../../src/components/AdminScopeHeader';
import LoadingButton from '../../../src/components/ui/LoadingButton';

export default function CitizensPage() {
  const { user } = useAuthStore();
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [locationTree, setLocationTree] = useState([]);

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: PAGE_SIZE };
      if (search) params.search = search;
      const { data } = await adminApi.getCitizens(params);
      setCitizens(data.items || data);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  // Fetch location tree on mount
  useEffect(() => {
    locationsApi.getTree()
      .then(({ data }) => setLocationTree(data || []))
      .catch(() => {});
  }, []);

  const handleToggle = async (id, active) => {
    if (!confirm(`${active ? 'Deactivate' : 'Reactivate'} this citizen?`)) return;
    await (active ? adminApi.deactivateCitizen(id) : adminApi.reactivateCitizen(id)).catch(() => {});
    load();
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const { data } = await adminApi.getCitizen(id);
      setSelected(data);
    } catch {}
    setDetailLoading(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Admin Scope Header */}
      {user && <AdminScopeHeader user={user} locationTree={locationTree} />}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-3 items-center">
        <input
          type="text"
          placeholder="Search citizens…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); setSelected(null); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 outline-none focus:border-blue-400"
        />
        <div className="flex-1" />
        <span className="text-sm text-gray-400">{total} total citizens</span>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xl">
                {selected.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                <p className="text-sm text-gray-500">{selected.phone}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Ward', selected.ward || '—'],
                ['Language', selected.language || '—'],
                ['Total Reported', selected.stats?.total_reported ?? selected.total_issues_reported ?? 0],
                ['Resolved', selected.stats?.total_resolved ?? '—'],
                ['Open', selected.stats?.total_open ?? '—'],
                ['Google Linked', selected.google_linked ? 'Yes' : 'No'],
                ['Aadhaar Verified', selected.aadhar_verified ? 'Yes' : 'No'],
                ['Status', selected.is_active ? 'Active' : 'Inactive'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-3 border-b border-gray-50">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{String(value)}</span>
                </div>
              ))}
            </div>
            <LoadingButton onClick={() => setSelected(null)} variant="outline" className="mt-4 w-full">Close</LoadingButton>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Citizen</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ward</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Issues</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Verified</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : citizens.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <div className="flex justify-center mb-2 text-gray-200">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{width:40,height:40}}>
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="text-gray-400 text-sm">No citizens found</div>
                </td>
              </tr>
            ) : (
              citizens.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        {c.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <button className="font-medium text-blue-600 hover:underline" onClick={() => openDetail(c.id)}>
                        {c.name || 'Unknown'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.ward || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{c.total_issues_reported ?? 0}</td>
                  <td className="px-4 py-3">
                    {c.aadhar_verified ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Aadhaar</span>
                    ) : c.google_linked ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Google</span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <LoadingButton
                      onClick={() => handleToggle(c.id, c.is_active)}
                      variant={c.is_active ? 'danger' : 'success'}
                      size="sm"
                    >
                      {c.is_active ? 'Deactivate' : 'Reactivate'}
                    </LoadingButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">{total} total · Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
