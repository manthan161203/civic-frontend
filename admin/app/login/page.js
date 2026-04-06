'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../src/api/index';
import { useAuthStore } from '../../src/store/authStore';
import { useUiStore } from '../../src/store/uiStore';
import { getErrorMessage } from '../../src/lib/apiError';
import CivicLogo from '../../src/components/ui/CivicLogo';
import LoadingButton from '../../src/components/ui/LoadingButton';
import SvgIcon from '../../src/components/ui/SvgIcon';

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const { addToast } = useUiStore();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const maskPhone = (phoneNumber) => {
    if (!phoneNumber) return '';
    // Show only last 4 digits, e.g., "+91****1203"
    return phoneNumber.slice(0, 3) + '****' + phoneNumber.slice(-4);
  };

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
      addToast('OTP sent successfully', 'success');
      startCountdown();
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to send OTP.');
      setError(msg);
      addToast(msg, 'error');
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
      if (!meRes.ok) throw new Error('Failed to fetch user profile');
      const user = await meRes.json();
      if (!user.role?.includes('admin') && user.role !== 'admin') {
        setError('Access denied. Admin accounts only.');
        setLoading(false);
        return;
      }
      setSession(data.access_token, data.refresh_token, user);
      addToast('Signed in successfully', 'success');
      router.push('/dashboard');
    } catch (err) {
      const msg = getErrorMessage(err, 'Invalid OTP.');
      setError(msg);
      addToast(msg, 'error');
    }
    setLoading(false);
  };

  const bgClass = 'bg-gradient-to-br from-blue-50 via-white to-indigo-50';
  const cardBg = 'bg-white';
  const textColor = 'text-gray-900';
  const labelColor = 'text-gray-700';
  const inputBg = 'bg-white text-gray-900 border-gray-200';
  const errorColor = 'text-red-500';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${bgClass} relative overflow-hidden transition-all duration-300`}>
      {/* Animated background elements */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .float-element {
          animation: float 6s ease-in-out infinite;
        }
        .slide-in {
          animation: slideIn 0.6s ease-out forwards;
        }
      `}</style>

      {/* Floating background circles */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 float-element"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 float-element" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/3 w-56 h-56 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 float-element" style={{ animationDelay: '4s' }}></div>


      {/* Main login card */}
      <div className={`${cardBg} rounded-3xl shadow-2xl p-8 sm:p-10 w-full max-w-md mx-4 backdrop-blur-xl border border-white/10 slide-in relative z-10`}>

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-4">
            <CivicLogo size="lg" showText={true} darkMode={false} />
          </div>
          <p className={`text-sm font-medium text-gray-600`}>
            {step === 'phone' ? 'Admin Portal Sign In' : `Verification Code sent to ${maskPhone(phone)}`}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={sendOtp} className="space-y-6">
            <div>
              <label className={`block text-sm font-semibold ${labelColor} mb-2`}>
                Mobile Number
              </label>
              <div className={`flex border-2 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:shadow-lg transition-all ${inputBg}`}>
                <div className={`px-4 flex items-center bg-gray-50 border-r-2 border-gray-200`}>
                  <span className={`text-sm font-semibold ${labelColor}`}>+91</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number"
                  className={`flex-1 px-4 py-3 text-sm outline-none bg-transparent ${textColor} placeholder-gray-400`}
                  maxLength={10}
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className={`p-3 rounded-lg bg-red-50 border border-red-200`}>
                <p className={`text-sm ${errorColor}`}>{error}</p>
              </div>
            )}

            <LoadingButton
              type="submit"
              isLoading={loading}
              variant="primary"
              className="w-full"
              loadingText="Sending..."
            >
              Get OTP
            </LoadingButton>

            <p className={`text-xs text-gray-500 text-center`}>
              Admin-only login. Your credentials are secure.
            </p>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-6">
            <div>
              <label className={`block text-sm font-semibold ${labelColor} mb-2`}>
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                className={`w-full border-2 rounded-xl px-4 py-4 text-center text-3xl font-bold tracking-widest outline-none focus:border-blue-500 focus:shadow-lg transition-all ${inputBg}`}
                autoFocus
                maxLength={6}
              />
            </div>

            {error && (
              <div className={`p-3 rounded-lg bg-red-50 border border-red-200`}>
                <p className={`text-sm ${errorColor}`}>{error}</p>
              </div>
            )}

            <LoadingButton
              type="submit"
              isLoading={loading}
              variant="primary"
              className="w-full"
              loadingText="Verifying..."
            >
              Verify & Sign In
            </LoadingButton>

            <div className={`text-center text-sm text-gray-600`}>
              {countdown > 0 ? (
                <p>Resend OTP in <span className="font-semibold">{countdown}s</span></p>
              ) : (
                <button
                  type="button"
                  onClick={sendOtp}
                  className="text-blue-500 font-semibold hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => { setStep('phone'); setPhone(''); setOtp(''); setError(''); }}
              className={`w-full text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors`}
            >
              ← Change number
            </button>
          </form>
        )}
      </div>

      {/* Footer info */}
      <div className={`mt-8 text-center text-sm text-gray-600`}>
        <p>Secure access for administrators only</p>
      </div>
    </div>
  );
}
