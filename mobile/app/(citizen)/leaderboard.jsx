import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Text as SvgText, Rect } from 'react-native-svg';
import { useNavigation, useFocusEffect } from 'expo-router';
import { rewardsApi } from '../../src/api/rewards';
import { useAuthStore } from '../../src/store/authStore';

const TAB = { CITIZENS: 'citizens', WORKERS: 'workers', BADGES: 'badges' };

const BADGE_COLORS = {
  bronze: '#cd7f32',
  silver: '#a8a9ad',
  gold: '#ffd700',
  platinum: '#e5e4e2',
};

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
        <SvgText
          x={19} y={35}
          textAnchor="middle"
          fontSize={13}
          fontWeight="bold"
          fill={m.textColor}
        >
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

function CitizenRow({ item, index, myId }) {
  const isMe = item.user_id === myId;
  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      <View style={styles.rankCell}>
        <MedalIcon rank={index + 1} />
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, isMe && styles.rowNameMe]} numberOfLines={1}>
          {item.name || 'User'} {isMe ? '(You)' : ''}
        </Text>
        <Text style={styles.rowSub}>{item.badge_count ?? 0} badges · Lv.{item.level ?? 1} {item.level_name || ''}</Text>
      </View>
      <View style={styles.pointsCell}>
        <Text style={[styles.points, isMe && styles.pointsMe]}>{item.total_points ?? 0}</Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </View>
  );
}

function WorkerRow({ item, index }) {
  return (
    <View style={styles.row}>
      <View style={styles.rankCell}>
        <MedalIcon rank={index + 1} />
      </View>
      <View style={[styles.avatar, { backgroundColor: '#d1fae5' }]}>
        <Text style={[styles.avatarText, { color: '#059669' }]}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{item.name || 'Worker'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={styles.rowSub}>{item.tasks_completed ?? 0} tasks</Text>
          {!!item.avg_rating && (
            <>
              <Text style={styles.rowSub}> · </Text>
              <Ionicons name="star" size={10} color="#f59e0b" />
              <Text style={styles.rowSub}> {item.avg_rating.toFixed(1)}</Text>
            </>
          )}
          {!!item.ward && <Text style={styles.rowSub}> · {item.ward}</Text>}
        </View>
      </View>
      <View style={styles.pointsCell}>
        <Text style={styles.points}>{item.total_points ?? 0}</Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </View>
  );
}

function BadgeCard({ badge }) {
  const tier = badge.tier?.toLowerCase() || 'bronze';
  const color = BADGE_COLORS[tier] || '#6b7280';
  return (
    <View style={[styles.badgeCard, { borderColor: color }]}>
      <View style={[styles.badgeIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name="ribbon" size={28} color={color} />
      </View>
      <Text style={styles.badgeName} numberOfLines={2}>{badge.name}</Text>
      <Text style={[styles.badgeTier, { color }]}>{badge.tier?.toUpperCase()}</Text>
      {badge.description && (
        <Text style={styles.badgeDesc} numberOfLines={2}>{badge.description}</Text>
      )}
      {badge.points_required != null && (
        <Text style={styles.badgePts}>{badge.points_required} pts required</Text>
      )}
    </View>
  );
}

export default function LeaderboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [tab, setTab] = useState(TAB.CITIZENS);
  const [citizens, setCitizens] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [badges, setBadges] = useState([]);
  const [myRewards, setMyRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: 'Leaderboard & Badges', headerShown: true, headerBackTitle: 'Back', headerStyle: { backgroundColor: '#1a56db' }, headerTintColor: '#fff' });
  }, []);

  const load = useCallback(async () => {
    try {
      const [cRes, wRes, bRes, mRes] = await Promise.all([
        rewardsApi.citizenLeaderboard({ page: 1, size: 50 }),
        rewardsApi.workerLeaderboard({ page: 1, size: 50 }),
        rewardsApi.getBadges(),
        rewardsApi.getMyRewards(),
      ]);
      setCitizens(cRes.data.items || cRes.data);
      setWorkers(wRes.data.items || wRes.data);
      setBadges(bRes.data.items || bRes.data);
      setMyRewards(mRes.data);
    } catch {}
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#1a56db" size="large" />;

  return (
    <View style={styles.container}>
      {/* My Stats Banner */}
      {myRewards && (
        <View style={styles.myBanner}>
          <View style={styles.myBannerItem}>
            <Text style={styles.myBannerVal}>{myRewards.total_points ?? 0}</Text>
            <Text style={styles.myBannerLabel}>My Points</Text>
          </View>
          <View style={styles.myBannerDivider} />
          <View style={styles.myBannerItem}>
            <Text style={styles.myBannerVal}>#{myRewards.rank ?? '—'}</Text>
            <Text style={styles.myBannerLabel}>My Rank</Text>
          </View>
          <View style={styles.myBannerDivider} />
          <View style={styles.myBannerItem}>
            <Text style={styles.myBannerVal}>{myRewards.badges?.length ?? 0}</Text>
            <Text style={styles.myBannerLabel}>My Badges</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: TAB.CITIZENS, label: 'Citizens' },
          { key: TAB.WORKERS, label: 'Workers' },
          { key: TAB.BADGES, label: 'Badges' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tab === TAB.CITIZENS && (
        <FlatList
          data={citizens}
          keyExtractor={(item) => String(item.user_id)}
          renderItem={({ item, index }) => (
            <CitizenRow item={item} index={index} myId={user?.id} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a56db" />}
          ListEmptyComponent={<Text style={styles.empty}>No data yet</Text>}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {tab === TAB.WORKERS && (
        <FlatList
          data={workers}
          keyExtractor={(item) => String(item.user_id)}
          renderItem={({ item, index }) => <WorkerRow item={item} index={index} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a56db" />}
          ListEmptyComponent={<Text style={styles.empty}>No data yet</Text>}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {tab === TAB.BADGES && (
        <FlatList
          data={badges}
          keyExtractor={(item, index) => item.id ? String(item.id) : `badge-${index}-${item.name || ''}`}
          numColumns={2}
          renderItem={({ item }) => <BadgeCard badge={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a56db" />}
          ListEmptyComponent={<Text style={styles.empty}>No badges yet</Text>}
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  myBanner: {
    flexDirection: 'row', backgroundColor: '#1a56db',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  myBannerItem: { flex: 1, alignItems: 'center' },
  myBannerVal: { fontSize: 22, fontWeight: '800', color: '#fff' },
  myBannerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  myBannerDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  tabBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#1a56db' },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabLabelActive: { color: '#1a56db' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  rowMe: { backgroundColor: '#eff6ff' },
  rankCell: { width: 44, alignItems: 'center' },
  rankCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginHorizontal: 10,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#1a56db' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowNameMe: { color: '#1a56db' },
  rowSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  pointsCell: { alignItems: 'flex-end' },
  points: { fontSize: 18, fontWeight: '800', color: '#111827' },
  pointsMe: { color: '#1a56db' },
  pointsLabel: { fontSize: 10, color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
  badgeCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 14, alignItems: 'center', borderWidth: 2, gap: 6,
  },
  badgeIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  badgeName: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'center' },
  badgeTier: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  badgeDesc: { fontSize: 11, color: '#6b7280', textAlign: 'center', lineHeight: 15 },
  badgePts: { fontSize: 11, color: '#9ca3af' },
});
