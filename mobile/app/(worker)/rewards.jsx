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
import Svg, { Circle, Path, Polyline, Polygon } from 'react-native-svg';
import { workersApi } from '../../src/api/workers';
import { authApi } from '../../src/api/auth';

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
  super_active: '⭐',
  issue_solver: '🏆',
  team_player: '👥',
  prompt_responder: '⚡',
  perfect_attendance: '📅',
};

// SVG Icon Components
const CheckIcon = ({ size = 24, color = COLORS.green }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ScaleIcon = ({ size = 24, color = COLORS.blue }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M12 2L22 8V12L12 22L2 12V8L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 12V22" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StarIcon = ({ size = 24, color = COLORS.gold }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Svg>
);

const RatingStarSmall = ({ size = 14, color = COLORS.gold }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Svg>
);

const BREAKDOWN_ICONS = {
  check: 'check',
  scale: 'scale',
  star: 'star',
};

// Helper to render icon
const renderBreakdownIcon = (iconType) => {
  switch(iconType) {
    case 'check':
      return <CheckIcon />;
    case 'scale':
      return <ScaleIcon />;
    case 'star':
      return <StarIcon />;
    default:
      return <StarIcon />;
  }
};

const renderRatingIcon = () => <RatingStarSmall />;

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
        authApi.getMe(),
        workersApi.getLeaderboard({ period: timePeriod }),
        workersApi.getStats(),
      ]);

      setProfile(meRes.data || {});
      const leaderArray = Array.isArray(leaderRes.data) ? leaderRes.data : leaderRes.data?.items || [];
      setLeaderboard(leaderArray);
      setStats(statsRes.data || {});
    } catch (err) {
      console.error('Failed to load rewards:', err);
      setError('Failed to load rewards data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPointBreakdown = () => {
    // Use actual stats from backend
    return [
      { label: 'Tasks Completed Today', points: stats?.tasks_completed_today || 0, icon: 'check' },
      { label: 'Tasks Pending', points: stats?.tasks_pending || 0, icon: 'scale' },
      { label: 'Rating', points: Math.round((stats?.avg_rating || 0) * 10) / 10, icon: 'star' },
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
  
  // Find current user in leaderboard
  const userLeaderboardEntry = leaderboard.find((u) => u.is_me) || {};
  const userPoints = userLeaderboardEntry.total_points || 0;
  const userRank = userLeaderboardEntry.rank || '--';

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
          <Text style={styles.pointsValue}>{userPoints}</Text>
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
                  <View style={styles.breakdownIcon}>
                    {renderBreakdownIcon(item.icon)}
                  </View>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                </View>
                <Text style={styles.breakdownPoints}>{item.points}</Text>
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
            {leaderboard.slice(0, 10).map((entry, idx) => {
              const isTop3 = idx < 3;
              const backgroundColor = 
                idx === 0 ? '#FEF3C7' : 
                idx === 1 ? '#F3F4F6' : 
                idx === 2 ? '#FED7AA' : 
                COLORS.white;
              
              return (
              <View key={`${idx}-${entry.id || entry.phone}`} style={[styles.leaderboardRow, { backgroundColor }]}>
                <Text style={[styles.rankNumber, getRankColor(idx)]}>
                  {idx + 1}
                </Text>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>
                    {entry.name}
                  </Text>
                  <View style={styles.leaderboardRatingContainer}>
                    <Text style={styles.leaderboardSubtext}>{entry.tasks_completed} tasks</Text>
                    <Text style={styles.leaderboardSubtext}> • </Text>
                    {entry.avg_rating ? (
                      <View style={styles.leaderboardRating}>
                        {renderRatingIcon()}
                        <Text style={styles.leaderboardRatingText}> {entry.avg_rating}</Text>
                      </View>
                    ) : (
                      <Text style={styles.leaderboardSubtext}>No rating</Text>
                    )}
                  </View>
                </View>
                <Text style={[styles.leaderboardPoints, isTop3 && { fontSize: 16, fontWeight: '900' }]}>
                  {entry.total_points || 0}
                </Text>
              </View>
              );
            })}
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
    backgroundColor: COLORS.gray50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
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
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  pointsLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pointsValue: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.white,
    marginVertical: 12,
  },
  rankBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  timePeriodContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  timePeriodButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  timePeriodButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  timePeriodText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray700,
  },
  timePeriodTextActive: {
    color: COLORS.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.gray900,
    marginBottom: 14,
  },
  breakdownContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray800,
  },
  breakdownPoints: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.green,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray900,
    textAlign: 'center',
  },
  leaderboardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 35,
    textAlign: 'center',
  },
  leaderboardInfo: {
    flex: 1,
    marginHorizontal: 14,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  leaderboardRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  leaderboardSubtext: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  leaderboardRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardRatingText: {
    fontSize: 12,
    color: COLORS.gray600,
    fontWeight: '600',
    marginLeft: 2,
  },
  leaderboardPoints: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '500',
  },
});
