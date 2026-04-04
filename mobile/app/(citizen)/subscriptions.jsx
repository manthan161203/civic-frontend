import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from 'expo-router';
import { locationsApi } from '../../src/api/locations';

export default function SubscriptionsScreen() {
  const navigation = useNavigation();
  const [tree, setTree] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState({});
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    navigation.setOptions({
      title: 'Ward Subscriptions',
      headerShown: true,
      headerBackTitle: 'Back',
      headerStyle: { backgroundColor: '#1a56db' },
      headerTintColor: '#fff',
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const [treeRes, subRes] = await Promise.all([
        locationsApi.getTree(),
        locationsApi.getSubscriptions(),
      ]);
      setTree(treeRes.data.districts || treeRes.data);
      const subs = subRes.data.items || subRes.data;
      setSubscriptions(subs.map((s) => s.ward_id ?? s.id));
    } catch {}
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleSub = async (wardId, currentlySubscribed) => {
    setToggling((prev) => ({ ...prev, [wardId]: true }));
    try {
      if (currentlySubscribed) {
        await locationsApi.unsubscribe(wardId);
        setSubscriptions((prev) => prev.filter((id) => id !== wardId));
      } else {
        await locationsApi.subscribe(wardId);
        setSubscriptions((prev) => [...prev, wardId]);
      }
    } catch {
      Alert.alert('Error', 'Failed to update subscription. Please try again.');
    }
    setToggling((prev) => ({ ...prev, [wardId]: false }));
  };

  const toggleExpand = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#1a56db" size="large" />;

  return (
    <FlatList
      data={tree}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a56db" />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Ionicons name="notifications" size={22} color="#1a56db" />
          <Text style={styles.headerText}>
            Subscribe to wards to get notified about new issues and updates.
          </Text>
        </View>
      }
      renderItem={({ item: district }) => (
        <View style={styles.districtBlock}>
          {/* District Header */}
          <TouchableOpacity
            style={styles.districtRow}
            onPress={() => toggleExpand(`d-${district.id}`)}
          >
            <Ionicons
              name={expanded[`d-${district.id}`] ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color="#6b7280"
            />
            <Text style={styles.districtName}>{district.name}</Text>
            <Text style={styles.districtMeta}>{district.talukas?.length ?? 0} talukas</Text>
          </TouchableOpacity>

          {expanded[`d-${district.id}`] &&
            (district.talukas || []).map((taluka) => (
              <View key={taluka.id}>
                {/* Taluka Header */}
                <TouchableOpacity
                  style={styles.talukaRow}
                  onPress={() => toggleExpand(`t-${taluka.id}`)}
                >
                  <Ionicons
                    name={expanded[`t-${taluka.id}`] ? 'chevron-down' : 'chevron-forward'}
                    size={14}
                    color="#9ca3af"
                  />
                  <Text style={styles.talukaName}>{taluka.name}</Text>
                  <Text style={styles.talukaMeta}>{taluka.wards?.length ?? 0} wards</Text>
                </TouchableOpacity>

                {expanded[`t-${taluka.id}`] &&
                  (taluka.wards || []).map((ward) => {
                    const isSubscribed = subscriptions.includes(ward.id);
                    const isToggling = toggling[ward.id];
                    return (
                      <View key={ward.id} style={styles.wardRow}>
                        <View style={styles.wardInfo}>
                          <Text style={styles.wardName}>{ward.name}</Text>
                          {ward.ward_number && (
                            <Text style={styles.wardNum}>Ward #{ward.ward_number}</Text>
                          )}
                        </View>
                        <Switch
                          value={isSubscribed}
                          onValueChange={() => !isToggling && toggleSub(ward.id, isSubscribed)}
                          disabled={isToggling}
                          trackColor={{ false: '#d1d5db', true: '#bfdbfe' }}
                          thumbColor={isSubscribed ? '#1a56db' : '#9ca3af'}
                        />
                      </View>
                    );
                  })}
              </View>
            ))}
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="location-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No locations available</Text>
        </View>
      }
      contentContainerStyle={{ paddingBottom: 32 }}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#eff6ff', margin: 16, padding: 14,
    borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe',
  },
  headerText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 18 },
  districtBlock: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  districtRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  districtName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  districtMeta: { fontSize: 12, color: '#9ca3af' },
  talukaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 22, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f9fafb',
  },
  talukaName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },
  talukaMeta: { fontSize: 11, color: '#9ca3af' },
  wardRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 36, paddingRight: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#f9fafb',
  },
  wardInfo: { flex: 1 },
  wardName: { fontSize: 13, fontWeight: '500', color: '#374151' },
  wardNum: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
});
