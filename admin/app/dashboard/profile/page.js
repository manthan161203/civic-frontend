'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../src/store/authStore';
import { authApi, locationsApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';
import { formatDate } from '../../../src/lib/dateUtils';
import LoadingButton from '../../../src/components/ui/LoadingButton';

const ROLE_LABELS = {
  admin: 'Super Admin',
  district_admin: 'District Admin',
  taluka_admin: 'Taluka Admin',
  ward_admin: 'Ward Admin',
};

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700',
  district_admin: 'bg-blue-100 text-blue-700',
  taluka_admin: 'bg-green-100 text-green-700',
  ward_admin: 'bg-yellow-100 text-yellow-700',
};

// ── Profile Info Section ───────────────────────────────────────────────────────
function ProfileInfo() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [scope, setScope] = useState('State-wide');

  // Fetch location names to display correct scope
  useEffect(() => {
    if (!user) return;

    if (user.role === 'admin') {
      setScope('State-wide');
      return;
    }

    locationsApi.getTree()
      .then(({ data }) => {
        let scopeText = 'State-wide';

        if (data && data.length) {
          // Find and display the correct location name
          if (user.role === 'district_admin' && user.district_id) {
            const district = data.find(d => d.id === user.district_id);
            if (district) scopeText = district.name;
          } else if (user.role === 'taluka_admin' && user.taluka_id) {
            data.forEach((district) => {
              (district.talukas || []).forEach((taluka) => {
                if (taluka.id === user.taluka_id) {
                  scopeText = taluka.name;
                }
              });
            });
          } else if (user.role === 'ward_admin' && user.ward_id) {
            data.forEach((district) => {
              (district.talukas || []).forEach((taluka) => {
                (taluka.wards || []).forEach((ward) => {
                  if (ward.id === user.ward_id) {
                    scopeText = ward.name;
                  }
                });
              });
            });
          }
        }

        setScope(scopeText);
      })
      .catch(() => setScope('State-wide'));
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name cannot be empty.'); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await authApi.updateProfile({ name: name.trim() });
      updateUser({ name: data.name });
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update profile.'));
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-bold text-gray-900 mb-5">Profile Information</h2>

      {/* Avatar + role */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-2xl font-black">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </span>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{user?.name || '—'}</div>
          <div className="text-sm text-gray-500">{user?.phone}</div>
          <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[user?.role] || 'bg-gray-100 text-gray-600'}`}>
            {ROLE_LABELS[user?.role] || user?.role}
          </span>
        </div>
      </div>

      {/* Read-only fields */}
      <div className="space-y-3 mb-6">
        {[
          ['Phone', user?.phone || '—'],
          ['Scope', scope],
          ['Joined', user?.created_at ? formatDate(user.created_at, 'en-IN') : '—'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center gap-4 py-2 border-b border-gray-50">
            <span className="text-sm text-gray-500 w-24 flex-shrink-0">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value}</span>
          </div>
        ))}
      </div>

      {/* Editable name */}
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
            Display Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

        <LoadingButton
          type="submit"
          isLoading={saving}
          variant="primary"
          loadingText="Saving..."
        >
          Save Changes
        </LoadingButton>
      </form>
    </div>
  );
}

// ── Change Phone Section ───────────────────────────────────────────────────────
function ChangePhone() {
  const { user, updateUser } = useAuthStore();
  const [step, setStep] = useState('input'); // 'input' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const sendOtp = async (e) => {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) { setError('Enter a valid 10-digit phone number.'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.sendChangePhoneOtp(`+91${cleaned}`);
      setPhone(`+91${cleaned}`);
      setStep('otp');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send OTP.'));
    }
    setLoading(false);
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.verifyChangePhone(phone, otp);
      updateUser({ phone: data.phone });
      setSuccess(`Phone updated to ${data.phone}`);
      setStep('input');
      setPhone('');
      setOtp('');
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid OTP.'));
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-base font-bold text-gray-900 mb-1">Change Phone Number</h2>
      <p className="text-xs text-gray-400 mb-5">
        Current number: <span className="font-semibold text-gray-700">{user?.phone}</span>
      </p>

      {step === 'input' ? (
        <form onSubmit={sendOtp} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">New Phone Number</label>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden focus-within:border-blue-400">
              <span className="px-3 flex items-center text-xs text-gray-500 bg-gray-50 border-r border-gray-200 font-semibold">+91</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                className="flex-1 px-3 py-2.5 text-sm outline-none"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Sending OTP…' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4 max-w-sm">
          <p className="text-sm text-gray-600">OTP sent to <strong>{phone}</strong></p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Enter OTP</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit OTP"
              maxLength={6}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 tracking-widest font-bold text-center text-lg"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep('input'); setOtp(''); setError(''); }}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-semibold"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Verifying…' : 'Verify & Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  return (
    <div className="space-y-6 max-w-xl">
      <ProfileInfo />
      <ChangePhone />
    </div>
  );
}
