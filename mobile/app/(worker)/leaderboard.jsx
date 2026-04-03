import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { rewardsApi } from '../../src/api/rewards';
import { useAuthStore } from '../../src/store/authStore';

function MedalIcon({ rank }) {
  if (rank === 1) return <Text style={styles.medal}>1st</Text>;
  if (rank === 2) return <Text style={styles.medal}>2nd</Text>;
  if (rank === 3) return <Text style={styles.medal}>3rd</Text>;
  return <Text style={styles.rankText}>#{rank}</Text>;
}

export default function WorkerLeaderboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [workers, setWorkers] = useState([]);
  const [myRewards, setMyRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Worker Leaderboard',
      headerShown: true,
      headerBackTitle: 'Back',
      headerStyle: { backgroundColor: '#059669' },
      headerTintColor: '#fff',
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const [wRes, mRes] = await Promise.all([
        rewardsApi.workerLeaderboard({ page: 1, size: 50 }),
        rewardsApi.getMyRewards(),
      ]);
      setWorkers(wRes.data.items || wRes.data);
      setMyRewards(mRes.data);
    } catch {}
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#059669" size="large" />;

  return (
    <View style={styles.container}>
      {/* My Position Banner */}
      {myRewards && (
        <View style={styles.banner}>
          <View style={styles.bannerItem}>
            <Text style={styles.bannerVal}>{myRewards.total_points ?? 0}</Text>
            <Text style={styles.bannerLabel}>My Points</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerItem}>
            <Text style={styles.bannerVal}>#{myRewards.rank ?? '—'}</Text>
            <Text style={styles.bannerLabel}>My Rank</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerItem}>
            <Text style={styles.bannerVal}>{myRewards.badges?.length ?? 0}</Text>
            <Text style={styles.bannerLabel}>Badges</Text>
          </View>
        </View>
      )}

      <FlatList
        data={workers}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
        renderItem={({ item, index }) => {
          const isMe = item.user_id === user?.id;
          return (
            <View style={[styles.row, isMe && styles.rowMe]}>
              <View style={styles.rankCell}>
                <MedalIcon rank={index + 1} />
              </View>
              <View style={[styles.avatar, isMe && styles.avatarMe]}>
                <Text style={[styles.avatarText, isMe && styles.avatarTextMe]}>
                  {(item.name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, isMe && styles.rowNameMe]} numberOfLines={1}>
                  {item.name || 'Worker'} {isMe ? '(You)' : ''}
                </Text>
                <Text style={styles.rowSub}>
                  {item.tasks_completed ?? 0} tasks · {item.level_name || `Level ${item.level}`}
                  {item.badge_count ? ` · ${item.badge_count} badges` : ''}
                </Text>
              </View>
              <View style={styles.pointsCell}>
                <Text style={[styles.points, isMe && styles.pointsMe]}>{item.total_points ?? 0}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No workers yet</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  banner: {
    flexDirection: 'row', backgroundColor: '#059669',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  bannerItem: { flex: 1, alignItems: 'center' },
  bannerVal: { fontSize: 22, fontWeight: '800', color: '#fff' },
  bannerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  bannerDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  rowMe: { backgroundColor: '#f0fdf4' },
  rankCell: { width: 36, alignItems: 'center' },
  medal: { fontSize: 20 },
  rankText: { fontSize: 14, fontWeight: '700', color: '#6b7280' },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginHorizontal: 10,
  },
  avatarMe: { backgroundColor: '#059669' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#059669' },
  avatarTextMe: { color: '#fff' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowNameMe: { color: '#059669' },
  rowSub: { fontSize: 12, color: '#9ca3af', marginTop: 2, textTransform: 'capitalize' },
  pointsCell: { alignItems: 'flex-end' },
  points: { fontSize: 18, fontWeight: '800', color: '#111827' },
  pointsMe: { color: '#059669' },
  pointsLabel: { fontSize: 10, color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
});
