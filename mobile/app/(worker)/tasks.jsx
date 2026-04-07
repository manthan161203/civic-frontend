import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, SectionList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, ScrollView, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUiStore } from '../../src/store/uiStore';
import { getErrorMessage } from '../../src/lib/errorHandler';
import { workersApi } from '../../src/api/workers';

const PRIORITY_COLOR = { critical: '#7c3aed', high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const PRIORITY_BG    = { critical: '#f5f3ff', high: '#fef2f2', medium: '#fffbeb', low: '#f0fdf4' };

const STATUS_META = {
  assigned:    { label: 'Assigned',    bg: '#dbeafe', text: '#1e40af', icon: 'person-outline' },
  in_progress: { label: 'In Progress', bg: '#fef3c7', text: '#92400e', icon: 'construct-outline' },
  resolved:    { label: 'Resolved',    bg: '#d1fae5', text: '#065f46', icon: 'checkmark-circle-outline' },
  closed:      { label: 'Closed',      bg: '#f3f4f6', text: '#6b7280', icon: 'lock-closed-outline' },
  blocked:     { label: 'Blocked',     bg: '#fee2e2', text: '#991b1b', icon: 'warning-outline' },
  rejected:    { label: 'Rejected',    bg: '#fce7f3', text: '#9d174d', icon: 'close-circle-outline' },
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
  container: { flex: 1, backgroundColor: '#f9fafb' },

  banner: {
    flexDirection: 'row', backgroundColor: '#059669',
    paddingVertical: 14, paddingHorizontal: 8,
  },
  bannerItem:    { flex: 1, alignItems: 'center' },
  bannerNum:     { fontSize: 20, fontWeight: '800' },
  bannerLabel:   { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  bannerDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },

  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingHorizontal: 16,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive:          { borderBottomColor: '#059669' },
  tabText:            { fontSize: 14, color: '#9ca3af', fontWeight: '600' },
  tabTextActive:      { color: '#059669' },
  tabBadge:           { backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  tabBadgeActive:     { backgroundColor: '#d1fae5' },
  tabBadgeText:       { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  tabBadgeTextActive: { color: '#059669' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  sectionDot:       { width: 8, height: 8, borderRadius: 4 },
  sectionTitle:     { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1 },
  sectionCount:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sectionCountText: { fontSize: 11, fontWeight: '800' },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  stripe:   { width: 5, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 13 },

  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  priorityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  priorityDot:   { width: 6, height: 6, borderRadius: 3 },
  priorityLabel: { fontSize: 11, fontWeight: '700' },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  issueType:  { fontSize: 11, color: '#9ca3af', textTransform: 'capitalize', fontWeight: '600', marginBottom: 4 },
  desc:       { fontSize: 14, color: '#111827', fontWeight: '500', lineHeight: 20, marginBottom: 8 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  footerText: { fontSize: 12, color: '#9ca3af', flex: 1 },
  age:        { fontSize: 11, color: '#d1d5db', fontWeight: '500', marginLeft: 8 },

  empty:         { alignItems: 'center', marginTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyIcon:     { width: 88, height: 88, borderRadius: 44, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle:    { fontSize: 17, fontWeight: '700', color: '#374151' },
  emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },

  // Filter pills
  pillsContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pills:        { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center', flexDirection: 'row' },
  pill:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  pillDot:      { width: 7, height: 7, borderRadius: 4 },
  pillText:     { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  pillTextActive: { color: '#fff' },

  // Quick actions on assigned cards
  quickActions:     { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickAccept:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#059669', borderRadius: 8, paddingVertical: 7 },
  quickAcceptText:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  quickReject:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 8, paddingVertical: 7 },
  quickRejectText:  { color: '#ef4444', fontSize: 12, fontWeight: '700' },

  // Reject modal
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  modalBox:         { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle:       { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modalSub:         { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  modalInput:       { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', minHeight: 80, textAlignVertical: 'top' },
  modalBtns:        { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  modalCancel:      { paddingHorizontal: 16, paddingVertical: 10 },
  modalCancelText:  { color: '#6b7280', fontWeight: '600' },
  modalSubmit:      { backgroundColor: '#ef4444', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  modalSubmitText:  { color: '#fff', fontWeight: '700' },

  // Sort bar
  sortBar:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  sortLabel:    { fontSize: 12, color: '#9ca3af', fontWeight: '600', marginRight: 4 },
  sortBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  sortBtnActive:{ borderColor: '#059669', backgroundColor: '#f0fdf4' },
  sortText:     { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  sortTextActive: { color: '#059669' },
});
