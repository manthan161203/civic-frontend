import { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '../../src/store/notificationStore';
import { formatDateTime } from '../../src/utils/dateUtils';

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, fetchNotifications, markAllRead, markOneRead } = useNotificationStore();

  useEffect(() => { fetchNotifications(); }, []);

  const handlePress = (n) => {
    markOneRead(n.id);
    if (n.issue_id) router.push(`/issue/${n.issue_id}`);
  };

  const renderItem = ({ item: n }) => (
    <TouchableOpacity
      style={[styles.item, !n.is_read && styles.unread]}
      onPress={() => handlePress(n)}
    >
      <View style={[styles.iconBg, { backgroundColor: n.is_read ? '#f3f4f6' : '#eff6ff' }]}>
        <Ionicons
          name={n.is_read ? 'notifications-outline' : 'notifications'}
          size={20}
          color={n.is_read ? '#9ca3af' : '#1a56db'}
        />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, !n.is_read && styles.titleUnread]}>{n.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{n.message}</Text>
        <Text style={styles.time}>
          {formatDateTime(n.created_at, 'en-IN')}
        </Text>
      </View>
      {!n.is_read && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllBar} onPress={markAllRead}>
          <Text style={styles.markAllText}>Mark all as read ({unreadCount})</Text>
        </TouchableOpacity>
      )}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1a56db" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchNotifications} tintColor="#1a56db" />}
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
  markAllBar: {
    backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#dbeafe',
  },
  markAllText: { color: '#1a56db', fontSize: 13, fontWeight: '600' },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  unread: { backgroundColor: '#f8faff' },
  iconBg: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  textCol: { flex: 1 },
  title: { fontSize: 14, color: '#374151', fontWeight: '500', marginBottom: 2 },
  titleUnread: { fontWeight: '700', color: '#111827' },
  body: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a56db', marginTop: 6 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
});
