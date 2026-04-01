import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '../../src/api/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp(`+91${cleaned}`);
      router.push({ pathname: '/(auth)/otp', params: { phone: `+91${cleaned}` } });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send OTP. Try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>C</Text>
          </View>
          <Text style={styles.appName}>Civic</Text>
          <Text style={styles.tagline}>Report. Track. Resolve.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter 10-digit number"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSendOtp}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Sending…' : 'Get OTP'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          By continuing you agree to our Terms of Service
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1a56db', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  logoText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  appName: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: 1 },
  tagline: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  phoneRow: { flexDirection: 'row', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, overflow: 'hidden' },
  countryCode: {
    paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRightWidth: 1, borderRightColor: '#d1d5db',
  },
  countryCodeText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  phoneInput: { flex: 1, height: 50, paddingHorizontal: 14, fontSize: 16, color: '#111827' },
  btn: {
    height: 50, backgroundColor: '#1a56db', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 32 },
});
