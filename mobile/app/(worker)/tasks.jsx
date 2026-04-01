import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { workersApi } from '../../src/api/workers';
import { formatDate } from '../../src/utils/dateUtils';

const PRIORITY_COLOR = { critical: '#7c3aed', high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

const TABS = ['active', 'history'];

export default function TasksScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('active');
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [activeRes, histRes] = await Promise.all([
        workersApi.getTasks(),
        workersApi.getTaskHistory({ page: 1, size: 30 }),
      ]);
      setTasks(activeRes.data.items || activeRes.data);
      setHistory(histRes.data.items || histRes.data);
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

  const data = tab === 'active' ? tasks : history;

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/task/${item.id}`)}>
      <View style={[styles.priorityBar, { backgroundColor: PRIORITY_COLOR[item.priority] || '#9ca3af' }]} />
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.issueType}>{item.issue_type?.replace('_', ' ')}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'resolved' ? '#d1fae5' : '#dbeafe' }]}>
            <Text style={[styles.statusText, { color: item.status === 'resolved' ? '#065f46' : '#1e40af' }]}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color="#9ca3af" />
          <Text style={styles.metaText} numberOfLines={1}>{item.address || 'No address'}</Text>
        </View>
        <Text style={styles.date}>
          {formatDate(item.created_at, 'en-IN')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'active' ? `Active (${tasks.length})` : `History (${history.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#059669" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>{tab === 'active' ? 'No active tasks' : 'No task history'}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#059669' },
  tabText: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },
  tabTextActive: { color: '#059669' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
    elevation: 2,
  },
  priorityBar: { width: 5, height: '100%', minHeight: 80 },
  info: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  issueType: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  desc: { fontSize: 14, color: '#111827', fontWeight: '500', lineHeight: 20, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  metaText: { fontSize: 12, color: '#9ca3af', flex: 1 },
  date: { fontSize: 11, color: '#d1d5db' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
});
