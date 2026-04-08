'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';
import { useUiStore } from '../../../src/store/uiStore';
import { useAuthStore } from '../../../src/store/authStore';
import { formatDate, formatDateTime } from '../../../src/lib/dateUtils';
import LoadingButton from '../../../src/components/ui/LoadingButton';

const SCOPE_LEVELS = [
  { value: 'ward', label: 'Ward', description: 'Access to specific ward' },
  { value: 'taluka', label: 'Taluka', description: 'Access to entire taluka' },
  { value: 'district', label: 'District', description: 'Access to entire district' },
];

// Grant Override Modal
function GrantOverrideModal({ onClose, onGranted }) {
  const { addToast } = useUiStore();
  const [form, setForm] = useState({
    target_admin_id: '',
    scope_level: 'ward',
    target_scope_id: '',
    reason: '',
    duration_minutes: '',
  });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch list of admins
  useEffect(() => {
    adminApi.getAdmins({ page: 1, size: 100 })
      .then(res => {
        const adminList = res.data?.items || res.data || [];
        setAdmins(adminList);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load admin list');
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.target_admin_id || !form.target_scope_id || !form.reason.trim()) {
      setError('Please fill all required fields');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const data = {
        target_admin_id: form.target_admin_id,
        scope_level: form.scope_level,
        target_scope_id: form.target_scope_id,
        reason: form.reason,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      };

      await adminApi.grantOverride(data);
      addToast('Override granted successfully', 'success');
      onGranted?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Grant Override Access</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-700 text-sm border-b border-red-200">{error}</div>}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Admin</label>
            <select value={form.target_admin_id} onChange={(e) => setForm({ ...form, target_admin_id: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
              <option value="">Select admin</option>
              {admins.map(admin => <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Scope Level</label>
              <select value={form.scope_level} onChange={(e) => setForm({ ...form, scope_level: e.target.value, target_scope_id: '' })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                {SCOPE_LEVELS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Scope ID</label>
              <input type="text" value={form.target_scope_id} onChange={(e) => setForm({ ...form, target_scope_id: e.target.value })} placeholder="UUID or ID" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why is this override needed?" maxLength={500} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none h-24"></textarea>
            <p className="text-xs text-gray-400 mt-1">{form.reason.length}/500</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Duration (minutes)</label>
            <input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} placeholder="Leave empty for permanent" min="1" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <p className="text-xs text-gray-400 mt-1">Leave empty to never expire</p>
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <LoadingButton type="submit" loading={saving} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Grant</LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// Revoke Confirmation Modal
function RevokeModal({ override, onClose, onRevoked }) {
  const { addToast } = useUiStore();
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await adminApi.revokeOverride(override.id);
      addToast('Override revoked successfully', 'success');
      onRevoked?.();
      onClose();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Revoke Override?</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">This will immediately remove access for the admin to this scope.</p>
          <p className="text-sm font-medium text-gray-900 mt-4">Scope: <span className="font-mono text-gray-600">{override.target_scope}</span></p>
        </div>
        <div className="p-6 border-t border-gray-200 flex gap-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <LoadingButton onClick={handleRevoke} loading={revoking} className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Revoke</LoadingButton>
        </div>
      </div>
    </div>
  );
}

// Main Page
export default function AdminOverridesPage() {
  const { user: currentUser } = useAuthStore();
  const { addToast } = useUiStore();
  const [tab, setTab] = useState('active'); // 'active' or 'audit'
  const [activeOverrides, setActiveOverrides] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const loadActiveOverrides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getActiveOverrides(page, 20);
      setActiveOverrides(res.data?.messages || res.data?.items || []);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [page, addToast]);

  const loadAuditLog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOverrideAuditLog(page, 50);
      setAuditLog(res.data?.messages || res.data?.items || []);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [page, addToast]);

  useEffect(() => {
    if (!currentUser) return;
    if (tab === 'active') {
      loadActiveOverrides();
    } else {
      loadAuditLog();
    }
  }, [tab, currentUser, loadActiveOverrides, loadAuditLog]);

  const TABS = [
    { id: 'active', label: 'Active Overrides' },
    { id: 'audit', label: 'Audit Log' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Overrides</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage cross-scope access and emergency overrides</p>
        </div>
        {currentUser?.role === 'admin' && (
          <button onClick={() => setShowGrantModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            Grant Override
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setPage(1); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : tab === 'active' ? (
          activeOverrides.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No active overrides</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Scope</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Until</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeOverrides.map((override) => (
                  <tr key={override.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{override.admin_name || 'Unknown'}</td>
                    <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-700">{override.target_scope}</code></td>
                    <td className="px-4 py-3 text-gray-600">{override.reason}</td>
                    <td className="px-4 py-3 text-gray-600">{override.override_until ? formatDateTime(override.override_until) : <span className="text-gray-400">Never</span>}</td>
                    <td className="px-4 py-3">
                      {currentUser?.role === 'admin' && (
                        <button onClick={() => setRevokeTarget(override)} className="px-2 py-1 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          auditLog.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No audit log entries</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Scope</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLog.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{entry.admin_id}</td>
                    <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{entry.admin_role}</span></td>
                    <td className="px-4 py-3"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-700">{entry.target_scope}</code></td>
                    <td className="px-4 py-3 text-gray-600">{entry.accessed_resource_type}</td>
                    <td className="px-4 py-3 text-gray-600">{entry.reason}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(entry.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {showGrantModal && <GrantOverrideModal onClose={() => setShowGrantModal(false)} onGranted={loadActiveOverrides} />}
      {revokeTarget && <RevokeModal override={revokeTarget} onClose={() => setRevokeTarget(null)} onRevoked={loadActiveOverrides} />}
    </div>
  );
}
