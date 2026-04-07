import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { workersApi } from '../../src/api/workers';

const COLORS = {
  primary: '#006AFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
  gold: '#F59E0B',
  blue: '#3B82F6',
  green: '#10B981',
};

const BADGE_ICONS = {
  super_active: 'star',
  issue_solver: 'trophy',
  team_player: 'people',
  prompt_responder: 'lightning',
  perfect_attendance: 'calendar',
};

export default function RewardsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timePeriod, setTimePeriod] = useState('weekly'); // 'weekly', 'monthly', 'alltime'

  useEffect(() => {
    loadData();
  }, [timePeriod]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [meRes, leaderRes, statsRes] = await Promise.all([
        workersApi.getProfile?.() || { data: { points: 0, badges: [] } },
        workersApi.getLeaderboard?.({ period: timePeriod }) || { data: [] },
        workersApi.getStats?.() || { data: { issues_resolved: 0, status: 'available' } },
      ]);

      setProfile(meRes.data || {});
      setLeaderboard(Array.isArray(leaderRes.data) ? leaderRes.data : leaderRes.data?.items || []);
      setStats(statsRes.data || {});
    } catch (err) {
      console.error('Failed to load rewards:', err);
      setError('Failed to load rewards data');
    } finally {
      setLoading(false);
    }
  };

  const getPointBreakdown = () => {
    // Simulated breakdown - would come from backend in future
    return [
      { label: 'Issues Resolved', points: Math.floor((profile?.points || 0) * 0.5), icon: 'check' },
      { label: 'Disputes Won', points: Math.floor((profile?.points || 0) * 0.3), icon: 'scale' },
      { label: 'Ratings', points: Math.floor((profile?.points || 0) * 0.2), icon: '⭐' },
    ];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading rewards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const breakdown = getPointBreakdown();
  const userRank = leaderboard.findIndex((u) => u.id === profile?.id) + 1 || '--';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rewards</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Points Card */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Your Points</Text>
          <Text style={styles.pointsValue}>{profile?.points || 0}</Text>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>Rank #{userRank}</Text>
          </View>
        </View>

        {/* Time Period Selector */}
        <View style={styles.timePeriodContainer}>
          {['weekly', 'monthly', 'alltime'].map((period) => (
            <TouchableOpacity
              key={period}
              onPress={() => setTimePeriod(period)}
              style={[
                styles.timePeriodButton,
                timePeriod === period && styles.timePeriodButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.timePeriodText,
                  timePeriod === period && styles.timePeriodTextActive,
                ]}
              >
                {period === 'weekly'
                  ? 'Weekly'
                  : period === 'monthly'
                  ? 'Monthly'
                  : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Points Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Point Breakdown</Text>
          <View style={styles.breakdownContainer}>
            {breakdown.map((item, idx) => (
              <View key={idx} style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <Text style={styles.breakdownIcon}>{item.icon}</Text>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                </View>
                <Text style={styles.breakdownPoints}>+{item.points}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Badges */}
        {profile?.badges && profile.badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Earned Badges</Text>
            <View style={styles.badgesGrid}>
              {profile.badges.map((badge, idx) => (
                <View key={idx} style={styles.badgeCard}>
                  <Text style={styles.badgeIcon}>
                    {BADGE_ICONS[badge] || 'medal'}
                  </Text>
                  <Text style={styles.badgeLabel}>{badge.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {timePeriod === 'weekly'
              ? 'Weekly Leaderboard'
              : timePeriod === 'monthly'
              ? 'Monthly Leaderboard'
              : 'All-Time Leaderboard'}
          </Text>
          <View style={styles.leaderboardContainer}>
            {leaderboard.slice(0, 10).map((entry, idx) => (
              <View key={`${idx}-${entry.id || entry.phone}`} style={styles.leaderboardRow}>
                <Text style={[styles.rankNumber, getRankColor(idx)]}>
                  {idx + 1}
                </Text>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>
                    {entry.name || entry.phone}
                  </Text>
                  <Text style={styles.leaderboardPhone}>{entry.phone}</Text>
                </View>
                <Text style={styles.leaderboardPoints}>{entry.points || 0}</Text>
              </View>
            ))}
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getRankColor(index) {
  if (index === 0) return { color: COLORS.gold, fontWeight: '700' };
  if (index === 1) return { color: '#C0C0C0', fontWeight: '700' };
  if (index === 2) return { color: '#CD7F32', fontWeight: '700' };
  return { color: COLORS.gray600 };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  backButton: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray600,
  },
  pointsCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.white,
    marginVertical: 8,
  },
  rankBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  timePeriodContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  timePeriodButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  timePeriodButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  timePeriodText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  timePeriodTextActive: {
    color: COLORS.white,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: 12,
  },
  breakdownContainer: {
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownIcon: {
    fontSize: 18,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray700,
  },
  breakdownPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.green,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  badgeIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray900,
    textAlign: 'center',
  },
  leaderboardContainer: {
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 30,
  },
  leaderboardInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  leaderboardName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  leaderboardPhone: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 2,
  },
  leaderboardPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
  },
});
