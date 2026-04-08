import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';
import { useUiStore } from '../../src/store/uiStore';
import CivicLogo from '../../src/components/CivicLogo';
import LoadingButton from '../../src/components/LoadingButton';
import SvgIcon from '../../src/components/SvgIcon';


export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const { addToast } = useUiStore();
  const [activeTab, setActiveTab] = useState('otp'); // 'otp' or 'password'
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, bounciness: 8 }),
      Animated.parallel([
        Animated.timing(formAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      addToast('Please enter a 10-digit mobile number', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.sendOtp(`+91${cleaned}`);
      addToast('OTP sent successfully', 'success');
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: `+91${cleaned}`, devOtp: data?.dev_otp ?? '' },
      });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to send OTP. Try again.';
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    let id = identifier.trim();
    if (!id || !password) {
      addToast('Please enter email/phone and password', 'error');
      return;
    }

    // If it's a 10-digit phone number, add +91 prefix
    const cleanedPhone = id.replace(/\D/g, '');
    if (cleanedPhone.length === 10 && !id.includes('@')) {
      id = '+91' + cleanedPhone;
    }

    setLoading(true);
    try {
      const response = await authApi.loginWithPassword(id, password);
      await setSession(response.data.access_token, response.data.refresh_token);
      addToast('Login successful!', 'success');
      // Root layout will handle routing based on mustChangePassword and profile completion
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Login failed. Please try again.';
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#dbeafe', '#f0f9ff', '#e0f2fe']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>

          {/* Logo */}
          <Animated.View style={[styles.logoBox, { transform: [{ scale: logoAnim }] }]}>
            <CivicLogo size="lg" showText={true} darkMode={false} />
            <Text style={styles.tagline}>Report. Track. Resolve.</Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View style={[
            styles.card,
            { opacity: formOpacity, transform: [{ translateY: formAnim }] }
          ]}>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'otp' && styles.tabActive]}
                onPress={() => setActiveTab('otp')}
              >
                <Text style={[styles.tabText, activeTab === 'otp' && styles.tabTextActive]}>
                  Mobile OTP
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'password' && styles.tabActive]}
                onPress={() => setActiveTab('password')}
              >
                <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>
                  Password
                </Text>
              </TouchableOpacity>
            </View>

            {/* OTP Tab Content */}
            {activeTab === 'otp' && (
              <View>
                <Text style={styles.otpHint}>New or existing user — just enter your number</Text>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholderTextColor="#9ca3af"
                    placeholder="10-digit number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                  />
                </View>

                <LoadingButton
                  isLoading={loading}
                  onPress={handleSendOtp}
                  variant="primary"
                  size="lg"
                  loadingText="Sending..."
                  style={styles.btn}
                >
                  Send OTP
                </LoadingButton>
              </View>
            )}

            {/* Password Tab Content */}
            {activeTab === 'password' && (
              <View>
                <Text style={styles.label}>Email or Phone</Text>
                <TextInput
                  style={[styles.input, styles.fullInput]}
                  placeholderTextColor="#9ca3af"
                  placeholder="email@example.com or 10-digit phone"
                  keyboardType="default"
                  value={identifier}
                  onChangeText={setIdentifier}
                />

                <Text style={[styles.label, styles.labelTop]}>Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholderTextColor="#9ca3af"
                    placeholder="Enter password"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <SvgIcon name={showPassword ? 'eye' : 'eyeOff'} size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text style={styles.forgotLink}>Forgot Password?</Text>
                </TouchableOpacity>

                <LoadingButton
                  isLoading={loading}
                  onPress={handlePasswordLogin}
                  variant="primary"
                  size="lg"
                  loadingText="Signing in..."
                  style={styles.btn}
                >
                  Sign In
                </LoadingButton>

                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>New here? </Text>
                  <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                    <Text style={styles.registerLink}>Create a password account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Aadhaar Button */}
            <TouchableOpacity
              style={styles.aadhaarBtn}
              onPress={() => router.push('/(auth)/aadhar')}
              activeOpacity={0.8}
            >
              <View style={styles.aadhaarContent}>
                <SvgIcon name="eye" size={18} color="#92400e" strokeWidth={2} />
                <Text style={styles.aadhaarText}>Login with Aadhaar</Text>
              </View>
            </TouchableOpacity>

          </Animated.View>

          {/* Footer */}
          <Text style={styles.footer}>By continuing you agree to our Terms of Service</Text>

        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoBox: {
    alignItems: 'center',
    marginBottom: 32,
  },
  tagline: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
    color: '#4b5563',
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#2563eb',
  },
  otpHint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 14,
    textAlign: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  labelTop: {
    marginTop: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  countryCode: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  phoneInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  fullInput: {
    width: '100%',
    marginBottom: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    alignItems: 'center',
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotLink: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textDecorationLine: 'underline',
  },
  btn: {
    marginBottom: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
    marginHorizontal: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  aadhaarBtn: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  aadhaarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aadhaarText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
    marginLeft: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  registerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  registerLink: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 24,
  },
});
