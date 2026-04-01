import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';

export default function AadharScreen() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [step, setStep] = useState('input'); // 'input' | 'otp'
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatAadhaar = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handleSendOtp = async () => {
    const digits = aadhaar.replace(/\D/g, '');
    if (digits.length !== 12) {
      Alert.alert('Invalid Aadhaar', 'Please enter your 12-digit Aadhaar number.');
      return;
    }
    setLoading(true);
    try {
      await authApi.sendAadharOtp(digits);
      setStep('otp');
      setCountdown(60);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to send OTP. Try again.');
    }
    setLoading(false);
  };

  const handleChange = (text, index) => {
    const updated = [...otp];
    updated[index] = text;
    setOtp(updated);
    if (text && index < 5) inputs.current[index + 1]?.focus();
    if (updated.every((d) => d !== '')) {
      verifyOtp(updated.join(''));
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async (code) => {
    const digits = aadhaar.replace(/\D/g, '');
    setLoading(true);
    try {
      const { data } = await authApi.verifyAadhar(digits, code);
      await setSession(data.access_token, data.refresh_token);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
    setLoading(false);
  };

  const resend = async () => {
    const digits = aadhaar.replace(/\D/g, '');
    try {
      await authApi.sendAadharOtp(digits);
      setCountdown(60);
      Alert.alert('Sent', 'A new OTP has been sent to your registered mobile.');
    } catch {
      Alert.alert('Error', 'Could not resend OTP.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <View style={styles.aadhaarBadge}>
            <Text style={styles.aadhaarBadgeText}>ID</Text>
          </View>
        </View>

        {step === 'input' ? (
          <>
            <Text style={styles.title}>Aadhaar Login</Text>
            <Text style={styles.subtitle}>
              Enter your 12-digit Aadhaar number. An OTP will be sent to your registered mobile.
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>Aadhaar Number</Text>
              <TextInput
                style={styles.input}
                placeholder="XXXX XXXX XXXX"
                keyboardType="numeric"
                value={aadhaar}
                onChangeText={(t) => setAadhaar(formatAadhaar(t))}
                maxLength={14}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                <Text style={styles.btnText}>{loading ? 'Sending OTP…' : 'Send OTP'}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              OTP sent to your Aadhaar-registered mobile for{'\n'}
              <Text style={styles.highlight}>{aadhaar}</Text>
            </Text>

            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => (inputs.current[i] = r)}
                  style={[styles.otpBox, digit && styles.otpBoxFilled]}
                  keyboardType="numeric"
                  maxLength={1}
                  value={digit}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  selectTextOnFocus
                  autoFocus={i === 0}
                />
              ))}
            </View>

            {loading && <Text style={styles.verifying}>Verifying…</Text>}

            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <Text style={styles.timer}>Resend OTP in {countdown}s</Text>
              ) : (
                <TouchableOpacity onPress={resend}>
                  <Text style={styles.resendBtn}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={() => { setStep('input'); setOtp(['','','','','','']); }}>
              <Text style={styles.changeAadhaar}>Use different Aadhaar</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.disclaimer}>
          Your Aadhaar data is used only for identity verification and is never stored.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  back: { marginBottom: 24 },
  backText: { fontSize: 16, color: '#1a56db', fontWeight: '600' },
  logoRow: { alignItems: 'center', marginBottom: 24 },
  aadhaarBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center',
  },
  aadhaarBadgeText: { fontSize: 32 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 28 },
  highlight: { fontWeight: '700', color: '#111827' },
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: {
    height: 52, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 16, fontSize: 18, color: '#111827',
    letterSpacing: 2, fontWeight: '600',
  },
  btn: {
    height: 50, backgroundColor: '#f59e0b', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 },
  otpBox: {
    width: 46, height: 56, borderWidth: 1.5, borderColor: '#d1d5db',
    borderRadius: 10, textAlign: 'center', fontSize: 22, fontWeight: '700', color: '#111827',
  },
  otpBoxFilled: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  verifying: { textAlign: 'center', color: '#f59e0b', fontWeight: '600', marginBottom: 8 },
  resendRow: { alignItems: 'center', marginBottom: 12 },
  timer: { color: '#9ca3af', fontSize: 14 },
  resendBtn: { color: '#f59e0b', fontWeight: '700', fontSize: 14 },
  changeAadhaar: { textAlign: 'center', color: '#1a56db', fontSize: 13, fontWeight: '600', marginTop: 8 },
  disclaimer: {
    textAlign: 'center', color: '#9ca3af', fontSize: 12,
    lineHeight: 18, marginTop: 32, paddingHorizontal: 8,
  },
});
