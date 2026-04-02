'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';
import { locationsApi } from '../../../src/api/index';
import { formatDate } from '../../../src/lib/dateUtils';
import { useAuthStore } from '../../../src/store/authStore';

const DEPT_OPTIONS = ['water', 'roads', 'electricity', 'sanitation', 'parks', 'other'];

// ── Edit Worker Modal ──────────────────────────────────────────────────────────
function EditWorkerModal({ worker, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: worker.name || '',
    phone: worker.phone ? worker.phone.replace('+91', '') : '',
    ward_id: worker.ward_id || '',
    department: worker.department || '',
  });
  const [wards, setWards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load wards (same logic as CreateWorker)
  useEffect(() => {
    const user = useAuthStore.getState().user;
    locationsApi.getTree().then(({ data }) => {
      const allWards = [];
      (data.districts || data).forEach((district) => {
        if (user?.role === 'district_admin' && user?.district_id && district.id !== user.district_id) return;
        (district.talukas || []).forEach((taluka) => {
          if (user?.role === 'taluka_admin' && user?.taluka_id && taluka.id !== user.taluka_id) return;
          (taluka.wards || []).forEach((ward) => {
            if (user?.role === 'ward_admin' && user?.ward_id && ward.id !== user.ward_id) return;
            allWards.push({
              id: ward.id,
              label: `${ward.name} (Ward-${ward.ward_number}) · ${taluka.name}, ${district.name}`,
            });
          });
        });
      });
      setWards(allWards);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        ward_id: form.ward_id || null,
        department: form.department || null,
      };

      if (form.phone) {
        const cleaned = form.phone.replace(/\D/g, '');
        if (cleaned.length !== 10) {
          setError('Enter a valid 10-digit phone number');
          setSaving(false);
          return;
        }
        payload.phone = `+91${cleaned}`;
      }

      await adminApi.updateWorker(worker.id, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update worker.'));
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-gray-900">Edit Worker</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Phone</label>
              <div className="relative">
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="10 digits"
                  maxLength="10"
                  className="w-full border border-gray-200 rounded-lg pl-14 pr-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
                <span className="absolute left-3 top-2 text-sm font-bold text-gray-700">+91</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Ward Assignment</label>
            <select
              value={form.ward_id}
              onChange={(e) => setForm(f => ({ ...f, ward_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
            >
              <option value="">— No ward assigned —</option>
              {wards.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Department</label>
            <select
              value={form.department}
              onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
            >
              <option value="">— Select department —</option>
              {DEPT_OPTIONS.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
            </select>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-bold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-md shadow-blue-100">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ── Leaderboard ────────────────────────────────────────────────────────────────
function Leaderboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getWorkerLeaderboard()
      .then(({ data: d }) => setData(d.items || d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const MEDAL_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
  const MedalIcon = ({ i }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}} className={i < 3 ? MEDAL_COLORS[i] : 'text-gray-300'}>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900">Worker Leaderboard</h2>
        <p className="text-xs text-gray-400 mt-0.5">Ranked by performance score (tasks resolved × avg rating)</p>
      </div>
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-gray-300 text-sm">No leaderboard data yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-12">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Worker</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dept / Ward</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resolved</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">In Progress</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Closed</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resolution%</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((w, i) => (
                <tr key={w.worker_id || w.id || `leaderboard-${i}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-center font-bold text-gray-500">
                    {i < 3 ? <MedalIcon i={i} /> : <span className="text-xs text-gray-400">#{i + 1}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs shrink-0">
                        {w.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{w.name}</div>
                        <div className="text-xs text-gray-400">{w.phone || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-700 font-medium">{w.department || '—'}</div>
                    <div className="text-xs text-gray-400">{w.ward || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${w.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${w.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {w.is_online ? 'Online' : 'Offline'}
                      </span>
                      {w.is_online && (
                        <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${w.is_available ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {w.is_available ? 'Available' : 'Busy'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-700">{w.tasks_resolved ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600">{w.tasks_total ?? 0}</td>
                  <td className="px-4 py-3 text-blue-600">{w.tasks_in_progress ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">{w.tasks_closed ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${w.resolution_rate ?? 0}%`}} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{w.resolution_rate ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {w.avg_rating != null ? (
                      <span className="flex items-center gap-1 text-yellow-500 font-semibold text-xs">
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{width:13,height:13}}>
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        {w.avg_rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-indigo-50 text-indigo-700 font-bold text-xs px-2 py-1 rounded-lg">
                      {w.score ?? 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Worker List ────────────────────────────────────────────────────────────────
function WorkerList() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editWorker, setEditWorker] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', ward_id: '', department: '' });
  const [wards, setWards] = useState([]);
  const [wardNames, setWardNames] = useState({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: PAGE_SIZE };
      if (search) params.search = search;
      if (onlineOnly) params.is_online = true;
      const { data } = await adminApi.getWorkers(params);
      setWorkers(data.items || data);
      setTotal(data.total || 0);

      // Fetch and build ward name mapping
      try {
        const tree = await locationsApi.getTree();
        const names = {};
        if (tree.data && tree.data.length) {
          tree.data.forEach((district) => {
            (district.talukas || []).forEach((taluka) => {
              (taluka.wards || []).forEach((ward) => {
                names[ward.id] = ward.name;
              });
            });
          });
        }
        setWardNames(names);
      } catch {}
    } catch {}
    setLoading(false);
  }, [page, search, onlineOnly]);

  useEffect(() => { load(); }, [load]);

  // Load wards for the create form (filtered by admin's role and location)
  useEffect(() => {
    if (!showCreate || wards.length > 0) return;
    const user = useAuthStore.getState().user;
    
    locationsApi.getTree()
      .then(({ data }) => {
        const allWards = [];
        
        (data.districts || data).forEach((district) => {
          // Filter by district if user is district/taluka/ward admin
          if (user?.role === 'district_admin' && user?.district_id && district.id !== user.district_id) {
            return;
          }
          
          (district.talukas || []).forEach((taluka) => {
            // Filter by taluka if user is taluka/ward admin
            if (user?.role === 'taluka_admin' && user?.taluka_id && taluka.id !== user.taluka_id) {
              return;
            }
            
            (taluka.wards || []).forEach((ward) => {
              // Filter by ward if user is ward admin
              if (user?.role === 'ward_admin' && user?.ward_id && ward.id !== user.ward_id) {
                return;
              }
              
              allWards.push({
                id: ward.id,
                label: `${ward.name} (Ward-${ward.ward_number}) · ${taluka.name}, ${district.name}`,
              });
            });
          });
        });
        
        setWards(allWards);
      })
      .catch(() => {});
  }, [showCreate]);

  const handleDeactivate = async (id, active) => {
    if (!confirm(`${active ? 'Deactivate' : 'Reactivate'} this worker?`)) return;
    await (active ? adminApi.deactivateWorker(id) : adminApi.reactivateWorker(id)).catch(() => {});
    load();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    const cleaned = form.phone.replace(/\D/g, '');
    if (cleaned.length !== 10) { setCreateError('Enter a valid 10-digit phone number.'); return; }
    setCreating(true);
    try {
      await adminApi.createWorker({
        name: form.name,
        phone: `+91${cleaned}`,
        ward_id: form.ward_id || undefined,
        department: form.department || undefined,
        role: 'worker',
      });
      setShowCreate(false);
      setForm({ name: '', phone: '', ward_id: '', department: '' });
      load();
    } catch (err) {
      setCreateError(getErrorMessage(err, 'Failed to create worker.'));
    }
    setCreating(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search workers…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 outline-none focus:border-blue-400"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlineOnly}
            onChange={(e) => { setOnlineOnly(e.target.checked); setPage(1); }}
            className="rounded"
          />
          Online only
        </label>
        <div className="flex-1" />
        <span className="text-sm text-gray-400">{total} workers</span>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Worker
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Worker</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Phone</label>
                  <div className="relative">
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      placeholder="10 digits"
                      maxLength="10"
                      className="w-full border border-gray-200 rounded-lg pl-14 pr-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    />
                    <span className="absolute left-3 top-2 text-sm font-bold text-gray-700">+91</span>
                  </div>
                  {form.phone && <p className="text-xs text-blue-600 font-semibold mt-1">Complete number: +91{form.phone}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Ward (optional)</label>
                <select
                  value={form.ward_id}
                  onChange={(e) => setForm((f) => ({ ...f, ward_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                >
                  <option value="">— No ward assigned —</option>
                  {wards.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Department (optional)</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                >
                  <option value="">— Select department —</option>
                  {DEPT_OPTIONS.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
                </select>
              </div>

              {createError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowCreate(false); setCreateError(''); }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {creating ? 'Creating…' : 'Create Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editWorker && (
        <EditWorkerModal
          worker={editWorker}
          onClose={() => setEditWorker(null)}
          onSaved={() => { setEditWorker(null); load(); }}
        />
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Worker</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ward</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dept.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Online</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : workers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <div className="flex justify-center mb-2 text-gray-200">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{width:40,height:40}}>
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  </div>
                  <div className="text-gray-400 text-sm">No workers found</div>
                </td>
              </tr>
            ) : (
              workers.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                        {w.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-gray-900">{w.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{w.phone}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{w.ward_id ? wardNames[w.ward_id] || 'Unknown Ward' : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{w.department || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${w.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {w.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block w-2 h-2 rounded-full ${w.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-xs text-gray-400">{w.is_online ? 'Online' : 'Offline'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDate(w.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setEditWorker(w)}
                        className="px-2 py-1 text-xs font-semibold rounded-md border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeactivate(w.id, w.is_active)}
                        className={`px-2 py-1 text-xs font-semibold rounded-md border transition-colors ${w.is_active ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                      >
                        {w.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
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

// ── Worker Map Tab ─────────────────────────────────────────────────────────────
function FitBounds({ positions }) {
  const map = useMap();
  const prevLen = useRef(0);
  useEffect(() => {
    if (!map || !positions.length) return;
    if (positions.length === prevLen.current) return;
    prevLen.current = positions.length;
    const bounds = new google.maps.LatLngBounds();
    positions.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, positions]);
  return null;
}

function WorkerMapTab() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getWorkerLocations({ online_only: onlineOnly });
      setWorkers((data || []).filter((w) => w.latitude && w.longitude));
    } catch {}
    setLoading(false);
  }, [onlineOnly]);

  useEffect(() => { load(); }, [load]);

  const positions = workers.map((w) => ({ lat: w.latitude, lng: w.longitude }));

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} className="rounded" />
          Online only
        </label>
        <div className="flex-1" />
        <span className="text-xs text-gray-400">{workers.length} workers</span>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          Refresh
        </button>
      </div>
      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100" style={{ height: 'calc(100vh - 14rem)' }}>
        <Map
          defaultCenter={{ lat: 22.3072, lng: 70.8022 }}
          defaultZoom={7}
          mapId="civic-workers-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          {workers.map((w, i) => (
            <AdvancedMarker
              key={`wm-${i}`}
              position={{ lat: w.latitude, lng: w.longitude }}
              onClick={() => setSelected(w)}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: w.is_online ? '#22c55e' : '#9ca3af',
                  border: `2px solid ${w.is_online ? '#16a34a' : '#6b7280'}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                }}
              />
            </AdvancedMarker>
          ))}
          {selected && (
            <InfoWindow
              position={{ lat: selected.latitude, lng: selected.longitude }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="text-xs">
                <strong>{selected.name}</strong><br />
                {selected.ward || '—'} · {selected.department || '—'}<br />
                {selected.is_online ? '● Online' : '○ Offline'}
                {selected.location_updated_at && (
                  <><br />Updated: {new Date(selected.location_updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</>
                )}
              </div>
            </InfoWindow>
          )}
          <FitBounds positions={positions} />
        </Map>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function WorkersPage() {
  const [tab, setTab] = useState('list');

  const TABS = [
    { id: 'list', label: 'All Workers' },
    { id: 'map', label: 'Live Map' },
    { id: 'leaderboard', label: 'Leaderboard' },
  ];

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'list' && <WorkerList />}
      {tab === 'map' && <WorkerMapTab />}
      {tab === 'leaderboard' && <Leaderboard />}
    </div>
  );
}
