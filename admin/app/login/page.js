'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, isAdminUser, getErrorMessage } from '../../src/api/index';
import { useAuthStore } from '../../src/store/authStore';
import { useUiStore } from '../../src/store/uiStore';
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

      // `TokenResponse` already carries the user, so the second round-trip this
      // used to make — a raw `fetch` to /auth/me with a hand-built base URL and
      // its own Authorization header — was redundant and bypassed the client.
      const user = data.user;

      if (!isAdminUser(user)) {
        setError('Access denied. Administrator accounts only.');
        setLoading(false);
        return;
      }

      setSession(data.access_token, data.refresh_token, user);

      // The backend returns this when an account was bootstrapped or reset and
      // the password has not been rotated yet. The admin app has no
      // change-password screen, so say so rather than dropping the flag.
      if (data.must_change_password) {
        addToast(
          'Your password must be changed. Use the mobile app to set a new one.',
          'warning',
        );
      } else {
        addToast('Signed in successfully', 'success');
      }
      router.push('/dashboard');
    } catch (err) {
      const msg = getErrorMessage(err, 'Invalid OTP.');
      setError(msg);
      addToast(msg, 'error');
    }
    setLoading(false);
  };

  const bgClass = 'bg-canvas';
  const cardBg = 'bg-surface';
  const textColor = 'text-ink';
  const labelColor = 'text-ink-muted';
  const inputBg = 'bg-surface text-ink border-border';
  const errorColor = 'text-danger';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${bgClass} relative overflow-hidden transition-all duration-300`}>
      {/*
        This screen used to open with three drifting blur circles in blue,
        indigo and purple over a tri-stop gradient — a look the console behind
        it shares nothing with. Signing in should feel like the front door of
        the tool you are about to use, not a different product.

        What replaces it is one flat canvas and a single hairline rule under
        the card. The `float` keyframes went with the circles; `slideIn` stays,
        because a card that arrives is worth the 600ms and it respects the
        global reduced-motion block in globals.css.
      */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-in { animation: slideIn 0.4s ease-out forwards; }
      `}</style>

      {/* Main login card */}
      <div className={`${cardBg} rounded-card border border-border shadow-sm p-8 sm:p-10 w-full max-w-md mx-4 slide-in relative z-10`}>

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-4">
            <CivicLogo size="lg" showText={true} darkMode={false} />
          </div>
          <p className={`text-sm font-medium text-ink-muted`}>
            {step === 'phone' ? 'Admin Portal Sign In' : `Verification Code sent to ${maskPhone(phone)}`}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={sendOtp} className="space-y-6">
            <div>
              <label className={`block text-sm font-semibold ${labelColor} mb-2`}>
                Mobile Number
              </label>
              <div className={`flex border-2 rounded-xl overflow-hidden focus-within:border-primary focus-within:shadow-lg transition-all ${inputBg}`}>
                <div className={`px-4 flex items-center bg-surface-alt border-r-2 border-border`}>
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
              <div className={`p-3 rounded-lg bg-danger-soft border border-danger/30`}>
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

            <p className={`text-xs text-ink-subtle text-center`}>
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
                className={`w-full border-2 rounded-xl px-4 py-4 text-center text-3xl font-bold tracking-widest outline-none focus:border-primary focus:shadow-lg transition-all ${inputBg}`}
                autoFocus
                maxLength={6}
              />
            </div>

            {error && (
              <div className={`p-3 rounded-lg bg-danger-soft border border-danger/30`}>
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

            <div className={`text-center text-sm text-ink-muted`}>
              {countdown > 0 ? (
                <p>Resend OTP in <span className="font-semibold">{countdown}s</span></p>
              ) : (
                <button
                  type="button"
                  onClick={sendOtp}
                  className="text-primary font-semibold hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => { setStep('phone'); setPhone(''); setOtp(''); setError(''); }}
              className={`w-full text-sm font-medium text-ink-muted hover:text-ink transition-colors`}
            >
              ← Change number
            </button>
          </form>
        )}
      </div>

      {/* Footer info */}
      <div className={`mt-8 text-center text-sm text-ink-muted`}>
        <p>Secure access for administrators only</p>
      </div>
    </div>
  );
}
