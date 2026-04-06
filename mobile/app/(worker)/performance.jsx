import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { useRouter, useFocusEffect } from 'expo-router';
import { rewardsApi } from '../../src/api/rewards';
import { useAuthStore } from '../../src/store/authStore';

// ── Level system ──────────────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000];
const LEVEL_COLORS = {
  Newcomer: { primary: '#6b7280', bg: '#f3f4f6', text: '#374151' },
  Rookie:   { primary: '#1d4ed8', bg: '#dbeafe', text: '#1d4ed8' },
  Skilled:  { primary: '#059669', bg: '#d1fae5', text: '#065f46' },
  Advanced: { primary: '#7c3aed', bg: '#ede9fe', text: '#5b21b6' },
  Expert:   { primary: '#d97706', bg: '#fef3c7', text: '#92400e' },
};

function getLevelStart(level) {
  return LEVEL_THRESHOLDS[level - 1] ?? 0;
}

function getLevelProgress(total_points, level, next_level_points) {
  if (!next_level_points) return 1; // max level
  const start = getLevelStart(level);
  const range = next_level_points - start;
  if (range <= 0) return 1;
  return Math.min((total_points - start) / range, 1);
}

// ── Circular progress ring ────────────────────────────────────────────────────
const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

function ProgressRing({ progress, color, level, levelName }) {
  const stroke = RING_C * (1 - progress);
  return (
    <View style={styles.ringWrap}>
      <Svg width={128} height={128} viewBox="0 0 128 128">
        {/* Track */}
        <SvgCircle cx={64} cy={64} r={RING_R} fill="none" stroke="#e5e7eb" strokeWidth={10} />
        {/* Fill */}
        <SvgCircle
          cx={64} cy={64} r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${RING_C}`}
          strokeDashoffset={stroke}
          strokeLinecap="round"
          rotation="-90"
          origin="64, 64"
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringLevel, { color }]}>Lv.{level}</Text>
        <Text style={[styles.ringName, { color }]}>{levelName}</Text>
      </View>
    </View>
  );
}

// ── Badge pill ─────────────────────────────────────────────────────────────────
function BadgePill({ badge }) {
  return (
    <View style={styles.badgePill}>
      <View style={[styles.badgeIcon]}>
        <Ionicons name="ribbon" size={20} color="#059669" />
      </View>
      <Text style={styles.badgeName} numberOfLines={2}>{badge.name}</Text>
    </View>
  );
}

// ── Transaction row ───────────────────────────────────────────────────────────
const EVENT_META = {
  task_resolved:   { icon: 'checkmark-circle', color: '#059669', label: 'Task resolved' },
  task_rated:      { icon: 'star',             color: '#f59e0b', label: 'Received rating' },
  badge_earned:    { icon: 'ribbon',            color: '#7c3aed', label: 'Badge earned' },
  login_streak:    { icon: 'flame',             color: '#ef4444', label: 'Login streak' },
  task_accepted:   { icon: 'hand-right',        color: '#1d4ed8', label: 'Task accepted' },
};

function formatEarnedAt(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function TxRow({ tx }) {
  const meta = EVENT_META[tx.event_type] || { icon: 'ellipse', color: '#9ca3af', label: tx.event_type?.replace(/_/g, ' ') };
  const isPos = tx.points >= 0;
  const looksRaw = !tx.note || /^[+\-]?\d+ for /.test(tx.note) || tx.note.includes('_');
  const displayLabel = looksRaw ? meta.label : tx.note;
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: meta.color + '18' }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txLabel}>{displayLabel}</Text>
        <Text style={styles.txDate}>{formatEarnedAt(tx.earned_at)}</Text>
      </View>
      <Text style={[styles.txPts, { color: isPos ? '#059669' : '#ef4444' }]}>
        {isPos ? '+' : ''}{tx.points} pts
      </Text>
    </View>
  );
}

// ── Leaderboard row ───────────────────────────────────────────────────────────
const MEDAL_COLOR = { 1: '#fbbf24', 2: '#94a3b8', 3: '#cd7f32' };

function LbRow({ item, index, isMe }) {
  const rank = index + 1;
  const mc = MEDAL_COLOR[rank];
  return (
    <View style={[styles.lbRow, isMe && styles.lbRowMe]}>
      <View style={[styles.lbRank, mc && { backgroundColor: mc + '22' }]}>
        {mc
          ? <Ionicons name="trophy" size={14} color={mc} />
          : <Text style={styles.lbRankText}>#{rank}</Text>
        }
      </View>
      <View style={[styles.lbAvatar, isMe && styles.lbAvatarMe]}>
        <Text style={[styles.lbAvatarText, isMe && styles.lbAvatarTextMe]}>
          {(item.name || '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.lbInfo}>
        <Text style={[styles.lbName, isMe && styles.lbNameMe]} numberOfLines={1}>
          {item.name || 'Worker'}{isMe ? ' (You)' : ''}
        </Text>
        <Text style={styles.lbSub}>
          {item.tasks_completed ?? 0} tasks
          {item.avg_rating ? ` · Rating: ${item.avg_rating.toFixed(1)}` : ''}
        </Text>
      </View>
      <Text style={[styles.lbPts, isMe && styles.lbPtsMe]}>{item.total_points ?? 0} pts</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function PerformanceScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [rewards, setRewards] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rRes, lRes] = await Promise.all([
        rewardsApi.getMyRewards(),
        rewardsApi.workerLeaderboard({ page: 1, size: 20 }),
      ]);
      setRewards(rRes.data);
      setLeaderboard(lRes.data.items || lRes.data);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => {
    load().finally(() => setLoading(false));
  }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#059669" size="large" />;

  const lc = LEVEL_COLORS[rewards?.level_name] || LEVEL_COLORS.Newcomer;
  const progress = rewards
    ? getLevelProgress(rewards.total_points, rewards.level, rewards.next_level_points)
    : 0;

  // Find my position in leaderboard
  const myIndex = leaderboard.findIndex((w) => w.user_id === user?.id);
  // Show top 3 + me if I'm not in top 3
  const displayRows = myIndex > 2
    ? [...leaderboard.slice(0, 3), leaderboard[myIndex]]
    : leaderboard.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* ── Level hero ─────────────────────────────────── */}
      <View style={styles.hero}>
        <ProgressRing
          progress={progress}
          color={lc.primary}
          level={rewards?.level ?? 1}
          levelName={rewards?.level_name ?? 'Newcomer'}
        />
        <View style={styles.heroRight}>
          <View style={[styles.levelBadge, { backgroundColor: lc.bg }]}>
            <Text style={[styles.levelBadgeText, { color: lc.text }]}>
              {rewards?.level_name ?? 'Newcomer'}
            </Text>
          </View>
          <Text style={styles.heroPoints}>{rewards?.total_points ?? 0}</Text>
          <Text style={styles.heroPointsLabel}>total points</Text>
          {rewards?.next_level_points ? (
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: lc.primary }]} />
            </View>
          ) : null}
          <Text style={styles.xpHint}>
            {rewards?.next_level_points
              ? `${rewards.next_level_points - rewards.total_points} pts to next level`
              : 'Max level reached!'}
          </Text>
        </View>
      </View>

      {/* ── Stats row ──────────────────────────────────── */}
      <View style={styles.statsRow}>
        {[
          { label: 'Rank',    value: rewards?.rank ? `#${rewards.rank}` : '—', icon: 'trophy',       color: '#f59e0b' },
          { label: 'Badges',  value: rewards?.badges?.length ?? 0,             icon: 'ribbon',       color: '#7c3aed' },
          { label: 'Points',  value: rewards?.total_points ?? 0,               icon: 'star',         color: '#1d4ed8' },
        ].map(({ label, value, icon, color }, i, arr) => (
          <View key={label} style={{ flexDirection: 'row', flex: 1 }}>
            <View style={styles.statItem}>
              <Ionicons name={icon} size={18} color={color} style={{ marginBottom: 4 }} />
              <Text style={[styles.statVal, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.statDivider} />}
          </View>
        ))}
      </View>

      {/* ── Badges ─────────────────────────────────────── */}
      {rewards?.badges?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earned Badges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
            {rewards.badges.map((b) => (
              <BadgePill key={b.key} badge={b} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Leaderboard ─────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Worker Leaderboard</Text>
          <TouchableOpacity onPress={() => router.push('/(worker)/leaderboard')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {displayRows.length === 0 ? (
          <Text style={styles.emptyText}>No leaderboard data yet</Text>
        ) : (
          <>
            {displayRows.map((item, index) => {
              const actualIndex = leaderboard.findIndex((w) => w.user_id === item.user_id);
              return (
                <LbRow
                  key={String(item.user_id)}
                  item={item}
                  index={actualIndex}
                  isMe={item.user_id === user?.id}
                />
              );
            })}
            {myIndex > 2 && (
              <View style={styles.lbGap}>
                <Text style={styles.lbGapText}>···</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* ── Recent Activity ─────────────────────────────── */}
      {rewards?.recent_transactions?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {rewards.recent_transactions.slice(0, 8).map((tx) => (
            <TxRow key={tx.id} tx={tx} />
          ))}
        </View>
      )}

      {/* ── Shifts shortcut ─────────────────────────────── */}
      <TouchableOpacity style={styles.shiftsCard} onPress={() => router.push('/(worker)/shifts')}>
        <View style={styles.shiftsLeft}>
          <View style={styles.shiftsIconWrap}>
            <Ionicons name="calendar" size={22} color="#059669" />
          </View>
          <View>
            <Text style={styles.shiftsTitle}>My Shift Schedule</Text>
            <Text style={styles.shiftsSub}>Manage your weekly availability</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  // Hero
  hero: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 20, gap: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  ringWrap: { position: 'relative', width: 128, height: 128, justifyContent: 'center', alignItems: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringLevel: { fontSize: 13, fontWeight: '800' },
  ringName:  { fontSize: 11, fontWeight: '600', marginTop: 2 },
  heroRight: { flex: 1, gap: 4 },
  levelBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  levelBadgeText: { fontSize: 12, fontWeight: '700' },
  heroPoints: { fontSize: 32, fontWeight: '900', color: '#111827', marginTop: 4 },
  heroPointsLabel: { fontSize: 12, color: '#9ca3af', marginTop: -2 },
  xpBar: {
    height: 6, backgroundColor: '#f3f4f6', borderRadius: 3,
    overflow: 'hidden', marginTop: 8,
  },
  xpFill: { height: 6, borderRadius: 3 },
  xpHint: { fontSize: 11, color: '#9ca3af', marginTop: 4 },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginTop: 12, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  statItem:   { flex: 1, alignItems: 'center' },
  statVal:    { fontSize: 18, fontWeight: '800' },
  statLabel:  { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  statDivider:{ width: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },

  // Sections
  section: { backgroundColor: '#fff', marginTop: 12, padding: 16 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#059669', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 16 },

  // Badge pill
  badgePill: {
    width: 80, alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 10,
  },
  badgeIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center',
  },
  badgeName: { fontSize: 10, fontWeight: '600', color: '#374151', textAlign: 'center' },

  // Leaderboard
  lbRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  lbRowMe: { backgroundColor: '#f0fdf4', marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 10 },
  lbRank: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
  },
  lbRankText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  lbAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 10,
  },
  lbAvatarMe: { backgroundColor: '#059669' },
  lbAvatarText: { fontSize: 15, fontWeight: '700', color: '#059669' },
  lbAvatarTextMe: { color: '#fff' },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  lbNameMe: { color: '#059669' },
  lbSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  lbPts: { fontSize: 14, fontWeight: '800', color: '#374151' },
  lbPtsMe: { color: '#059669' },
  lbGap: { alignItems: 'center', paddingVertical: 4 },
  lbGapText: { color: '#d1d5db', fontWeight: '700' },

  // Transactions
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  txIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txLabel: { fontSize: 14, fontWeight: '500', color: '#111827' },
  txDate:  { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  txPts:   { fontSize: 14, fontWeight: '800' },

  // Shifts shortcut
  shiftsCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', marginTop: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  shiftsLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shiftsIconWrap:{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
  shiftsTitle:   { fontSize: 15, fontWeight: '600', color: '#111827' },
  shiftsSub:     { fontSize: 12, color: '#9ca3af', marginTop: 2 },
});
