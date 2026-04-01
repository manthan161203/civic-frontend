import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';
import { workersApi } from '../../src/api/workers';
import { rewardsApi } from '../../src/api/rewards';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function WorkerProfile() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [rewards, setRewards] = useState(null);

  useEffect(() => {
    Promise.all([
      workersApi.getStats(),
      workersApi.getShifts(),
      rewardsApi.getMyRewards(),
    ]).then(([s, sh, r]) => {
      setStats(s.data);
      setShifts(sh.data.items || sh.data);
      setRewards(r.data);
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'W'}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Worker'}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Worker</Text>
        </View>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{stats.completed_today || 0}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{rewards?.total_points || 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{stats.avg_rating ? `${stats.avg_rating.toFixed(1)}★` : '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      )}

      {/* Availability */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Accepting New Tasks</Text>
        <Switch
          value={isAvailable}
          onValueChange={async (val) => {
            await workersApi.setAvailability(val).catch(() => {});
            setIsAvailable(val);
          }}
          trackColor={{ false: '#d1d5db', true: '#6ee7b7' }}
          thumbColor={isAvailable ? '#059669' : '#9ca3af'}
        />
      </View>

      {/* Shifts */}
      <View style={[styles.card, { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
        <Text style={styles.cardTitle}>Weekly Shifts</Text>
        {DAYS.map((day) => {
          const shift = shifts.find((s) => s.day_of_week === day);
          return (
            <View key={day} style={styles.shiftRow}>
              <Text style={styles.dayText}>{day.charAt(0).toUpperCase() + day.slice(1, 3)}</Text>
              <Text style={[styles.shiftTime, !shift && { color: '#d1d5db' }]}>
                {shift ? `${shift.start_time} – ${shift.end_time}` : 'Off'}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.menu}>
        <MenuItem icon="trophy-outline" label="Leaderboard" onPress={() => router.push('/(worker)/leaderboard')} />
        <MenuItem icon="time-outline" label="Task History" onPress={() => router.push('/(worker)/history')} />
        <MenuItem icon="calendar-outline" label="Manage Shifts" onPress={() => router.push('/(worker)/shifts')} />
        <MenuItem icon="log-out-outline" label="Logout" onPress={handleLogout} danger />
      </View>

      <Text style={styles.version}>Civic Worker v1.0.0</Text>
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? '#ef4444' : '#374151'} />
      <Text style={[styles.menuLabel, danger && { color: '#ef4444' }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { alignItems: 'center', backgroundColor: '#059669', paddingTop: 32, paddingBottom: 28, gap: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, marginTop: 4 },
  roleText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 12, paddingVertical: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', color: '#059669' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#f3f4f6' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  shiftRow: { flexDirection: 'row', gap: 12, alignItems: 'center', width: '100%' },
  dayText: { width: 30, fontSize: 13, fontWeight: '700', color: '#374151' },
  shiftTime: { fontSize: 13, color: '#059669' },
  menu: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginTop: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  menuLabel: { flex: 1, fontSize: 15, color: '#111827' },
  version: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24, marginBottom: 32 },
});
