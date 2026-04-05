import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { useRouter, useFocusEffect } from 'expo-router';
import { rewardsApi } from '../../src/api/rewards';
import { issuesApi } from '../../src/api/issues';
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
  if (!next_level_points) return 1;
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
        <SvgCircle cx={64} cy={64} r={RING_R} fill="none" stroke="#e5e7eb" strokeWidth={10} />
        <SvgCircle
          cx={64} cy={64} r={RING_R}
          fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${RING_C}`} strokeDashoffset={stroke}
          strokeLinecap="round" rotation="-90" origin="64, 64"
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringLevel, { color }]}>Lv.{level}</Text>
        <Text style={[styles.ringName, { color }]}>{levelName}</Text>
      </View>
    </View>
  );
}

// ── Badge pill ────────────────────────────────────────────────────────────────
function BadgePill({ badge }) {
  return (
    <View style={styles.badgePill}>
      <View style={styles.badgeIcon}>
        <Ionicons name="ribbon" size={20} color="#1a56db" />
      </View>
      <Text style={styles.badgeName} numberOfLines={2}>{badge.name}</Text>
    </View>
  );
}

// ── Transaction row ───────────────────────────────────────────────────────────
const EVENT_META = {
  issue_reported:  { icon: 'document-text',     color: '#1a56db', label: 'Issue reported' },
  issue_resolved:  { icon: 'checkmark-circle',  color: '#059669', label: 'Issue resolved' },
  badge_earned:    { icon: 'ribbon',             color: '#7c3aed', label: 'Badge earned' },
  upvote_given:    { icon: 'thumbs-up',          color: '#f59e0b', label: 'Upvote given' },
  comment_added:   { icon: 'chatbubble',         color: '#0ea5e9', label: 'Comment added' },
  login_streak:    { icon: 'flame',              color: '#ef4444', label: 'Login streak' },
  task_rated:      { icon: 'star',               color: '#f59e0b', label: 'Rated a worker' },
  rate_issue:      { icon: 'star',               color: '#f59e0b', label: 'Rated a resolution' },
  issue_closed:    { icon: 'lock-closed',        color: '#6b7280', label: 'Issue closed' },
  follow_issue:    { icon: 'bookmark',           color: '#0ea5e9', label: 'Followed an issue' },
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
  // Use mapped label if note looks like a raw system string (contains underscores or starts with "+N for")
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
          {item.name || 'Citizen'}{isMe ? ' (You)' : ''}
        </Text>
        <Text style={styles.lbSub}>
          {item.badge_count ?? 0} badges · Lv.{item.level ?? 1} {item.level_name || ''}
        </Text>
      </View>
      <Text style={[styles.lbPts, isMe && styles.lbPtsMe]}>{item.total_points ?? 0} pts</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CitizenPerformanceScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [rewards, setRewards] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [issueStats, setIssueStats] = useState({ total: 0, resolved: 0, open: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rRes, lRes, allRes, resolvedRes, closedRes] = await Promise.all([
        rewardsApi.getMyRewards(),
        rewardsApi.citizenLeaderboard({ page: 1, size: 20 }),
        issuesApi.list({ page: 1, size: 1 }),
        issuesApi.list({ page: 1, size: 1, status: 'resolved' }),
        issuesApi.list({ page: 1, size: 1, status: 'closed' }),
      ]);
      setRewards(rRes.data);
      setLeaderboard(lRes.data.items || lRes.data);
      const total = allRes.data.total ?? (allRes.data.items || allRes.data).length;
      const resolved = resolvedRes.data.total ?? (resolvedRes.data.items || resolvedRes.data).length;
      const closed = closedRes.data.total ?? (closedRes.data.items || closedRes.data).length;
      setIssueStats({ total, resolved: resolved + closed, open: total - resolved - closed });
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#1a56db" size="large" />;

  const lc = LEVEL_COLORS[rewards?.level_name] || LEVEL_COLORS.Newcomer;
  const progress = rewards
    ? getLevelProgress(rewards.total_points, rewards.level, rewards.next_level_points)
    : 0;

  const myIndex = leaderboard.findIndex((c) => c.user_id === user?.id);
  const displayRows = myIndex > 2
    ? [...leaderboard.slice(0, 3), leaderboard[myIndex]]
    : leaderboard.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a56db" />}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* ── Level hero ──────────────────────────────────── */}
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

      {/* ── Stats row ───────────────────────────────────── */}
      <View style={styles.statsRow}>
        {[
          { label: 'Rank',     value: rewards?.rank ? `#${rewards.rank}` : '—', icon: 'trophy',        color: '#f59e0b' },
          { label: 'Badges',   value: rewards?.badges?.length ?? 0,             icon: 'ribbon',        color: '#7c3aed' },
          { label: 'Reported', value: issueStats.total,                         icon: 'document-text', color: '#1a56db' },
          { label: 'Resolved', value: issueStats.resolved,                      icon: 'checkmark-circle', color: '#059669' },
        ].map(({ label, value, icon, color }, i, arr) => (
          <View key={label} style={{ flexDirection: 'row', flex: 1 }}>
            <View style={styles.statItem}>
              <Ionicons name={icon} size={16} color={color} style={{ marginBottom: 3 }} />
              <Text style={[styles.statVal, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.statDivider} />}
          </View>
        ))}
      </View>

      {/* ── Earned Badges ───────────────────────────────── */}
      {rewards?.badges?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earned Badges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4, flexDirection: 'row', alignItems: 'center' }}>
            {rewards.badges.map((b) => (
              <BadgePill key={b.key} badge={b} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Citizen Leaderboard ─────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Citizen Leaderboard</Text>
          <TouchableOpacity onPress={() => router.push('/(citizen)/leaderboard')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {displayRows.length === 0 ? (
          <Text style={styles.emptyText}>No leaderboard data yet</Text>
        ) : (
          <>
            {displayRows.map((item, index) => {
              const actualIndex = leaderboard.findIndex((c) => c.user_id === item.user_id);
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
  xpBar: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginTop: 8 },
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
  statVal:    { fontSize: 16, fontWeight: '800' },
  statLabel:  { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  statDivider:{ width: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },

  // Sections
  section: { backgroundColor: '#fff', marginTop: 12, padding: 16 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#1a56db', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 16 },

  // Badge pill
  badgePill: {
    width: 80, alignItems: 'center', gap: 6,
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 10,
  },
  badgeIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center',
  },
  badgeName: { fontSize: 10, fontWeight: '600', color: '#374151', textAlign: 'center' },

  // Leaderboard
  lbRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  lbRowMe: { backgroundColor: '#eff6ff', marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 10 },
  lbRank: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
  },
  lbRankText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  lbAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 10,
  },
  lbAvatarMe: { backgroundColor: '#1a56db' },
  lbAvatarText: { fontSize: 15, fontWeight: '700', color: '#1a56db' },
  lbAvatarTextMe: { color: '#fff' },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  lbNameMe: { color: '#1a56db' },
  lbSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  lbPts: { fontSize: 14, fontWeight: '800', color: '#374151' },
  lbPtsMe: { color: '#1a56db' },
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
});
