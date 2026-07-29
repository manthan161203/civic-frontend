import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, SectionList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, ScrollView, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUiStore } from '../../src/store/uiStore';
import { getErrorMessage } from '../../src/api/errors';
import { workersApi } from '../../src/api/workers';
import { Colors, PriorityColors, StatusColors, Typography, Radius, Spacing, Shadow } from '../../src/theme';

const PRIORITY_COLOR = {
  critical: PriorityColors.critical.dot,
  high:     PriorityColors.high.dot,
  medium:   PriorityColors.medium.dot,
  low:      PriorityColors.low.dot,
};
const PRIORITY_BG = {
  critical: PriorityColors.critical.bg,
  high:     PriorityColors.high.bg,
  medium:   PriorityColors.medium.bg,
  low:      PriorityColors.low.bg,
};

const STATUS_META = {
  assigned:    { label: 'Assigned',    bg: StatusColors.assigned.bg,    text: StatusColors.assigned.text,    icon: 'person-outline' },
  in_progress: { label: 'In Progress', bg: StatusColors.in_progress.bg, text: StatusColors.in_progress.text, icon: 'construct-outline' },
  resolved:    { label: 'Resolved',    bg: StatusColors.resolved.bg,    text: StatusColors.resolved.text,    icon: 'checkmark-circle-outline' },
  closed:      { label: 'Closed',      bg: StatusColors.closed.bg,      text: StatusColors.closed.text,      icon: 'lock-closed-outline' },
  blocked:     { label: 'Blocked',     bg: StatusColors.blocked.bg,     text: StatusColors.blocked.text,     icon: 'warning-outline' },
  rejected:    { label: 'Rejected',    bg: StatusColors.rejected.bg,    text: StatusColors.rejected.text,    icon: 'close-circle-outline' },
};

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

function SummaryBanner({ tasks, history }) {
  const assigned   = tasks.filter((t) => t.status === 'assigned').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const blocked    = tasks.filter((t) => t.status === 'blocked').length;
  const done       = history.filter((t) => ['resolved', 'closed'].includes(t.status)).length;

  return (
    <View style={styles.banner}>
      {[
        { label: 'Assigned',    value: assigned,   color: '#fff' },
        { label: 'In Progress', value: inProgress, color: '#fef3c7' },
        { label: 'Blocked',     value: blocked,    color: '#fee2e2' },
        { label: 'Completed',   value: done,       color: '#d1fae5' },
      ].map(({ label, value, color }, i, arr) => (
        <View key={label} style={{ flexDirection: 'row', flex: 1 }}>
          <View style={styles.bannerItem}>
            <Text style={[styles.bannerNum, { color }]}>{value}</Text>
            <Text style={styles.bannerLabel}>{label}</Text>
          </View>
          {i < arr.length - 1 && <View style={styles.bannerDivider} />}
        </View>
      ))}
    </View>
  );
}

function TaskCard({ item, onPress, onAccept, onReject }) {
  const pc = PRIORITY_COLOR[item.priority] || '#9ca3af';
  const pb = PRIORITY_BG[item.priority]   || '#f9fafb';
  const sm = STATUS_META[item.status]     || { label: item.status, bg: '#f3f4f6', text: '#6b7280', icon: 'ellipse-outline' };
  const showQuickActions = item.status === 'assigned' && onAccept;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.stripe, { backgroundColor: pc }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.priorityChip, { backgroundColor: pb, borderColor: pc }]}>
            <View style={[styles.priorityDot, { backgroundColor: pc }]} />
            <Text style={[styles.priorityLabel, { color: pc }]}>
              {item.priority?.charAt(0).toUpperCase() + item.priority?.slice(1)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sm.bg }]}>
            <Ionicons name={sm.icon} size={11} color={sm.text} />
            <Text style={[styles.statusText, { color: sm.text }]}>{sm.label}</Text>
          </View>
        </View>

        <Text style={styles.issueType}>{item.issue_type?.replace(/_/g, ' ')}</Text>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Ionicons name="location-outline" size={12} color="#9ca3af" />
            <Text style={styles.footerText} numberOfLines={1}>{item.address || 'No address'}</Text>
          </View>
          <Text style={styles.age}>{daysSince(item.created_at)}</Text>
        </View>

        {showQuickActions && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAccept}
              onPress={(e) => { e.stopPropagation?.(); onAccept(item.id); }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={13} color="#fff" />
              <Text style={styles.quickAcceptText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickReject}
              onPress={(e) => { e.stopPropagation?.(); onReject(item.id); }}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={13} color="#ef4444" />
              <Text style={styles.quickRejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#d1d5db" style={{ marginRight: 12 }} />
    </TouchableOpacity>
  );
}

