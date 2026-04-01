'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminApi, locationsApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';
import { useAuthStore } from '../../../src/store/authStore';
import { formatDate } from '../../../src/lib/dateUtils';

const ROLE_LABELS = {
  admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
  district_admin: { label: 'District Admin', color: 'bg-blue-100 text-blue-700' },
  taluka_admin: { label: 'Taluka Admin', color: 'bg-green-100 text-green-700' },
  ward_admin: { label: 'Ward Admin', color: 'bg-yellow-100 text-yellow-700' },
  worker: { label: 'Worker', color: 'bg-orange-100 text-orange-700' },
  citizen: { label: 'Citizen', color: 'bg-gray-100 text-gray-600' },
};

const ALL_ROLES = ['citizen', 'worker', 'ward_admin', 'taluka_admin', 'district_admin', 'admin'];

function RoleBadge({ role }) {
  const r = ROLE_LABELS[role] || { label: role, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${r.color}`}>
      {r.label}
    </span>
  );
}

// ── Edit Admin Modal ───────────────────────────────────────────────────────────
function EditAdminModal({ admin, onClose, onUpdated }) {
  const { user: currentUser } = useAuthStore();
  const [form, setForm] = useState({
    name: admin?.name || '',
    phone: admin?.phone ? admin.phone.replace('+91', '') : '',
    role: admin?.role || 'ward_admin',
    district_id: admin?.district_id || '',
    taluka_id: admin?.taluka_id || '',
    ward_id: admin?.ward_id || '',
  });
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [wards, setWards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Which roles the current user can set
  const creatableRoles = {
    admin: ['district_admin', 'taluka_admin', 'ward_admin'],
    district_admin: ['taluka_admin', 'ward_admin'],
    taluka_admin: ['ward_admin'],
  }[currentUser?.role] || [];

  // Load locations (same logic as CreateAdmin)
  useEffect(() => {
    locationsApi.getDistricts().then(({ data }) => {
      let districtList = data.items || data;
      if (currentUser?.role !== 'admin' && currentUser?.district_id) {
        districtList = districtList.filter(d => d.id === currentUser.district_id);
      }
      setDistricts(districtList);
    }).catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    if (!form.district_id) { setTalukas([]); return; }
    locationsApi.getTalukas(form.district_id).then(({ data }) => {
      let talukaList = data.items || data;
      if (currentUser?.role === 'taluka_admin' && currentUser?.taluka_id) {
        talukaList = talukaList.filter(t => t.id === currentUser.taluka_id);
      } else if (currentUser?.role === 'ward_admin' && currentUser?.taluka_id) {
        talukaList = talukaList.filter(t => t.id === currentUser.taluka_id);
      }
      setTalukas(talukaList);
    }).catch(() => {});
  }, [form.district_id, currentUser]);

  useEffect(() => {
    if (!form.taluka_id) { setWards([]); return; }
    locationsApi.getWards(form.taluka_id).then(({ data }) => {
      let wardList = data.items || data;
      if (currentUser?.role === 'ward_admin' && currentUser?.ward_id) {
        wardList = wardList.filter(w => w.id === currentUser.ward_id);
      }
      setWards(wardList);
    }).catch(() => {});
  }, [form.taluka_id, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name cannot be empty'); return; }
    
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        role: form.role,
        district_id: form.district_id || null,
        taluka_id: form.taluka_id || null,
        ward_id: form.ward_id || null,
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

      await adminApi.updateAdmin(admin.id, payload);
      setSuccess('Admin updated successfully');
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 1000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update admin.'));
    }
    setSaving(false);
  };

  if (!admin) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-gray-900">Edit Admin</h2>
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
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="10 digits"
                  maxLength="10"
                  className="w-full border border-gray-200 rounded-lg pl-14 pr-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
                <span className="absolute left-3 top-2 text-sm font-bold text-gray-700">+91</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Role</label>
            <div className="flex gap-2 flex-wrap">
              {creatableRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: r }))}
                  className={`px-3 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                    form.role === r
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {ROLE_LABELS[r]?.label || r}
                </button>
              ))}
            </div>
          </div>

          {/* Location scope */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Geographic Scope</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">District</label>
                <select
                  value={form.district_id}
                  onChange={(e) => setForm(f => ({ ...f, district_id: e.target.value, taluka_id: '', ward_id: '' }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
                >
                  <option value="">— Select district —</option>
                  {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {(form.role === 'taluka_admin' || form.role === 'ward_admin') && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Taluka</label>
                  <select
                    value={form.taluka_id}
                    onChange={(e) => setForm(f => ({ ...f, taluka_id: e.target.value, ward_id: '' }))}
                    disabled={!form.district_id}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white disabled:opacity-50"
                  >
                    <option value="">— Select taluka —</option>
                    {talukas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              {form.role === 'ward_admin' && (
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ward</label>
                  <select
                    value={form.ward_id}
                    onChange={(e) => setForm(f => ({ ...f, ward_id: e.target.value }))}
                    disabled={!form.taluka_id}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white disabled:opacity-50"
                  >
                    <option value="">— Select ward —</option>
                    {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>}
          {success && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100 flex items-center gap-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} style={{width:14,height:14}} className="text-green-500 flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>{success}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-bold transition-colors">
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


// ── Sub-Admin List ─────────────────────────────────────────────────────────────
function AdminList({ refresh, triggerRefresh }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [locationNames, setLocationNames] = useState({});
  const [editingAdmin, setEditingAdmin] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, size: 50 };
      if (roleFilter) params.role = roleFilter;
      const { data } = await adminApi.getAdmins(params);
      const adminList = data.items || data;
      setAdmins(adminList);
      
      // Fetch location names for all admins
      const tree = await locationsApi.getTree();
      const names = {};
      
      if (tree.data && tree.data.length) {
        tree.data.forEach((district) => {
          names[`district_${district.id}`] = district.name;
          district.talukas?.forEach((taluka) => {
            names[`taluka_${taluka.id}`] = taluka.name;
            taluka.wards?.forEach((ward) => {
              names[`ward_${ward.id}`] = ward.name;
            });
          });
        });
      }
      setLocationNames(names);
    } catch {}
    setLoading(false);
  }, [roleFilter, refresh]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['', 'district_admin', 'taluka_admin', 'ward_admin'].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              roleFilter === r ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {r === '' ? 'All' : ROLE_LABELS[r]?.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Scope</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : admins.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No sub-admins found</td></tr>
            ) : (
              admins.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">
                        {a.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-gray-900">{a.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.phone}</td>
                  <td className="px-4 py-3"><RoleBadge role={a.role} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {a.role === 'district_admin' && a.district_id
                      ? locationNames[`district_${a.district_id}`] || 'Unknown District'
                      : a.role === 'taluka_admin' && a.taluka_id
                      ? locationNames[`taluka_${a.taluka_id}`] || 'Unknown Taluka'
                      : a.role === 'ward_admin' && a.ward_id
                      ? locationNames[`ward_${a.ward_id}`] || 'Unknown Ward'
                      : 'State-wide'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                    {formatDate(a.created_at, 'en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingAdmin(a)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingAdmin && (
        <EditAdminModal
          admin={editingAdmin}
          onClose={() => setEditingAdmin(null)}
          onUpdated={() => { load(); triggerRefresh(); }}
        />
      )}
    </div>
  );
}

// ── Create Sub-Admin ───────────────────────────────────────────────────────────
function CreateAdmin({ onCreated }) {
  const { user: currentUser } = useAuthStore();
  const [form, setForm] = useState({ name: '', phone: '', role: 'ward_admin', language: 'en' });
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTaluka, setSelectedTaluka] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Which roles the current user can create
  const creatableRoles = {
    admin: ['district_admin', 'taluka_admin', 'ward_admin'],
    district_admin: ['taluka_admin', 'ward_admin'],
    taluka_admin: ['ward_admin'],
  }[currentUser?.role] || [];

  useEffect(() => {
    locationsApi.getDistricts().then(({ data }) => {
      let districtList = data.items || data;
      
      // Filter districts based on current user's role
      if (currentUser?.role === 'district_admin' && currentUser?.district_id) {
        // District admin can only see their own district
        districtList = districtList.filter(d => d.id === currentUser.district_id);
        setSelectedDistrict(currentUser.district_id); // Auto-select their district
      } else if (currentUser?.role === 'taluka_admin' && currentUser?.district_id) {
        // Taluka admin can only see their district
        districtList = districtList.filter(d => d.id === currentUser.district_id);
        setSelectedDistrict(currentUser.district_id); // Auto-select their district
      } else if (currentUser?.role === 'ward_admin' && currentUser?.district_id) {
        // Ward admin can only see their district
        districtList = districtList.filter(d => d.id === currentUser.district_id);
        setSelectedDistrict(currentUser.district_id); // Auto-select their district
      }
      
      setDistricts(districtList);
    }).catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    if (!selectedDistrict) { setTalukas([]); setSelectedTaluka(''); return; }
    locationsApi.getTalukas(selectedDistrict).then(({ data }) => {
      let talukaList = data.items || data;
      
      // Filter talukas based on current user's role
      if (currentUser?.role === 'taluka_admin' && currentUser?.taluka_id) {
        // Taluka admin can only see their own taluka
        talukaList = talukaList.filter(t => t.id === currentUser.taluka_id);
        setSelectedTaluka(currentUser.taluka_id); // Auto-select their taluka
      } else if (currentUser?.role === 'ward_admin' && currentUser?.taluka_id) {
        // Ward admin can only see their taluka
        talukaList = talukaList.filter(t => t.id === currentUser.taluka_id);
        setSelectedTaluka(currentUser.taluka_id); // Auto-select their taluka
      }
      
      setTalukas(talukaList);
    }).catch(() => {});
    setSelectedWard('');
  }, [selectedDistrict, currentUser]);

  useEffect(() => {
    if (!selectedTaluka) { setWards([]); setSelectedWard(''); return; }
    locationsApi.getWards(selectedTaluka).then(({ data }) => {
      let wardList = data.items || data;
      
      // Filter wards based on current user's role
      if (currentUser?.role === 'ward_admin' && currentUser?.ward_id) {
        // Ward admin can only see their own ward
        wardList = wardList.filter(w => w.id === currentUser.ward_id);
        setSelectedWard(currentUser.ward_id); // Auto-select their ward
      }
      
      setWards(wardList);
    }).catch(() => {});
  }, [selectedTaluka, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const cleaned = form.phone.replace(/\D/g, '');
    if (cleaned.length !== 10) { setError('Enter a valid 10-digit phone number.'); return; }

    const payload = {
      ...form,
      phone: `+91${cleaned}`,
      district_id: selectedDistrict || undefined,
      taluka_id: selectedTaluka || undefined,
      ward_id: selectedWard || undefined,
    };

    setSaving(true);
    try {
      const { data } = await adminApi.createAdmin(payload);
      setSuccess(`${data.name} created as ${ROLE_LABELS[data.role]?.label}`);
      setForm({ name: '', phone: '', role: 'ward_admin', language: 'en' });
      setSelectedDistrict(''); setSelectedTaluka(''); setSelectedWard('');
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create admin.'));
    }
    setSaving(false);
  };

  if (creatableRoles.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
        Your role does not have permission to create sub-admins.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg">
      <h2 className="text-base font-bold text-gray-900 mb-5">Create Sub-Admin</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Full Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Rajesh Kumar"
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
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Role</label>
          <div className="flex gap-2 flex-wrap">
            {creatableRoles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: r }))}
                className={`px-3 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  form.role === r
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {ROLE_LABELS[r]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location scope — shown based on role */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Geographic Scope</p>
          <div>
            <label className="block text-xs text-gray-600 mb-1">District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
            >
              <option value="">— Select district —</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {(form.role === 'taluka_admin' || form.role === 'ward_admin') && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Taluka</label>
              <select
                value={selectedTaluka}
                onChange={(e) => setSelectedTaluka(e.target.value)}
                disabled={!selectedDistrict}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white disabled:opacity-50"
              >
                <option value="">— Select taluka —</option>
                {talukas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          {form.role === 'ward_admin' && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Ward</label>
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                disabled={!selectedTaluka}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white disabled:opacity-50"
              >
                <option value="">— Select ward —</option>
                {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} style={{width:14,height:14}} className="text-green-500 flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>{success}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full h-11 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Creating…' : 'Create Sub-Admin'}
        </button>
      </form>
    </div>
  );
}

// ── Role Changer (promote existing user) ──────────────────────────────────────
function RoleChanger() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setSelected(null);
    setError('');
    try {
      const [citRes, workerRes] = await Promise.allSettled([
        adminApi.searchCitizens(query),
        adminApi.searchWorkers(query),
      ]);
      const citizens = citRes.status === 'fulfilled' ? (citRes.value.data?.items || citRes.value.data || []) : [];
      const workers = workerRes.status === 'fulfilled' ? (workerRes.value.data?.items || workerRes.value.data || []) : [];
      
      if (Array.isArray(citizens) && Array.isArray(workers)) {
        setResults([...citizens, ...workers]);
      } else {
        setError('Invalid response format from server');
      }
      
      if (citizens.length === 0 && workers.length === 0) {
        setError(`No citizens or workers found matching "${query}"`);
      }
    } catch (err) {
      setError('Search failed: ' + (err.message || 'Unknown error'));
    }
    setSearching(false);
  };

  const handleChange = async () => {
    if (!selected || !newRole) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await adminApi.changeUserRole(selected.id, newRole);
      setSuccess(`${data.name}'s role changed to ${ROLE_LABELS[newRole]?.label || newRole}`);
      setSelected({ ...selected, role: newRole });
      setNewRole('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to change role.'));
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg space-y-5">
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-1">Promote / Change Role</h2>
        <p className="text-xs text-gray-500">Search any citizen or worker by name or phone, then change their role.</p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Name or phone number…"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
        <button
          onClick={search}
          disabled={searching || !query.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? '…' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && !selected && (
        <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => { setSelected(u); setResults([]); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                {u.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">{u.name || 'Unknown'}</div>
                <div className="text-xs text-gray-400">{u.phone}</div>
              </div>
              <RoleBadge role={u.role} />
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && query && !searching && !selected && (
        <div className="text-sm text-center py-3 border border-yellow-100 rounded-lg bg-yellow-50 text-yellow-800">
          {error || 'No users found'}
        </div>
      )}

      {/* Selected user + role picker */}
      {selected && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold">
              {selected.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{selected.name}</div>
              <div className="text-xs text-gray-500">{selected.phone}</div>
            </div>
            <div className="flex items-center gap-2">
              <RoleBadge role={selected.role} />
              <button onClick={() => { setSelected(null); setSuccess(''); setError(''); }} className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
              Change role to
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.filter((r) => r !== selected.role).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNewRole(r)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    newRole === r
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {ROLE_LABELS[r]?.label || r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} style={{width:14,height:14}} className="text-green-500 flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>{success}</p>}

          <button
            onClick={handleChange}
            disabled={!newRole || saving}
            className="w-full h-10 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
          >
            {saving ? 'Saving…' : newRole ? `Change to ${ROLE_LABELS[newRole]?.label}` : 'Select a role above'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AdminsPage() {
  const [tab, setTab] = useState('list');
  const [refreshKey, setRefreshKey] = useState(0);

  const TABS = [
    { id: 'list', label: 'Sub-Admins' },
    { id: 'create', label: 'Create Sub-Admin' },
    { id: 'roles', label: 'Change Role' },
  ];

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 text-sm text-blue-700">
        <strong>Admin hierarchy:</strong> Super Admin → District Admin → Taluka Admin → Ward Admin.
        Use <strong>Change Role</strong> to promote an existing citizen or worker.
      </div>

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

      {tab === 'list' && <AdminList refresh={refreshKey} triggerRefresh={() => setRefreshKey((k) => k + 1)} />}
      {tab === 'create' && <CreateAdmin onCreated={() => { setRefreshKey((k) => k + 1); setTab('list'); }} />}
      {tab === 'roles' && <RoleChanger />}
    </div>
  );
}
