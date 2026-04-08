import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingButton from '../../src/components/LoadingButton';
import SvgIcon from '../../src/components/SvgIcon';
import { useUiStore } from '../../src/store/uiStore';
import { authApi } from '../../src/api/auth';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState('input'); // 'input' or 'otp'
  const [phone, setPhone] = useState(''); // always phone — reset OTP is sent to phone
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();
  const { addToast } = useUiStore();

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setErrors({ phone: 'Enter a valid 10-digit mobile number' });
      return;
    }
    const normalizedPhone = '+91' + cleaned;

    setLoading(true);
    try {
      await authApi.forgotPassword(normalizedPhone);
      addToast('OTP sent! Check your phone.', 'success');
      setStep('otp');
      setCountdown(60);
      setErrors({});

      // Countdown timer
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) clearInterval(timer);
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      addToast('Failed to send OTP. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const numValue = value.replace(/[^0-9]/g, '').slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = numValue;
    setOtp(newOtp);

    // Auto-move to next field
    if (numValue && index < 5) {
      // Focus next field (would need ref implementation)
    }

    // Auto-submit when all fields filled
    if (numValue && index === 5 && newOtp.every((o) => o)) {
      handleVerifyOtp();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setErrors({ otp: 'Enter all 6 digits' });
      return;
    }

    // Navigate to reset-password screen with phone and code
    const normalizedPhone = '+91' + phone.replace(/\D/g, '');
    router.push({
      pathname: '/(auth)/reset-password',
      params: { phone: normalizedPhone, code },
    });
  };

  const handleResend = async () => {
    setLoading(true);
    const normalizedPhone = '+91' + phone.replace(/\D/g, '');
    try {
      await authApi.forgotPassword(normalizedPhone);
      addToast('OTP resent!', 'success');
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);

      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) clearInterval(timer);
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      addToast('Failed to resend OTP. Please try again.', 'error');
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
            <SvgIcon name="alertCircle" size={48} color="#2563eb" />
            <Text style={styles.title}>Reset Password</Text>
            {step === 'input' && (
              <Text style={styles.subtitle}>Enter your registered mobile number to receive an OTP</Text>
            )}
            {step === 'otp' && (
              <Text style={styles.subtitle}>Enter the 6-digit code sent to your phone</Text>
            )}
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {step === 'input' ? (
              <>
                {/* Phone Input */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Mobile Number</Text>
                  <View style={[styles.phoneRow, errors.phone && styles.inputErrorBorder]}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="10-digit number"
                      value={phone}
                      onChangeText={(text) => {
                        setPhone(text.replace(/\D/g, '').slice(0, 10));
                        setErrors({});
                      }}
                      keyboardType="phone-pad"
                      maxLength={10}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                </View>

                {/* Send OTP Button */}
                <LoadingButton
                  onPress={handleSendOtp}
                  isLoading={loading}
                  style={styles.submitButton}
                  variant="primary"
                  size="lg"
                >
                  Send OTP
                </LoadingButton>

                {/* Back to Login */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <SvgIcon name="chevronLeft" size={20} color="#2563eb" />
                  <Text style={styles.backText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* OTP Input */}
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      style={[styles.otpInput, errors.otp && styles.otpInputError]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(index, value)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                    />
                  ))}
                </View>
                {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}

                {/* Verify Button */}
                <LoadingButton
                  onPress={handleVerifyOtp}
                  isLoading={loading}
                  style={styles.submitButton}
                  variant="primary"
                  size="lg"
                >
                  Verify OTP
                </LoadingButton>

                {/* Resend Button */}
                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn't receive the code? </Text>
                  {countdown > 0 ? (
                    <Text style={styles.countdownText}>Resend in {countdown}s</Text>
                  ) : (
                    <TouchableOpacity onPress={handleResend} disabled={loading}>
                      <Text style={[styles.resendLink, loading && styles.resendLinkDisabled]}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
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
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  fullInput: {
    width: '100%',
    fontSize: 14,
    color: '#1f2937',
  },
  inputErrorBorder: {
    borderColor: '#fca5a5',
    backgroundColor: '#fee2e2',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    marginTop: 20,
  },
  phoneRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9fafb',
  },
  countryCode: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: {
    width: '15%',
    height: 56,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  otpInputError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fee2e2',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#6b7280',
  },
  resendLink: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
  countdownText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 14,
  },
});
