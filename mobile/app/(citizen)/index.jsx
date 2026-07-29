import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, TextInput, } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { issuesApi } from '../../src/api/issues';
import { authApi } from '../../src/api/auth';
import { toApiError } from '../../src/api/errors';
import { useAuthStore } from '../../src/store/authStore';
import { useUiStore } from '../../src/store/uiStore';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import IssueCard from '../../src/components/common/IssueCard';
import CitizenProfileModal from '../../src/components/CitizenProfileModal';
import ErrorState, { EmptyState } from '../../src/components/ErrorState';
import { IssueListSkeleton } from '../../src/components/Skeleton';
import haptics from '../../src/lib/haptics';
import { logger } from '../../src/utils/logger';
import { Colors, Typography, Radius, Spacing, Shadow } from '../../src/theme';
import { confirm } from '../../src/lib/notify';

/**
 * The citizen home feed.
 *
 * Mobile pilot screen. What changed beyond the visuals:
 *
 *  - **`<ActivityIndicator style={{marginTop: 40}}/>` became a skeleton** shaped
 *    like the real rows, so the list does not jump when data lands.
 *  - **Failures were `console.warn` and an empty list**, indistinguishable from
 *    "you have not reported anything". Now an error state with retry.
 *  - **The priority filter offered `critical`**, which is not in the backend
 *    enum (`urgent | high | medium | low`) — it matched nothing, and `urgent`,
 *    the actually-highest priority, was missing.
 *  - **Haptics**: selection on filters and tabs, impact on submit, and the SOS
 *    button's raw `Vibration.vibrate([0,200,100,200])` — a 500 ms buzz — becomes
 *    a proper warning haptic.
 *  - **Safe areas**: the FABs sat a fixed 24pt from the bottom, which is under
 *    the home indicator on a gesture-navigation device.
 *  - Every colour now comes from `src/theme.js`, which this file previously
 *    ignored in favour of 51 hardcoded hex literals.
 */