function SectionHeader({ title, count, color = '#059669' }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, { backgroundColor: color }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.sectionCount, { backgroundColor: color + '22' }]}>
        <Text style={[styles.sectionCountText, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

const ACTIVE_SECTIONS = [
  { key: 'assigned',    title: 'Assigned',    color: '#1e40af' },
  { key: 'in_progress', title: 'In Progress', color: '#f59e0b' },
  { key: 'blocked',     title: 'Blocked',     color: '#ef4444' },
];

const PRIORITY_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'high',     label: 'High' },
  { key: 'medium',   label: 'Medium' },
  { key: 'low',      label: 'Low' },
];

const HISTORY_STATUS_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed',   label: 'Closed' },
];

const SORT_OPTIONS = [
  { key: 'newest',   label: 'Newest',   icon: 'arrow-down' },
  { key: 'oldest',   label: 'Oldest',   icon: 'arrow-up' },
  { key: 'priority', label: 'Priority', icon: 'flag' },
];

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function FilterPills({ options, selected, onSelect, activeColor = '#059669' }) {
  return (
    <View style={styles.pillsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
      >
        {options.map(({ key, label }) => {
          const isActive = selected === key;
          const dotColor = key !== 'all' ? PRIORITY_COLOR[key] : null;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.pill, isActive && { backgroundColor: activeColor, borderColor: activeColor }]}
              onPress={() => onSelect(key)}
              activeOpacity={0.75}
            >
              {dotColor && !isActive && (
                <View style={[styles.pillDot, { backgroundColor: dotColor }]} />
              )}
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SortBar({ sort, onSort }) {
  return (
    <View style={styles.sortBar}>
      <Text style={styles.sortLabel}>Sort:</Text>
      {SORT_OPTIONS.map(({ key, label, icon }) => (
        <TouchableOpacity
          key={key}
          style={[styles.sortBtn, sort === key && styles.sortBtnActive]}
          onPress={() => onSort(key)}
        >
          <Ionicons name={icon} size={12} color={sort === key ? '#059669' : '#9ca3af'} />
          <Text style={[styles.sortText, sort === key && styles.sortTextActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const { addToast } = useUiStore();
  const [tab, setTab]                   = useState('active');
  const [tasks, setTasks]               = useState([]);
  const [history, setHistory]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [priorityFilter, setPriority]   = useState('all');
  const [historyStatus, setHistStatus]  = useState('all');
  const [sort, setSort]                 = useState('newest');
  const [rejectModal, setRejectModal]   = useState(null); // task id
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // task id being acted on

  const load = useCallback(async () => {
    try {
      const [activeRes, histRes] = await Promise.all([
        workersApi.getTasks(),
        workersApi.getTaskHistory({ page: 1, size: 50 }),
      ]);
      setTasks(activeRes.data.items || activeRes.data);
      setHistory(histRes.data.items || histRes.data);
    } catch (err) {
      console.warn('Failed to load worker tasks:', err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load().finally(() => setLoading(false));
  }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleAccept = async (taskId) => {
    setActionLoading(taskId);
    try {
      await workersApi.acceptTask(taskId);
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'in_progress' } : t));
      addToast('Task accepted!', 'success');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to accept task');
      addToast(errorMsg, 'error');
    }
    setActionLoading(null);
  };

  const handleReject = (taskId) => {
    setRejectReason('');
    setRejectModal(taskId);
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) return;
    const taskId = rejectModal;
    setRejectModal(null);
    setActionLoading(taskId);
    try {
      await workersApi.rejectTask(taskId, rejectReason.trim());
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      addToast('Task rejected successfully', 'success');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to reject task');
      addToast(errorMsg, 'error');
    }
    setActionLoading(null);
  };

  // ── Active tab filtering ──────────────────────────────────────────────────
  const filteredTasks = priorityFilter === 'all'
    ? tasks
    : tasks.filter((t) => t.priority === priorityFilter);

  const sections = ACTIVE_SECTIONS
    .map(({ key, title, color }) => ({
      key, title, color,
      data: filteredTasks.filter((t) => t.status === key),
    }))
    .filter((s) => s.data.length > 0);

  // ── History tab filtering + sorting ──────────────────────────────────────
  let filteredHistory = historyStatus === 'all'
    ? history
    : history.filter((t) => t.status === historyStatus);

  filteredHistory = [...filteredHistory].sort((a, b) => {
    if (sort === 'newest')   return new Date(b.created_at) - new Date(a.created_at);
    if (sort === 'oldest')   return new Date(a.created_at) - new Date(b.created_at);
    if (sort === 'priority') return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
    return 0;
  });

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#059669" size="large" />;

  return (
    <View style={styles.container}>
      <SummaryBanner tasks={tasks} history={history} />

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'active',  label: 'Active',  count: tasks.length },
          { key: 'history', label: 'History', count: history.length },
        ].map(({ key, label, count }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            <View style={[styles.tabBadge, tab === key && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, tab === key && styles.tabBadgeTextActive]}>{count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'active' ? (
        <>
          {/* Priority filter */}
          <FilterPills
            options={PRIORITY_FILTERS}
            selected={priorityFilter}
            onSelect={setPriority}
          />
          {sections.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="clipboard-outline" size={48} color="#d1d5db" />
              </View>
              <Text style={styles.emptyTitle}>
                {priorityFilter === 'all' ? 'No active tasks' : `No ${priorityFilter} priority tasks`}
              </Text>
              <Text style={styles.emptySubtitle}>
                {priorityFilter === 'all'
                  ? 'Go online to start receiving task assignments'
                  : 'Try a different priority filter'}
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item, idx) => item.id ?? String(idx)}
              renderSectionHeader={({ section }) => (
                <SectionHeader title={section.title} count={section.data.length} color={section.color} />
              )}
              renderItem={({ item }) => (
                <TaskCard
                  item={item}
                  onPress={() => router.push(`/task/${item.id}`)}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              )}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
              }
              contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
              stickySectionHeadersEnabled={false}
              SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          )}
        </>
      ) : (
        <>
          {/* History status filter + sort */}
          <FilterPills
            options={HISTORY_STATUS_FILTERS}
            selected={historyStatus}
            onSelect={setHistStatus}
            activeColor="#059669"
          />
          <SortBar sort={sort} onSort={setSort} />
          <FlatList
            data={filteredHistory}
            keyExtractor={(item, idx) => item.id ?? String(idx)}
            renderItem={({ item }) => (
              <TaskCard item={item} onPress={() => router.push(`/task/${item.id}`)} />
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="checkmark-done-circle-outline" size={48} color="#d1d5db" />
                </View>
                <Text style={styles.emptyTitle}>No completed tasks</Text>
                <Text style={styles.emptySubtitle}>Resolved tasks will appear here</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        </>
      )}

      {/* Reject reason modal */}
      <Modal visible={!!rejectModal} transparent animationType="fade" onRequestClose={() => setRejectModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reject Task</Text>
            <Text style={styles.modalSub}>Please provide a reason for rejection:</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Enter reason..."
              multiline
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, !rejectReason.trim() && { opacity: 0.4 }]}
                onPress={submitReject}
                disabled={!rejectReason.trim()}
              >
                <Text style={styles.modalSubmitText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  banner: {
    flexDirection: 'row', backgroundColor: Colors.worker,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
  },
  bannerItem:    { flex: 1, alignItems: 'center' },
  bannerNum:     { fontSize: Typography['2xl'], fontWeight: Typography.extrabold },
  bannerLabel:   { fontSize: Typography.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  bannerDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },

  tabs: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.divider, paddingHorizontal: Spacing.lg,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:          { borderBottomColor: Colors.worker },
  tabText:            { fontSize: Typography.base, color: Colors.textLight, fontWeight: Typography.semibold },
  tabTextActive:      { color: Colors.worker },
  tabBadge:           { backgroundColor: Colors.bgLight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  tabBadgeActive:     { backgroundColor: StatusColors.resolved.bg },
  tabBadgeText:       { fontSize: Typography.xs + 1, fontWeight: Typography.bold, color: Colors.textLight },
  tabBadgeTextActive: { color: Colors.worker },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  sectionDot:       { width: 8, height: 8, borderRadius: 4 },
  sectionTitle:     { fontSize: Typography.sm + 1, fontWeight: Typography.bold, color: Colors.textSecondary, flex: 1 },
  sectionCount:     { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: 10 },
  sectionCountText: { fontSize: Typography.xs + 1, fontWeight: Typography.extrabold },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg, borderRadius: Radius.md, overflow: 'hidden',
    ...Shadow.sm,
  },
  stripe:   { width: 5, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 13 },

  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.sm,
  },
  priorityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.sm, borderWidth: 1,
  },
  priorityDot:   { width: 6, height: 6, borderRadius: 3 },
  priorityLabel: { fontSize: Typography.xs + 1, fontWeight: Typography.bold },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: 10,
  },
  statusText: { fontSize: Typography.xs + 1, fontWeight: Typography.bold },

  issueType:  { fontSize: Typography.xs + 1, color: Colors.textLight, textTransform: 'capitalize', fontWeight: Typography.semibold, marginBottom: 4 },
  desc:       { fontSize: Typography.base, color: Colors.textPrimary, fontWeight: Typography.medium, lineHeight: 20, marginBottom: Spacing.sm },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  footerText: { fontSize: Typography.sm, color: Colors.textLight, flex: 1 },
  age:        { fontSize: Typography.xs + 1, color: Colors.textDisabled, fontWeight: Typography.medium, marginLeft: Spacing.sm },

  empty:         { alignItems: 'center', marginTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyIcon:     { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.bgLight, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle:    { fontSize: Typography.lg + 1, fontWeight: Typography.bold, color: Colors.textSecondary },
  emptySubtitle: { fontSize: Typography.sm + 1, color: Colors.textLight, textAlign: 'center', lineHeight: 20 },

  // Filter pills
  pillsContainer: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  pills:        { paddingHorizontal: Spacing.lg, paddingVertical: 10, gap: 8, alignItems: 'center', flexDirection: 'row' },
  pill:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  pillDot:      { width: 7, height: 7, borderRadius: 4 },
  pillText:     { fontSize: Typography.sm + 1, fontWeight: Typography.semibold, color: Colors.textMuted },
  pillTextActive: { color: Colors.white },

  // Quick actions on assigned cards
  quickActions:     { flexDirection: 'row', gap: Spacing.sm, marginTop: 10 },
  quickAccept:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.worker, borderRadius: Radius.sm, paddingVertical: 7 },
  quickAcceptText:  { color: Colors.white, fontSize: Typography.sm, fontWeight: Typography.bold },
  quickReject:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1.5, borderColor: Colors.danger, borderRadius: Radius.sm, paddingVertical: 7 },
  quickRejectText:  { color: Colors.danger, fontSize: Typography.sm, fontWeight: Typography.bold },

  // Reject modal
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  modalBox:         { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xl },
  modalTitle:       { fontSize: Typography.xl - 1, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: 4 },
  modalSub:         { fontSize: Typography.base, color: Colors.textMuted, marginBottom: 12 },
  modalInput:       { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: Typography.base, color: Colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  modalBtns:        { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  modalCancel:      { paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  modalCancelText:  { color: Colors.textMuted, fontWeight: Typography.semibold },
  modalSubmit:      { backgroundColor: Colors.danger, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.sm },
  modalSubmitText:  { color: Colors.white, fontWeight: Typography.bold },

  // Sort bar
  sortBar:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  sortLabel:    { fontSize: Typography.sm, color: Colors.textLight, fontWeight: Typography.semibold, marginRight: 4 },
  sortBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  sortBtnActive:{ borderColor: Colors.worker, backgroundColor: PriorityColors.low.bg },
  sortText:     { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textLight },
  sortTextActive: { color: Colors.worker },
});
