import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingButton from '../../src/components/LoadingButton';
import SvgIcon from '../../src/components/SvgIcon';
import { useUiStore } from '../../src/store/uiStore';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/auth';

export default function ChangePasswordScreen() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { addToast } = useUiStore();
  const { mustChangePassword, setMustChangePassword, user } = useAuthStore();

  // Prevent back navigation if this is forced change
  useEffect(() => {
    if (!mustChangePassword) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('Cannot Go Back', 'You must change your password to continue using the app.');
      return true;
    });

    return () => subscription.remove();
  }, [mustChangePassword]);

  const validateForm = () => {
    const newErrors = {};

    // Current password (skip for forced change)
    if (!mustChangePassword && !form.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    // New password
    if (form.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    // Confirm password
    if (form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await authApi.changePassword(
        mustChangePassword ? null : form.currentPassword,
        form.newPassword,
        form.confirmPassword
      );

      setMustChangePassword(false);
      addToast('Password changed successfully!', 'success');
      router.replace(user?.role === 'worker' ? '/(worker)/' : '/(citizen)/');
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to change password. Please try again.';
      addToast(message, 'error');
      if (message.includes('Current password')) {
        setErrors({ currentPassword: 'Current password is incorrect' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#f0f9ff', '#e0f2fe']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <SvgIcon name="checkCircle" size={48} color="#2563eb" />
          <Text style={styles.title}>
            {mustChangePassword ? 'Set Your Password' : 'Change Password'}
          </Text>
          {mustChangePassword && (
            <Text style={styles.subtitle}>
              Welcome! Please set a secure password to activate your account.
            </Text>
          )}
        </View>

        {/* Warning Banner (if forced) */}
        {mustChangePassword && (
          <View style={styles.warningBanner}>
            <SvgIcon name="alertCircle" size={20} color="#d97706" />
            <Text style={styles.warningText}>
              You must set a password before you can access your account.
            </Text>
          </View>
        )}

        {/* Form Card */}
        <View style={styles.card}>
          {/* Current Password (skip for forced change) */}
          {!mustChangePassword && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Current Password</Text>
              <View style={[styles.inputWrapper, errors.currentPassword && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter current password"
                  value={form.currentPassword}
                  onChangeText={(text) => setForm((f) => ({ ...f, currentPassword: text }))}
                  secureTextEntry={!showCurrent}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                  <SvgIcon name={showCurrent ? 'eye' : 'eyeOff'} size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
              {errors.currentPassword && <Text style={styles.errorText}>{errors.currentPassword}</Text>}
            </View>
          )}

          {/* New Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={[styles.inputWrapper, errors.newPassword && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Min. 8 characters"
                value={form.newPassword}
                onChangeText={(text) => setForm((f) => ({ ...f, newPassword: text }))}
                secureTextEntry={!showNew}
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <SvgIcon name={showNew ? 'eye' : 'eyeOff'} size={20} color="#6b7280" />
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
            onPress={handleChangePassword}
            isLoading={loading}
            style={styles.submitButton}
            variant="primary"
            size="lg"
          >
            {mustChangePassword ? 'Activate Account' : 'Change Password'}
          </LoadingButton>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
    alignItems: 'center',
  },
  warningText: {
    color: '#b45309',
    marginLeft: 12,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
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
});