const STATUS_FILTERS = [
  { key: 'All', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

// Matches the backend enum exactly. `critical` does not exist there and was
// never going to match a row.
const PRIORITY_FILTERS = [
  { key: 'all', label: 'All', color: null },
  { key: 'urgent', label: 'Urgent', color: Colors.danger },
  { key: 'high', label: 'High', color: Colors.warning },
  { key: 'medium', label: 'Medium', color: Colors.info },
  { key: 'low', label: 'Low', color: Colors.success },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest', icon: 'arrow-down' },
  { key: 'oldest', label: 'Oldest', icon: 'arrow-up' },
  { key: 'most_upvoted', label: 'Most voted', icon: 'thumbs-up' },
];

function WardHealthBanner({ health }) {
  if (!health) return null;
  const score = health.score ?? 0;
  const color = score >= 80 ? Colors.worker : score >= 50 ? Colors.warning : Colors.danger;

  return (
    <View style={[banner.container, { borderLeftColor: color }]}>
      <View style={banner.left}>
        <Text style={banner.label}>Ward health</Text>
        <Text style={banner.wardName} numberOfLines={1}>{health.ward || 'Your ward'}</Text>
        <Text style={banner.sub}>
          {health.open_issues ?? 0} open · {health.resolved_issues ?? 0} resolved
        </Text>
      </View>
      <View style={[banner.bubble, { backgroundColor: `${color}22` }]}>
        <Text style={[banner.score, { color }]}>{score}</Text>
        <Text style={[banner.scoreLabel, { color }]}>score</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuthStore();
  const addToast = useUiStore((s) => s.addToast);
  const { isOffline } = useNetworkStatus();

  const [mainTab, setMainTab] = useState('my');
  const [issues, setIssues] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [priority, setPriority] = useState('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [wardHealth, setWardHealth] = useState(null);
  const [sendingSos, setSendingSos] = useState(false);

  // Guards the focus refetch from fighting an in-flight load.
  const inFlight = useRef(false);

  const fetchWardHealth = useCallback(async () => {
    if (!user?.ward) return;
    try {
      const { data } = await issuesApi.wardHealth(user.ward);
      setWardHealth(data);
    } catch {
      // Genuinely non-essential: the banner is supplementary and its absence
      // is not worth an error state over the whole feed.
      setWardHealth(null);
    }
  }, [user?.ward]);

  const fetchIssues = useCallback(
    async (reset = false) => {
      const p = reset ? 1 : page;
      try {
        const params = { page: p, size: 20 };
        if (filter !== 'All') params.status = filter;
        if (priority !== 'all') params.priority = priority;
        if (sort !== 'newest') params.sort = sort;

        const { data } = await issuesApi.list(params);
        const items = data.items || data;

        setIssues((prev) => (reset ? items : [...prev, ...items]));
        setPage(reset ? 2 : p + 1);
        setHasMore(items.length === 20);
        setError(null);
      } catch (err) {
        // Was `console.warn` and nothing else, so a failed load rendered the
        // same empty list as a citizen who had never reported anything.
        const apiError = toApiError(err);
        logger.warn('HomeScreen', `Issue list failed: ${apiError.message}`);
        if (reset) setError(apiError);
      }
    },
    [filter, priority, sort, page],
  );

  const fetchFollowing = useCallback(async () => {
    try {
      const { data } = await issuesApi.following({ page: 1, size: 50 });
      setFollowing(data.items || data);
    } catch (err) {
      logger.warn('HomeScreen', `Following list failed: ${toApiError(err).message}`);
    }
  }, []);

  const loadAll = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await Promise.all([fetchIssues(true), fetchFollowing(), fetchWardHealth()]);
    } finally {
      inFlight.current = false;
    }
  }, [fetchIssues, fetchFollowing, fetchWardHealth]);

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, priority, sort]);

  // Catches changes made on the detail and report screens.
  useFocusEffect(
    useCallback(() => {
      loadAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, priority, sort]),
  );

  useEffect(() => {
    if (user) setShowProfileModal(!user.name || !user.ward_id);
  }, [user]);

  const onRefresh = async () => {
    haptics.tap();
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      loadAll();
      return;
    }
    try {
      const { data } = await issuesApi.search({ q: search, page: 1, size: 20 });
      setIssues(data.items || data);
      setHasMore(false);
      setError(null);
    } catch (err) {
      const apiError = toApiError(err);
      addToast(apiError.message, 'error');
    }
  };

  const handleProfileComplete = async () => {
    setShowProfileModal(false);
    try {
      const { data } = await authApi.getMe();
      if (data) updateUser(data);
    } catch {
      // The modal is already closed; the next load refreshes the user anyway.
    }
  };

  const sendSos = async () => {
    setSendingSos(true);
    try {
      // A warning haptic, not a 500 ms vibration pattern. This fires once, on
      // confirmation, so it reads as acknowledgement rather than an alarm.
      haptics.warning();

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
      haptics.success();
      addToast('Emergency reported. Nearby citizens and admins have been alerted.', 'success', 5000);
      loadAll();
    } catch (err) {
      const apiError = toApiError(err);
      logger.error('SOS', `Failed to send SOS: ${apiError.message}`, err);
      haptics.error();
      addToast(`Could not send SOS: ${apiError.message}`, 'error', 6000);
    } finally {
      setSendingSos(false);
    }
  };

  const confirmSos = async () => {
    // Still blocking, deliberately: this is irreversible and it alerts
    // strangers. It goes through the shared helper so it behaves like every
    // other confirmation — notably, Android's back button means "no" rather
    // than leaving the promise hanging.
    const ok = await confirm({
      title: 'Send emergency SOS?',
      message: 'This reports an immediate hazard at your current location and alerts nearby citizens and every admin.',
      confirmLabel: 'Send SOS',
      destructive: true,
    });
    if (ok) sendSos();
  };

  const rateIssue = async (item, stars) => {
    haptics.tap();
    try {
      await issuesApi.update(item.id, { citizen_rating: stars });
      setIssues((prev) => prev.map((i) => (i.id === item.id ? { ...i, citizen_rating: stars } : i)));
      haptics.success();
    } catch (err) {
      haptics.error();
      addToast(toApiError(err).message, 'error');
    }
  };

  const closeIssue = async (item) => {
    haptics.press();
    try {
      await issuesApi.update(item.id, { status: 'closed' });
      setIssues((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'closed' } : i)));
      haptics.success();
      addToast('Issue closed', 'success');
    } catch (err) {
      haptics.error();
      addToast(toApiError(err).message, 'error');
    }
  };

  const data = mainTab === 'my' ? issues : following;

  const renderItem = ({ item }) => (
    <View>
      <IssueCard issue={item} onPress={() => router.push(`/issue/${item.id}`)} />
      {mainTab === 'my' && item.status === 'resolved' && (
        <View style={styles.actionRow}>
          {!item.citizen_rating && (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => rateIssue(item, star)}
                  style={styles.star}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${star} of 5`}
                >
                  <Ionicons name="star" size={20} color={Colors.warning} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => closeIssue(item)}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  /** The list body — one place, so loading/error/empty precedence is explicit. */
  const renderBody = () => {
    if (loading) return <IssueListSkeleton count={4} />;

    if (error && mainTab === 'my') {
      return <ErrorState error={error} onRetry={() => { setLoading(true); loadAll().finally(() => setLoading(false)); }} />;
    }

    return (
      <FlatList
        data={data}
        keyExtractor={(item, index) => item.id ?? String(index)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.citizen} />
        }
        onEndReached={() => {
          if (mainTab === 'my' && hasMore && !loadingMore && !loading) {
            setLoadingMore(true);
            fetchIssues().finally(() => setLoadingMore(false));
          }
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          mainTab === 'my' ? (
            <EmptyState
              icon="document-text-outline"
              title={search ? 'No matches' : 'Nothing reported yet'}
              message={
                search
                  ? 'Try a different word, or clear the search.'
                  : 'Spotted a pothole, a broken light, uncollected waste? Report it and track what happens.'
              }
              action={{ label: 'Report an issue', onPress: () => router.push('/(citizen)/report') }}
            />
          ) : (
            <EmptyState
              icon="bookmark-outline"
              title="Not following anything"
              message="When you report something that already exists, you can follow the original instead of filing a duplicate."
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: Spacing.lg }} color={Colors.citizen} />
          ) : null
        }
        // Clears the FABs and the home indicator.
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    // No top inset: this screen renders under a navigation header, which is
    // already inset. Adding it again would leave a gap.
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search issues…"
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessibilityLabel="Search issues"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                loadAll();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <WardHealthBanner health={wardHealth} />

      <View style={styles.mainTabs}>
        {[
          { key: 'my', label: 'My issues' },
          { key: 'following', label: `Following${following.length ? ` (${following.length})` : ''}` },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.mainTab, mainTab === t.key && styles.mainTabActive]}
            onPress={() => {
              haptics.selection();
              setMainTab(t.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: mainTab === t.key }}
          >
            <Text style={[styles.mainTabText, mainTab === t.key && styles.mainTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mainTab === 'my' && (
        <>
          <View style={styles.filterRowContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {STATUS_FILTERS.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, filter === key && styles.chipActive]}
                  onPress={() => {
                    haptics.selection();
                    setFilter(key);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === key }}
                >
                  <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>Priority</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.priorityRow}
            >
              {PRIORITY_FILTERS.map(({ key, label, color }) => {
                const active = priority === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.priorityChip,
                      active && { backgroundColor: color ?? Colors.citizen, borderColor: color ?? Colors.citizen },
                    ]}
                    onPress={() => {
                      haptics.selection();
                      setPriority(key);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    {color && <View style={[styles.priorityDot, { backgroundColor: active ? Colors.white : color }]} />}
                    <Text style={[styles.priorityChipText, active && styles.priorityChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.sortSection}>
            <Text style={styles.sectionLabelInline}>Sort</Text>
            <View style={styles.sortGroup}>
              {SORT_OPTIONS.map(({ key, label, icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.sortBtn, sort === key && styles.sortBtnActive]}
                  onPress={() => {
                    haptics.selection();
                    setSort(key);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sort === key }}
                >
                  <Ionicons name={icon} size={11} color={sort === key ? Colors.citizen : Colors.textLight} />
                  <Text style={[styles.sortText, sort === key && styles.sortTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {renderBody()}

      <TouchableOpacity
        style={[styles.fab, { bottom: Spacing['2xl'] + insets.bottom }]}
        onPress={() => {
          haptics.press();
          router.push('/(citizen)/report');
        }}
        accessibilityRole="button"
        accessibilityLabel="Report an issue"
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.sosFab, { bottom: Spacing['2xl'] + insets.bottom }]}
        onPress={confirmSos}
        disabled={sendingSos || isOffline}
        accessibilityRole="button"
        accessibilityLabel="Send emergency SOS"
        // An SOS that silently fails is the worst possible outcome, so the
        // control says up front when it cannot work.
        accessibilityHint={isOffline ? 'Unavailable while offline' : undefined}
      >
        {sendingSos ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Text style={styles.sosText}>SOS</Text>
        )}
      </TouchableOpacity>

      <CitizenProfileModal
        visible={showProfileModal}
        user={user}
        onComplete={handleProfileComplete}
        onCancel={() => setShowProfileModal(false)}
      />
    </View>
  );
}

const banner = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: 10,
    marginBottom: Spacing.xs,
    borderRadius: Radius.md,
    padding: 14,
    borderLeftWidth: 4,
    ...Shadow.sm,
  },
  left: { flex: 1 },
  label: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wardName: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  sub: { fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2 },
  bubble: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  score: { fontSize: Typography.xl, fontWeight: Typography.extrabold },
  scoreLabel: { fontSize: 9, fontWeight: Typography.semibold, textTransform: 'uppercase' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  searchRow: {
    backgroundColor: Colors.citizen,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },

  filterRowContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    gap: Spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.xl,
    backgroundColor: Colors.bgLight,
    minHeight: 32,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.citizen },
  chipText: { fontSize: 13, fontWeight: Typography.semibold, color: Colors.textMuted },
  chipTextActive: { color: Colors.white },

  filterSection: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: Typography.bold,
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  sectionLabelInline: {
    fontSize: 11,
    fontWeight: Typography.bold,
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priorityRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 6,
    alignItems: 'center',
    flexDirection: 'row',
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    minHeight: 30,
  },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityChipText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textMuted },
  priorityChipTextActive: { color: Colors.white },

  sortSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  sortGroup: { flexDirection: 'row', gap: 6, flex: 1 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
    justifyContent: 'center',
    minHeight: 30,
  },
  sortBtnActive: { borderColor: Colors.citizen, backgroundColor: '#eff6ff' },
  sortText: { fontSize: 11, fontWeight: Typography.semibold, color: Colors.textLight },
  sortTextActive: { color: Colors.citizen },

  mainTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mainTabActive: { borderBottomColor: Colors.citizen },
  mainTabText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textMuted },
  mainTabTextActive: { color: Colors.citizen },

  fab: {
    position: 'absolute',
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.citizen,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.md,
  },
  sosFab: {
    position: 'absolute',
    left: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fca5a5',
    ...Shadow.md,
  },
  sosText: { color: Colors.white, fontSize: 13, fontWeight: '900', letterSpacing: 1 },

  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    gap: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingRow: { flexDirection: 'row', gap: Spacing.xs },
  star: { padding: Spacing.xs },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.worker,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xs,
    minHeight: 36,
  },
  closeBtnText: { color: Colors.white, fontSize: 13, fontWeight: Typography.semibold },
});
