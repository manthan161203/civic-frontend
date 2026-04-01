import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { workersApi } from '../../src/api/workers';
import { useAuthStore } from '../../src/store/authStore';

function StatCard({ label, value, icon, color }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.statVal}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function WorkerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = async () => {
    try {
      const [statsRes, tasksRes] = await Promise.all([
        workersApi.getStats(),
        workersApi.getTasks(),
      ]);
      setStats(statsRes.data);
      const taskList = tasksRes.data.items || tasksRes.data;
      setTasks(taskList);
      // Derive online status from user or tasks
      setIsOnline(user?.is_online ?? false);
    } catch {}
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleOnline = async (val) => {
    setToggling(true);
    try {
      await workersApi.setStatus(val);
      setIsOnline(val);
    } catch {}
    setToggling(false);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#059669" size="large" />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
    >
      {/* Online Toggle */}
      <View style={styles.onlineCard}>
        <View>
          <Text style={styles.onlineLabel}>Duty Status</Text>
          <Text style={styles.onlineDesc}>
            {isOnline ? '🟢 Online — accepting tasks' : '🔴 Offline'}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={toggleOnline}
          disabled={toggling}
          trackColor={{ false: '#d1d5db', true: '#6ee7b7' }}
          thumbColor={isOnline ? '#059669' : '#9ca3af'}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard label="Assigned" value={stats?.assigned_today} icon="briefcase" color="#1a56db" />
        <StatCard label="Completed" value={stats?.completed_today} icon="checkmark-circle" color="#059669" />
        <StatCard label="Pending" value={stats?.pending} icon="time" color="#f59e0b" />
        <StatCard label="Avg Rating" value={stats?.avg_rating ? `${stats.avg_rating.toFixed(1)}★` : '—'} icon="star" color="#f59e0b" />
      </View>

      {/* Active Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Tasks</Text>
          <TouchableOpacity onPress={() => router.push('/(worker)/tasks')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {tasks.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>No active tasks</Text>
          </View>
        ) : (
          tasks.slice(0, 3).map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => router.push(`/task/${task.id}`)}
            >
              <View style={styles.taskLeft}>
                <View style={[styles.priorityBar, {
                  backgroundColor: task.priority === 'critical' ? '#7c3aed'
                    : task.priority === 'high' ? '#ef4444'
                    : task.priority === 'medium' ? '#f59e0b' : '#10b981',
                }]} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle} numberOfLines={2}>{task.description}</Text>
                  <Text style={styles.taskMeta}>
                    {task.issue_type?.replace('_', ' ')} · {task.address || 'Location unknown'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  onlineCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  onlineLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  onlineDesc: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, borderLeftWidth: 4, alignItems: 'flex-start', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
    elevation: 2,
  },
  statVal: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  section: { backgroundColor: '#fff', marginTop: 12, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 13, color: '#059669', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  taskCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  taskLeft: { flexDirection: 'row', flex: 1, gap: 10, alignItems: 'center' },
  priorityBar: { width: 4, height: 44, borderRadius: 2 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  taskMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2, textTransform: 'capitalize' },
});
