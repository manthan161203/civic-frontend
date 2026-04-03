import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, Modal, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '../../src/store/notificationStore';
import { formatDateTime } from '../../src/utils/dateUtils';

export default function NotificationsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null); // notification shown in detail modal
  const {
    notifications, unreadCount, isLoading,
    fetchNotifications, markAllRead, markOneRead, deleteOne, deleteAll,
  } = useNotificationStore();

  useEffect(() => { fetchNotifications(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handlePress = (n) => {
    markOneRead(n.id);
    if (n.issue_id) {
      router.push(`/issue/${n.issue_id}`);
    } else {
      // System / bulk / geofence notification — show full content in modal
      setSelected(n);
    }
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Delete all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: deleteAll },
      ]
    );
  };

  const handleDeleteOne = (id) => {
    Alert.alert('Delete Notification', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteOne(id) },
    ]);
  };

  const renderItem = ({ item: n }) => (
    <TouchableOpacity
      style={[styles.item, !n.is_read && styles.unread]}
      onPress={() => handlePress(n)}
      onLongPress={() => handleDeleteOne(n.id)}
    >
      <View style={[styles.iconBg, { backgroundColor: n.is_read ? '#f3f4f6' : '#eff6ff' }]}>
        <Ionicons
          name={n.issue_id ? (n.is_read ? 'document-text-outline' : 'document-text') : (n.is_read ? 'megaphone-outline' : 'megaphone')}
          size={20}
          color={n.is_read ? '#9ca3af' : '#1a56db'}
        />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, !n.is_read && styles.titleUnread]}>{n.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{n.body || n.message}</Text>
        {n.location_lat != null && (
          <View style={styles.locBadge}>
            <Ionicons name="location-outline" size={11} color="#16a34a" />
            <Text style={styles.locBadgeText}>Has location</Text>
          </View>
        )}
        <Text style={styles.time}>
          {formatDateTime(n.created_at, 'en-IN')}
        </Text>
      </View>
      {!n.is_read && <View style={styles.dot} />}
      <View style={styles.rightActions}>
        <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteOne(n.id)}>
          <Ionicons name="trash-outline" size={16} color="#d1d5db" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read ({unreadCount})</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.allReadText}>All caught up</Text>
        )}
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleDeleteAll}>
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1a56db" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a56db" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}

      {/* Notification Detail Modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Icon + type label */}
            <View style={styles.modalIconRow}>
              <View style={styles.modalIconBg}>
                <Ionicons name="megaphone" size={28} color="#1a56db" />
              </View>
              <Text style={styles.modalTypeLabel}>Announcement</Text>
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>{selected?.title}</Text>

            {/* Body — scrollable in case it's long */}
            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalBody}>{selected?.body || selected?.message}</Text>
            </ScrollView>

            {/* Timestamp */}
            <Text style={styles.modalTime}>
              {selected ? formatDateTime(selected.created_at, 'en-IN') : ''}
            </Text>

            {/* View on Map button — only shown when location is attached */}
            {selected?.location_lat != null && selected?.location_lng != null && (
              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => {
                  const url = `https://maps.google.com/?q=${selected.location_lat},${selected.location_lng}`;
                  Linking.openURL(url);
                }}
              >
                <Ionicons name="location" size={18} color="#fff" />
                <Text style={styles.mapBtnText}>View on Map</Text>
              </TouchableOpacity>
            )}

            {/* Close */}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelected(null)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#dbeafe',
  },
  markAllText: { color: '#1a56db', fontSize: 13, fontWeight: '600' },
  allReadText: { color: '#6b7280', fontSize: 13 },
  clearText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  unread: { backgroundColor: '#f8faff' },
  iconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  textCol: { flex: 1 },
  title: { fontSize: 14, color: '#374151', fontWeight: '500', marginBottom: 2 },
  titleUnread: { fontWeight: '700', color: '#111827' },
  body: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a56db', marginTop: 6, flexShrink: 0 },
  rightActions: { flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fef2f2' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af' },

  // Detail modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, maxHeight: '80%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb',
    alignSelf: 'center', marginBottom: 20,
  },
  modalIconRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modalIconBg: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center',
  },
  modalTypeLabel: { fontSize: 13, fontWeight: '600', color: '#1a56db', textTransform: 'uppercase', letterSpacing: 0.5 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
  modalBodyScroll: { maxHeight: 200, marginBottom: 16 },
  modalBody: { fontSize: 15, color: '#374151', lineHeight: 24 },
  modalTime: { fontSize: 12, color: '#9ca3af', marginBottom: 20 },
  modalCloseBtn: {
    backgroundColor: '#1a56db', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 14, marginBottom: 10,
  },
  mapBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  locBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginTop: 3,
  },
  locBadgeText: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
});
