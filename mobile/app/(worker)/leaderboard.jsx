import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { useNavigation, useFocusEffect } from 'expo-router';
import { rewardsApi } from '../../src/api/rewards';
import { useAuthStore } from '../../src/store/authStore';

// ── Medal icons — same design as citizen leaderboard ─────────────────────────
const MEDALS = {
  1: { circle: '#FFD700', ribbon: '#B8860B', shadow: '#FFF3B0', textColor: '#7A5200' },
  2: { circle: '#D0D8E4', ribbon: '#8899AA', shadow: '#F0F4F8', textColor: '#3D5066' },
  3: { circle: '#E8956D', ribbon: '#A0522D', shadow: '#FDDCCC', textColor: '#7A2D00' },
};

function MedalIcon({ rank }) {
  const m = MEDALS[rank];
  if (m) {
    return (
      <Svg width={38} height={46} viewBox="0 0 38 46">
        {/* Ribbon left */}
        <Rect x={11} y={0} width={7} height={16} rx={2} fill={m.ribbon} />
        {/* Ribbon right */}
        <Rect x={20} y={0} width={7} height={16} rx={2} fill={m.ribbon} />
        {/* Shadow circle */}
        <Circle cx={19} cy={31} r={14} fill={m.shadow} />
        {/* Medal circle */}
        <Circle cx={19} cy={30} r={13} fill={m.circle} />
        {/* Inner ring */}
        <Circle cx={19} cy={30} r={10} fill="none" stroke={m.ribbon} strokeWidth={1.2} />
        {/* Rank number */}
        <SvgText x={19} y={35} textAnchor="middle" fontSize={13} fontWeight="bold" fill={m.textColor}>
          {rank}
        </SvgText>
      </Svg>
    );
  }
  return (
    <View style={styles.rankCircle}>
      <Text style={styles.rankText}>#{rank}</Text>
    </View>
  );
}

// ── Level badge ───────────────────────────────────────────────────────────────
const LEVEL_COLOR = {
  Newcomer: { bg: '#F3F4F6', text: '#6B7280' },
  Rookie:   { bg: '#DBEAFE', text: '#1D4ED8' },
  Skilled:  { bg: '#D1FAE5', text: '#065F46' },
  Advanced: { bg: '#EDE9FE', text: '#5B21B6' },
  Expert:   { bg: '#FEF3C7', text: '#92400E' },
};

// ── Row ───────────────────────────────────────────────────────────────────────
function WorkerRow({ item, index, isMe }) {
  const rank = index + 1;
  const lvl = LEVEL_COLOR[item.level_name] || LEVEL_COLOR.Newcomer;

  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <View style={styles.rankCell}>
        <MedalIcon rank={rank} />
      </View>

      <View style={[styles.avatar, isMe && styles.avatarMe]}>
        <Text style={[styles.avatarText, isMe && styles.avatarTextMe]}>
          {(item.name || '?').charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
            {item.name || 'Worker'}{isMe ? ' (You)' : ''}
          </Text>
          <View style={[styles.levelBadge, { backgroundColor: lvl.bg }]}>
            <Text style={[styles.levelText, { color: lvl.text }]}>{item.level_name || 'Newcomer'}</Text>
          </View>
        </View>
        <View style={styles.subRow}>
          <Text style={styles.sub}>{item.tasks_completed ?? 0} tasks</Text>
          {!!item.avg_rating && (
            <>
              <Text style={styles.subDot}> · </Text>
              <Ionicons name="star" size={10} color="#F59E0B" />
              <Text style={styles.sub}> {item.avg_rating.toFixed(1)}</Text>
            </>
          )}
          {!!item.ward && (
            <>
              <Text style={styles.subDot}> · </Text>
              <Text style={styles.sub}>{item.ward}</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.ptsCell}>
        <Text style={[styles.pts, isMe && styles.ptsMe]}>{item.total_points ?? 0}</Text>
        <Text style={styles.ptsLabel}>pts</Text>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function WorkerLeaderboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [workers, setWorkers] = useState([]);
  const [myRewards, setMyRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Leaderboard',
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
    } catch (err) {
      console.warn('Failed to load leaderboard data:', err.message);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#059669" size="large" />;

  return (
    <View style={styles.container}>
      {/* My stats banner */}
      <View style={styles.banner}>
        <View style={styles.bannerItem}>
          <Text style={styles.bannerVal}>{myRewards?.total_points ?? 0}</Text>
          <Text style={styles.bannerLabel}>My Points</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.bannerItem}>
          <Text style={styles.bannerVal}>{myRewards?.rank ? `#${myRewards.rank}` : '—'}</Text>
          <Text style={styles.bannerLabel}>My Rank</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.bannerItem}>
          <Text style={styles.bannerVal}>{myRewards?.badges?.length ?? 0}</Text>
          <Text style={styles.bannerLabel}>Badges</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.bannerItem}>
          <Text style={styles.bannerVal}>{myRewards?.level_name || '—'}</Text>
          <Text style={styles.bannerLabel}>Level</Text>
        </View>
      </View>

      <FlatList
        data={workers}
        keyExtractor={(item) => String(item.user_id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
        }
        renderItem={({ item, index }) => (
          <WorkerRow item={item} index={index} isMe={item.user_id === user?.id} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No workers on the leaderboard yet</Text>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  banner: {
    flexDirection: 'row', backgroundColor: '#059669',
    paddingVertical: 14, paddingHorizontal: 8,
  },
  bannerItem:  { flex: 1, alignItems: 'center' },
  bannerVal:   { fontSize: 16, fontWeight: '800', color: '#fff' },
  bannerLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  divider:     { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10,
  },
  rowMe:    { backgroundColor: '#F0FDF4' },
  separator:{ height: 1, backgroundColor: '#F3F4F6', marginLeft: 70 },

  rankCell:   { width: 44, alignItems: 'center', justifyContent: 'center' },
  rankCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },

  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 10,
  },
  avatarMe:     { backgroundColor: '#059669' },
  avatarText:   { fontSize: 17, fontWeight: '700', color: '#059669' },
  avatarTextMe: { color: '#fff' },

  info:      { flex: 1 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name:      { fontSize: 14, fontWeight: '700', color: '#111827', flexShrink: 1 },
  nameMe:    { color: '#059669' },
  levelBadge:{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  levelText: { fontSize: 10, fontWeight: '700' },
  subRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  sub:       { fontSize: 12, color: '#9CA3AF' },
  subDot:    { fontSize: 12, color: '#D1D5DB' },

  ptsCell:  { alignItems: 'flex-end', minWidth: 42 },
  pts:      { fontSize: 18, fontWeight: '800', color: '#111827' },
  ptsMe:    { color: '#059669' },
  ptsLabel: { fontSize: 10, color: '#9CA3AF' },

  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 60, fontSize: 15 },
});
