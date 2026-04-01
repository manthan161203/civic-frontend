import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { issuesApi } from '../../src/api/issues';
import { useAuthStore } from '../../src/store/authStore';
import IssueCard from '../../src/components/common/IssueCard';

const CATEGORIES = ['All', 'open', 'in_progress', 'resolved'];

function WardHealthBanner({ wardName }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    if (!wardName) return;
    issuesApi.wardHealth(wardName)
      .then(({ data }) => setHealth(data))
      .catch(() => {});
  }, [wardName]);

  if (!health) return null;

  const score = health.score ?? 0;
  const color = score >= 80 ? '#059669' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <View style={[bannerStyles.container, { borderLeftColor: color }]}>
      <View style={bannerStyles.left}>
        <Text style={bannerStyles.label}>Ward Health</Text>
        <Text style={bannerStyles.wardName} numberOfLines={1}>{health.ward || 'Your Ward'}</Text>
        <Text style={bannerStyles.sub}>
          {health.open_issues ?? 0} open · {health.resolved_issues ?? 0} resolved
        </Text>
      </View>
      <View style={[bannerStyles.scoreBubble, { backgroundColor: color + '22' }]}>
        <Text style={[bannerStyles.score, { color }]}>{score}</Text>
        <Text style={[bannerStyles.scoreLabel, { color }]}>score</Text>
      </View>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    borderRadius: 12, padding: 14, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  left: { flex: 1 },
  label: { fontSize: 10, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  wardName: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 2 },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  scoreBubble: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  score: { fontSize: 18, fontWeight: '800' },
  scoreLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
});

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchIssues = useCallback(async (reset = false) => {
    const p = reset ? 1 : page;
    try {
      const params = { page: p, size: 20 };
      if (filter !== 'All') params.status = filter;
      const { data } = await issuesApi.list(params);
      const items = data.items || data;
      if (reset) {
        setIssues(items);
        setPage(2);
      } else {
        setIssues((prev) => [...prev, ...items]);
        setPage(p + 1);
      }
      setHasMore(items.length === 20);
    } catch {}
  }, [filter, page]);

  useEffect(() => {
    setLoading(true);
    fetchIssues(true).finally(() => setLoading(false));
  }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIssues(true);
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      fetchIssues(true);
      return;
    }
    try {
      const { data } = await issuesApi.search({ q: search, page: 1, size: 20 });
      setIssues(data.items || data);
      setHasMore(false);
    } catch {}
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search issues..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); fetchIssues(true); }}>
              <Ionicons name="close" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Ward Health Banner */}
      <WardHealthBanner wardName={user?.ward} />

      {/* Filter Tabs */}
      <View style={styles.filters}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, filter === cat && styles.chipActive]}
            onPress={() => setFilter(cat)}
          >
            <Text style={[styles.chipText, filter === cat && styles.chipTextActive]}>
              {cat === 'All' ? 'All' : cat.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1a56db" size="large" />
      ) : (
        <FlatList
          data={issues}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <IssueCard issue={item} onPress={() => router.push(`/issue/${item.id}`)} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a56db" />}
          onEndReached={() => {
            if (hasMore && !loadingMore && !loading) {
              setLoadingMore(true);
              fetchIssues().finally(() => setLoadingMore(false));
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No issues found</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 16 }} color="#1a56db" />
          ) : null}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* FAB - Report Issue */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(citizen)/report')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchRow: { backgroundColor: '#1a56db', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, paddingHorizontal: 12, gap: 8, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  filters: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: '#1a56db' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#1a56db', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
    elevation: 8,
  },
});
