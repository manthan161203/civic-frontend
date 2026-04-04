import { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNotificationStore } from '../../src/store/notificationStore';
import { formatDateTime } from '../../src/utils/dateUtils';

// Worker-flavoured notifications screen — same data/store as citizen, green accent colour
export default function WorkerNotificationsScreen() {
  const router = useRouter();
  const {
    notifications, unreadCount, isLoading,
    fetchNotifications, markAllRead, markOneRead, deleteOne, deleteAll,
  } = useNotificationStore();

  useEffect(() => { fetchNotifications(); }, []);
  useFocusEffect(useCallback(() => { fetchNotifications(); }, [fetchNotifications]));

  const handlePress = (n) => {
    markOneRead(n.id);
    // Task notifications have task_id / issue_id — navigate accordingly
    if (n.issue_id) router.push(`/task/${n.issue_id}`);
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
      <View style={[styles.iconBg, { backgroundColor: n.is_read ? '#f3f4f6' : '#f0fdf4' }]}>
        <Ionicons
          name={n.is_read ? 'notifications-outline' : 'notifications'}
          size={20}
          color={n.is_read ? '#9ca3af' : '#059669'}
        />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, !n.is_read && styles.titleUnread]}>{n.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{n.body || n.message}</Text>
        <Text style={styles.time}>
          {formatDateTime(n.created_at, 'en-IN')}
        </Text>
      </View>
      {!n.is_read && <View style={styles.dot} />}
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteOne(n.id)}>
        <Ionicons name="trash-outline" size={16} color="#d1d5db" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
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
        <ActivityIndicator style={{ marginTop: 40 }} color="#059669" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchNotifications} tintColor="#059669" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f0fdf4', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#bbf7d0',
  },
  markAllText: { color: '#059669', fontSize: 13, fontWeight: '600' },
  allReadText: { color: '#6b7280', fontSize: 13 },
  clearText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  unread: { backgroundColor: '#f8fff8' },
  iconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  textCol: { flex: 1 },
  title: { fontSize: 14, color: '#374151', fontWeight: '500', marginBottom: 2 },
  titleUnread: { fontWeight: '700', color: '#111827' },
  body: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669', marginTop: 6, flexShrink: 0 },
  deleteBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 4, backgroundColor: '#fef2f2' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
});
