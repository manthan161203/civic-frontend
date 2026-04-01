'use client';
import { useState, useEffect } from 'react';
import { adminApi, locationsApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';

const SCOPE_COLORS = {
  ward: 'bg-blue-100 text-blue-700',
  taluka: 'bg-green-100 text-green-700',
  district: 'bg-yellow-100 text-yellow-700',
  state: 'bg-purple-100 text-purple-700',
};

// SVG icons for each scope
const SCOPE_SVGS = {
  state: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  district: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}>
      <rect x="3" y="9" width="18" height="13" rx="1" />
      <path d="M3 9l9-7 9 7" />
    </svg>
  ),
  taluka: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  ward: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
};;

// ── Create Modal ───────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', body: '', scope: 'state' });
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTaluka, setSelectedTaluka] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    locationsApi.getDistricts()
      .then(({ data }) => setDistricts(data.items || data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDistrict) { setTalukas([]); setSelectedTaluka(''); return; }
    locationsApi.getTalukas(selectedDistrict)
      .then(({ data }) => setTalukas(data.items || data))
      .catch(() => {});
    setSelectedTaluka('');
    setSelectedWard('');
  }, [selectedDistrict]);

  useEffect(() => {
    if (!selectedTaluka) { setWards([]); setSelectedWard(''); return; }
    locationsApi.getWards(selectedTaluka)
      .then(({ data }) => setWards(data.items || data))
      .catch(() => {});
    setSelectedWard('');
  }, [selectedTaluka]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = { ...form };
    if (form.scope === 'district' && selectedDistrict) payload.district_id = selectedDistrict;
    if (form.scope === 'taluka' && selectedTaluka) payload.taluka_id = selectedTaluka;
    if (form.scope === 'ward' && selectedWard) payload.ward_id = selectedWard;

    setSaving(true);
    try {
      await adminApi.createAnnouncement(payload);
      onCreated();
      onClose();
      setForm({ title: '', body: '', scope: 'state' });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create announcement.'));
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">New Announcement</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Water supply disruption today"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Message</label>
            <textarea
              required
              rows={4}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Write the announcement message here…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none"
            />
          </div>

          {/* Scope */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">Target Audience</label>
            <div className="grid grid-cols-4 gap-2">
              {['state', 'district', 'taluka', 'ward'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setForm((f) => ({ ...f, scope: s })); setSelectedDistrict(''); setSelectedTaluka(''); setSelectedWard(''); }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    form.scope === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span>{SCOPE_SVGS[s]}</span>
                  <span className="capitalize">{s}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location selector */}
          {form.scope !== 'state' && (
            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Select Location</p>
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

              {(form.scope === 'taluka' || form.scope === 'ward') && (
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

              {form.scope === 'ward' && (
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
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {saving ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterScope, setFilterScope] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.getAnnouncements()
      .then(({ data }) => setAnnouncements(data.items || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement? This cannot be undone.')) return;
    await adminApi.deleteAnnouncement(id).catch(() => {});
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const visible = filterScope ? announcements.filter((a) => a.scope === filterScope) : announcements;

  return (
    <div className="space-y-4">
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {['', 'state', 'district', 'taluka', 'ward'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterScope(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                filterScope === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === '' ? 'All' : <span className="flex items-center gap-1">{SCOPE_SVGS[s]}<span className="capitalize">{s}</span></span>}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Announcement
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
              <div className="h-5 w-48 bg-gray-100 rounded mb-2" />
              <div className="h-4 w-full bg-gray-100 rounded mb-1" />
              <div className="h-4 w-3/4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16">
          <div className="flex justify-center mb-2 text-gray-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{width:40,height:40}}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </div>
          <div className="text-gray-400 text-sm">No announcements yet</div>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-gray-900">{a.title}</h3>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${SCOPE_COLORS[a.scope] || 'bg-gray-100 text-gray-600'}`}>
                      {SCOPE_SVGS[a.scope]}
                      {a.scope}
                    </span>
                    {(a.ward_name || a.taluka_name || a.district_name) && (
                      <span className="text-xs text-gray-400">
                        · {a.ward_name || a.taluka_name || a.district_name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{a.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors flex-shrink-0"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
