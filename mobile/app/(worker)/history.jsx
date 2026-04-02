import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { workersApi } from '../../src/api/workers';
import { formatDate } from '../../src/utils/dateUtils';

const STATUS_COLORS = {
  resolved: '#059669',
  closed: '#6b7280',
  assigned: '#f59e0b',
  in_progress: '#1a56db',
  rejected: '#ef4444',
  accepted: '#6366f1',
};

const STATUS_ICONS = {
  resolved: 'checkmark-circle',
  closed: 'lock-closed',
  assigned: 'time-outline',
  in_progress: 'sync',
  rejected: 'close-circle',
  accepted: 'play-circle',
};

function HistoryCard({ task, onPress }) {
  const status = task.status || 'resolved';
  const color = STATUS_COLORS[status] || '#6b7280';
  const icon = STATUS_ICONS[status] || 'ellipse';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.statusBar, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Ionicons name={icon} size={18} color={color} />
          <Text style={[styles.statusText, { color }]}>{status.replace('_', ' ').toUpperCase()}</Text>
          <Text style={styles.dateText}>
            {task.resolved_at || task.updated_at ? formatDate(task.resolved_at || task.updated_at) : '—'}
          </Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>{task.description || 'No description'}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="construct-outline" size={12} color="#9ca3af" />
            <Text style={styles.metaText}>{task.issue_type?.replace('_', ' ') || 'Other'}</Text>
          </View>
          {task.address && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color="#9ca3af" />
              <Text style={styles.metaText} numberOfLines={1}>{task.address}</Text>
            </View>
          )}
          {task.priority && (
            <View style={[styles.priorityBadge, {
              backgroundColor:
                task.priority === 'critical' ? '#f3e8ff' :
                task.priority === 'high' ? '#fee2e2' :
                task.priority === 'medium' ? '#fef3c7' : '#f0fdf4',
            }]}>
              <Text style={[styles.priorityText, {
                color:
                  task.priority === 'critical' ? '#7c3aed' :
                  task.priority === 'high' ? '#dc2626' :
                  task.priority === 'medium' ? '#d97706' : '#059669',
              }]}>{task.priority}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const FILTER_LABELS = {
  all: 'All',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const FILTERS = ['all', 'assigned', 'in_progress', 'resolved', 'closed'];

export default function TaskHistoryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageRef = useRef(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Task History',
      headerShown: true,
      headerBackTitle: 'Back',
      headerStyle: { backgroundColor: '#059669' },
      headerTintColor: '#fff',
    });
  }, []);

  const fetchHistory = useCallback(async (reset = false) => {
    const p = reset ? 1 : pageRef.current;
    try {
      const params = { page: p, size: 20 };
      if (filter !== 'all') params.status = filter;
      const { data } = await workersApi.getTaskHistory(params);
      const items = Array.isArray(data) ? data : (data.items || []);
      if (reset) {
        setTasks(items);
        pageRef.current = 2;
        setPage(2);
      } else {
        setTasks((prev) => [...prev, ...items]);
        pageRef.current = p + 1;
        setPage(p + 1);
      }
      setHasMore(items.length === 20);
    } catch {}
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchHistory(true).finally(() => setLoading(false));
  }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory(true);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchHistory(false);
    setLoadingMore(false);
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {FILTER_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#059669" size="large" />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <HistoryCard
              task={item}
              onPress={() => router.push(`/task/${item.id}`)}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No history found</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#059669" style={{ marginVertical: 16 }} /> : null
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 10 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filtersScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexGrow: 0 },
  filters: {
    flexDirection: 'row', paddingHorizontal: 16,
    paddingVertical: 10, gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#f3f4f6',
  },
  filterBtnActive: { backgroundColor: '#059669' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statusBar: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, flex: 1 },
  dateText: { fontSize: 11, color: '#9ca3af' },
  description: { fontSize: 14, fontWeight: '500', color: '#111827', lineHeight: 20 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#9ca3af', textTransform: 'capitalize', maxWidth: 120 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  priorityText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
});
