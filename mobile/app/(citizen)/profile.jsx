import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { rewardsApi } from '../../src/api/rewards';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rewardsApi.getMyRewards()
      .then(({ data }) => setRewards(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Civic User'}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || 'citizen'}</Text>
        </View>
      </View>

      {/* Rewards Summary */}
      {!loading && rewards && (
        <View style={styles.rewardsCard}>
          <View style={styles.rewardItem}>
            <Text style={styles.rewardVal}>{rewards.total_points || 0}</Text>
            <Text style={styles.rewardLabel}>Points</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.rewardItem}>
            <Text style={styles.rewardVal}>#{rewards.rank || '—'}</Text>
            <Text style={styles.rewardLabel}>Rank</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.rewardItem}>
            <Text style={styles.rewardVal}>{rewards.badges?.length || 0}</Text>
            <Text style={styles.rewardLabel}>Badges</Text>
          </View>
        </View>
      )}

      {/* Menu */}
      <View style={styles.menu}>
        <MenuItem icon="trophy-outline" label="Leaderboard" onPress={() => router.push('/(citizen)/leaderboard')} />
        <MenuItem icon="chatbubble-ellipses-outline" label="AI Assistant" onPress={() => router.push('/(citizen)/chat')} />
        <MenuItem icon="notifications-outline" label="Subscriptions" onPress={() => {}} />
        <MenuItem icon="person-outline" label="Edit Profile" onPress={() => {}} />
      </View>

      <View style={[styles.menu, { marginTop: 12 }]}>
        <MenuItem icon="log-out-outline" label="Logout" onPress={handleLogout} danger />
      </View>

      <Text style={styles.version}>Civic v1.0.0</Text>
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? '#ef4444' : '#374151'} />
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    alignItems: 'center', backgroundColor: '#1a56db',
    paddingTop: 32, paddingBottom: 28, gap: 6,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, marginTop: 4 },
  roleText: { fontSize: 12, color: '#fff', fontWeight: '600', textTransform: 'capitalize' },
  rewardsCard: {
    flexDirection: 'row', backgroundColor: '#fff', margin: 16,
    borderRadius: 12, paddingVertical: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  rewardItem: { flex: 1, alignItems: 'center' },
  rewardVal: { fontSize: 22, fontWeight: '800', color: '#1a56db' },
  rewardLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  divider: { width: 1, backgroundColor: '#f3f4f6' },
  menu: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  menuLabel: { flex: 1, fontSize: 15, color: '#111827' },
  menuLabelDanger: { color: '#ef4444' },
  version: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24, marginBottom: 32 },
});
