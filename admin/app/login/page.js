'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../src/api/index';
import { useAuthStore } from '../../src/store/authStore';
import { getErrorMessage } from '../../src/lib/apiError';

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  const sendOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) { setError('Enter a valid 10-digit phone number.'); return; }
    setLoading(true);
    try {
      await authApi.login(`+91${cleaned}`);
      setPhone(`+91${cleaned}`);
      setStep('otp');
      startCountdown();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send OTP.'));
    }
    setLoading(false);
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return; }
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp(phone, otp);
      const meRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/me`,
        { headers: { Authorization: `Bearer ${data.access_token}` } }
      );
      const user = await meRes.json();
      if (!user.role?.includes('admin') && user.role !== 'admin') {
        setError('Access denied. Admin accounts only.');
        setLoading(false);
        return;
      }
      setSession(data.access_token, data.refresh_token, user);
      router.push('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid OTP.'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center mb-3">
            <span className="text-2xl font-black text-white">C</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Civic Admin</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'phone' ? 'Sign in to your admin account' : `OTP sent to ${phone}`}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Mobile Number
              </label>
              <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors">
                <div className="px-3 flex items-center bg-gray-50 border-r-2 border-gray-200">
                  <span className="text-sm font-semibold text-gray-600">🇮🇳 +91</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number"
                  className="flex-1 px-3 py-3 text-sm outline-none text-gray-900"
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Sending…' : 'Get OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest outline-none focus:border-blue-500 text-gray-900"
                autoFocus
                maxLength={6}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Verifying…' : 'Verify & Sign In'}
            </button>
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-gray-400">Resend OTP in {countdown}s</p>
              ) : (
                <button
                  type="button"
                  onClick={sendOtp}
                  className="text-sm text-blue-600 font-semibold hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              ← Change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
