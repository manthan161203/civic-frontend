import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingButton from '../../src/components/LoadingButton';
import SvgIcon from '../../src/components/SvgIcon';
import { useUiStore } from '../../src/store/uiStore';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/auth';

export default function ResetPasswordScreen() {
  const { phone, code } = useLocalSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { addToast } = useUiStore();
  const { setSession } = useAuthStore();

  const validateForm = () => {
    const newErrors = {};

    if (form.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await authApi.resetPassword(phone, code, form.newPassword, form.confirmPassword);

      // Auto-login — root layout will route to the correct home based on role
      await setSession(response.data.access_token, response.data.refresh_token);
      addToast('Password reset successfully!', 'success');
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to reset password. Please try again.';
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#f0f9ff', '#e0f2fe']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <SvgIcon name="checkCircle" size={48} color="#16a34a" />
            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>Your OTP has been verified. Set a new password below.</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* New Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={[styles.inputWrapper, errors.newPassword && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Min. 8 characters"
                  value={form.newPassword}
                  onChangeText={(text) => setForm((f) => ({ ...f, newPassword: text }))}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <SvgIcon name={showPassword ? 'eye' : 'eyeOff'} size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
              {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChangeText={(text) => setForm((f) => ({ ...f, confirmPassword: text }))}
                  secureTextEntry={!showConfirm}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <SvgIcon name={showConfirm ? 'eye' : 'eyeOff'} size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* Submit Button */}
            <LoadingButton
              onPress={handleResetPassword}
              isLoading={loading}
              style={styles.submitButton}
              variant="primary"
              size="lg"
            >
              Reset Password
            </LoadingButton>

            {/* Back to Login */}
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.backButton}>
              <SvgIcon name="chevronLeft" size={20} color="#2563eb" />
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fee2e2',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    marginTop: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  backText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
