import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { useRouter } from 'expo-router';

const ADMIN_PANEL_URL = process.env.EXPO_PUBLIC_ADMIN_URL || 'http://localhost:3000';

const ROLE_LABELS = {
  ward_admin: 'Ward Admin',
  taluka_admin: 'Taluka Admin',
  district_admin: 'District Admin',
  admin: 'Super Admin',
};

export default function AdminBlockedScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const openAdminPanel = () => {
    Linking.openURL(ADMIN_PANEL_URL).catch(() => {});
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const roleLabel = ROLE_LABELS[user?.role] || user?.role || 'Admin';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark" size={56} color="#1a56db" />
        </View>

        <Text style={styles.title}>Admin Access Detected</Text>
        <Text style={styles.subtitle}>
          You're signed in as <Text style={styles.roleText}>{roleLabel}</Text>.
        </Text>
        <Text style={styles.body}>
          The mobile app is for citizens and field workers only. Please use the{' '}
          <Text style={styles.linkText}>Civic Admin Web Panel</Text> to manage issues, workers,
          and analytics.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={openAdminPanel} activeOpacity={0.85}>
          <Ionicons name="open-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Open Admin Panel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#6b7280" style={{ marginRight: 8 }} />
          <Text style={styles.secondaryBtnText}>Sign Out</Text>
        </TouchableOpacity>

        {user?.name && (
          <Text style={styles.footer}>Signed in as {user.name}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  roleText: {
    fontWeight: '700',
    color: '#1a56db',
  },
  body: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  linkText: {
    color: '#1a56db',
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a56db',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryBtnText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 15,
  },
  footer: {
    marginTop: 20,
    fontSize: 12,
    color: '#9ca3af',
  },
});
