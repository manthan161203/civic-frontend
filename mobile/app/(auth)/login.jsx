import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, Animated, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';
import { useUiStore } from '../../src/store/uiStore';
import CivicLogo from '../../src/components/CivicLogo';
import LoadingButton from '../../src/components/LoadingButton';
import SvgIcon from '../../src/components/SvgIcon';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const { addToast } = useUiStore();
  const [phone, setPhone] = useState('');
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

            {/* Phone Input */}
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

            {/* Get OTP Button */}
            <LoadingButton
              isLoading={loading}
              onPress={handleSendOtp}
              variant="primary"
              size="lg"
              loadingText="Sending..."
              style={styles.btn}
            >
              Get OTP
            </LoadingButton>

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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
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
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 24,
  },
});
