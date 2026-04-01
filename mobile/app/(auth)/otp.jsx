import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();
  const { setSession, user } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

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
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp(phone, code);
      await setSession(data.access_token, data.refresh_token);
      // Route based on role after store updates user
      // useAuthStore will trigger _layout re-render which routes to correct tab
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid OTP. Please try again.';
      Alert.alert('Error', msg);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await authApi.sendOtp(phone);
      setCountdown(60);
      Alert.alert('Sent', 'A new OTP has been sent to ' + phone);
    } catch {
      Alert.alert('Error', 'Could not resend OTP.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.phone}>{phone}</Text>
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

        {loading && (
          <Text style={styles.verifying}>Verifying…</Text>
        )}

        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={styles.timer}>Resend OTP in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={resend}>
              <Text style={styles.resendBtn}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, paddingHorizontal: 28, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { fontSize: 16, color: '#1a56db', fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', lineHeight: 22, marginBottom: 36 },
  phone: { fontWeight: '700', color: '#111827' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  otpBox: {
    width: 46, height: 56, borderWidth: 1.5, borderColor: '#d1d5db',
    borderRadius: 10, textAlign: 'center', fontSize: 22, fontWeight: '700',
    color: '#111827',
  },
  otpBoxFilled: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  verifying: { textAlign: 'center', color: '#1a56db', fontWeight: '600' },
  resendRow: { alignItems: 'center', marginTop: 8 },
  timer: { color: '#9ca3af', fontSize: 14 },
  resendBtn: { color: '#1a56db', fontWeight: '700', fontSize: 14 },
});
