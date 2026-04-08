import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingButton from '../../src/components/LoadingButton';
import CivicLogo from '../../src/components/CivicLogo';
import SvgIcon from '../../src/components/SvgIcon';
import { useUiStore } from '../../src/store/uiStore';
import { authApi } from '../../src/api/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const { addToast } = useUiStore();
  const [form, setForm] = useState({ phone: '', name: '', email: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (form.phone.replace(/\D/g, '').length !== 10) e.phone = 'Enter a valid 10-digit number';
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.password.length < 8) e.password = 'At least 8 characters required';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const phone = '+91' + form.phone.replace(/\D/g, '');
      await authApi.register({
        phone,
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirmPassword,
      });
      addToast('Account created! Please log in.', 'success');
      router.replace('/(auth)/login');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Please try again.';
      if (msg.toLowerCase().includes('phone')) setErrors((e) => ({ ...e, phone: msg }));
      else if (msg.toLowerCase().includes('email')) setErrors((e) => ({ ...e, email: msg }));
      else addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#dbeafe', '#f0f9ff', '#e0f2fe']} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.logoBox}>
            <CivicLogo size="lg" showText darkMode={false} />
            <Text style={styles.tagline}>Report. Track. Resolve.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create Account</Text>

            {/* Phone */}
            <Text style={styles.label}>Mobile Number</Text>
            <View style={[styles.phoneRow, errors.phone && styles.fieldErr]}>
              <View style={styles.prefix}><Text style={styles.prefixText}>+91</Text></View>
              <TextInput
                style={styles.phoneInput}
                placeholder="10-digit number"
                value={form.phone}
                onChangeText={(t) => update('phone', t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor="#9ca3af"
              />
            </View>
            {errors.phone && <Text style={styles.errText}>{errors.phone}</Text>}

            {/* Name */}
            <Text style={[styles.label, { marginTop: 14 }]}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.fieldErr]}
              placeholder="Enter your full name"
              value={form.name}
              onChangeText={(t) => update('name', t)}
              placeholderTextColor="#9ca3af"
            />
            {errors.name && <Text style={styles.errText}>{errors.name}</Text>}

            {/* Email */}
            <Text style={[styles.label, { marginTop: 14 }]}>Email Address</Text>
            <TextInput
              style={[styles.input, errors.email && styles.fieldErr]}
              placeholder="your@email.com"
              value={form.email}
              onChangeText={(t) => update('email', t)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
            />
            {errors.email && <Text style={styles.errText}>{errors.email}</Text>}

            {/* Password */}
            <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
            <View style={[styles.pwRow, errors.password && styles.fieldErr]}>
              <TextInput
                style={styles.pwInput}
                placeholder="Min. 8 characters"
                value={form.password}
                onChangeText={(t) => update('password', t)}
                secureTextEntry={!showPw}
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eye}>
                <SvgIcon name={showPw ? 'eye' : 'eyeOff'} size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errText}>{errors.password}</Text>}

            {/* Confirm Password */}
            <Text style={[styles.label, { marginTop: 14 }]}>Confirm Password</Text>
            <View style={[styles.pwRow, errors.confirmPassword && styles.fieldErr]}>
              <TextInput
                style={styles.pwInput}
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChangeText={(t) => update('confirmPassword', t)}
                secureTextEntry={!showConfirm}
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eye}>
                <SvgIcon name={showConfirm ? 'eye' : 'eyeOff'} size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errText}>{errors.confirmPassword}</Text>}

            <LoadingButton
              onPress={handleRegister}
              isLoading={loading}
              variant="primary"
              size="lg"
              loadingText="Creating account…"
              style={{ marginTop: 20 }}
            >
              Create Account
            </LoadingButton>

            <View style={styles.signinRow}>
              <Text style={styles.signinText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.signinLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  logoBox: { alignItems: 'center', marginBottom: 28 },
  tagline: { fontSize: 13, color: '#4b5563', fontWeight: '500', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 7 },
  input: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  fieldErr: { borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  errText: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  phoneRow: { flexDirection: 'row', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, overflow: 'hidden', backgroundColor: '#f9fafb' },
  prefix: { paddingHorizontal: 14, justifyContent: 'center', backgroundColor: '#f3f4f6', borderRightWidth: 1, borderRightColor: '#d1d5db' },
  prefixText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  phoneInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },
  pwRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 12, backgroundColor: '#f9fafb' },
  pwInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },
  eye: { paddingHorizontal: 12 },
  signinRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  signinText: { fontSize: 14, color: '#6b7280' },
  signinLink: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
});
