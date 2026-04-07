import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from 'expo-router';
import { locationsApi } from '../../src/api/locations';
import { useNotificationStore } from '../../src/store/notificationStore';
import { formatDate } from '../../src/utils/dateUtils';

const SCOPE_COLORS = {
  state: { bg: '#f3e8ff', text: '#7c3aed', icon: 'globe-outline' },
  district: { bg: '#dbeafe', text: '#1e40af', icon: 'business-outline' },
  taluka: { bg: '#dcfce7', text: '#166534', icon: 'home-outline' },
  ward: { bg: '#fef3c7', text: '#92400e', icon: 'location-outline' },
};

export default function AnnouncementsScreen() {
  const navigation = useNavigation();
  const { clearAnnouncementBadge } = useNotificationStore();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    navigation.setOptions({
      title: 'Announcements',
      headerShown: true,
      headerBackTitle: 'Back',
      headerStyle: { backgroundColor: '#1a56db' },
      headerTintColor: '#fff',
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const { data } = await locationsApi.getAnnouncements({ page: 1, size: 50 });
      setAnnouncements(data.items || data);
    } catch (err) {
      console.warn('Failed to load announcements:', err.message);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  // Refresh list and clear badge on every focus
  useFocusEffect(
    useCallback(() => {
      load();
      clearAnnouncementBadge();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#1a56db" size="large" />;

  return (
    <FlatList
      data={announcements}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a56db" />}
      renderItem={({ item }) => {
        const scope = item.scope || 'state';
        const colors = SCOPE_COLORS[scope] || SCOPE_COLORS.state;
        const isExpanded = expanded[item.id];

        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => toggleExpand(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.cardTop}>
              <View style={[styles.scopeBadge, { backgroundColor: colors.bg }]}>
                <Ionicons name={colors.icon} size={12} color={colors.text} />
                <Text style={[styles.scopeText, { color: colors.text }]}>{scope}</Text>
              </View>
              <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#9ca3af"
              />
            </View>

            <Text style={styles.cardTitle} numberOfLines={isExpanded ? undefined : 2}>
              {item.title}
            </Text>

            {isExpanded && item.body && (
              <Text style={styles.cardBody}>{item.body}</Text>
            )}

            {item.ward_name && (
              <View style={styles.locationTag}>
                <Ionicons name="location-outline" size={12} color="#9ca3af" />
                <Text style={styles.locationText}>{item.ward_name}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="megaphone-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No announcements</Text>
        </View>
      }
      contentContainerStyle={[
        { padding: 16, paddingBottom: 32, gap: 10 },
        announcements.length === 0 && { flex: 1 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scopeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
  },
  scopeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  cardDate: { flex: 1, fontSize: 11, color: '#9ca3af', textAlign: 'right' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 21 },
  cardBody: { fontSize: 14, color: '#374151', lineHeight: 20 },
  locationTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: '#9ca3af' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
});
