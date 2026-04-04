import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Alert, Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { issuesApi } from '../../src/api/issues';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/auth';
import IssueCard from '../../src/components/common/IssueCard';
import CitizenProfileModal from '../../src/components/CitizenProfileModal';
import * as Location from 'expo-location';
import { logger } from '../../src/utils/logger';

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
  const { user, updateUser } = useAuthStore();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleProfileComplete = async () => {
    setShowProfileModal(false);
    try {
      const { data } = await authApi.getMe();
      if (data) {
        updateUser(data);
      }
    } catch (err) {
      // Even if refresh fails, modal is already closed
    }
  };

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

  // Trigger profile modal if ward or name is missing
  useEffect(() => {
    if (user && (!user.name || !user.ward)) {
      setShowProfileModal(true);
    }
  }, [user]);

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
            <View>
              <IssueCard issue={item} onPress={() => router.push(`/issue/${item.id}`)} />
              {item.status === 'resolved' && (
                <View style={styles.actionRow}>
                  {!item.citizen_rating && (
                    <View style={styles.ratingRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={async () => {
                            try {
                              await issuesApi.update(item.id, { citizen_rating: star });
                              setIssues((prev) =>
                                prev.map((i) => (i.id === item.id ? { ...i, citizen_rating: star } : i))
                              );
                            } catch {
                              Alert.alert('Error', 'Could not submit rating');
                            }
                          }}
                          style={styles.star}
                        >
                          <Ionicons name="star" size={20} color="#f59e0b" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={async () => {
                      try {
                        await issuesApi.update(item.id, { status: 'closed' });
                        setIssues((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, status: 'closed' } : i))
                        );
                      } catch {
                        Alert.alert('Error', 'Could not close issue');
                      }
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
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

      {/* SOS Emergency Button */}
      <TouchableOpacity
        style={styles.sosFab}
        onPress={() => {
          Alert.alert(
            'Emergency SOS',
            'This will report an emergency hazard at your current location and alert nearby citizens. Continue?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'SEND SOS',
                style: 'destructive',
                onPress: async () => {
                  try {
                    Vibration.vibrate([0, 200, 100, 200]);
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    let latitude = user?.latitude || 0;
                    let longitude = user?.longitude || 0;
                    if (status === 'granted') {
                      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                      latitude = loc.coords.latitude;
                      longitude = loc.coords.longitude;
                    }
                    const { data } = await issuesApi.create({
                      issue_type: 'other',
                      description: 'EMERGENCY SOS — Citizen reported an immediate hazard at this location.',
                      latitude,
                      longitude,
                      address: user?.ward || 'Unknown',
                      ward: user?.ward || '',
                      is_sos: true,
                    });
                    logger.info('SOS', `SOS issue created: ${data?.id}`);
                    Alert.alert('SOS Sent', 'Emergency reported! Nearby citizens and all admins have been alerted.');
                    fetchIssues(true);
                  } catch (err) {
                    const errorMsg = err?.response?.status === 403 
                      ? 'Not authorized to create issue' 
                      : err?.message || 'Unknown error';
                    logger.error('SOS', `Failed to send SOS: ${errorMsg}`, err);
                    Alert.alert('Error', `Failed to send SOS: ${errorMsg}. Please try again.`);
                  }
                },
              },
            ],
          );
        }}
      >
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>

      {/* Profile Completion Modal */}
      <CitizenProfileModal 
        visible={showProfileModal}
        user={user}
        onComplete={handleProfileComplete}
        onCancel={() => setShowProfileModal(false)}
      />
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
  sosFab: {
    position: 'absolute', bottom: 24, left: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    elevation: 8, borderWidth: 2, borderColor: '#fca5a5',
  },
  sosText: {
    color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1,
  },
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  ratingRow: { flexDirection: 'row', gap: 4 },
  star: { padding: 4 },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  closeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
