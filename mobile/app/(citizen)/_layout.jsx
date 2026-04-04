import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../src/store/authStore';
import { useNotificationStore } from '../../src/store/notificationStore';
import { locationsApi } from '../../src/api/locations';
import { View, Text } from 'react-native';

function BadgeIcon({ name, color, size, count }) {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {count > 0 && (
        <View style={{
          position: 'absolute', top: -4, right: -6,
          backgroundColor: '#ef4444', borderRadius: 8,
          minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function CitizenLayout() {
  const { user } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const router = useRouter();
  const [announcementBadge, setAnnouncementBadge] = useState(0);

  useEffect(() => {
    // Redirect workers to worker tabs; admin roles are blocked at root layout
    if (user?.role === 'worker') router.replace('/(worker)/');
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Calculate announcement badge count
  useEffect(() => {
    (async () => {
      try {
        const lastSeen = await AsyncStorage.getItem('lastSeenAnnouncement');
        const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;
        const { data } = await locationsApi.getAnnouncements({ page: 1, size: 100 });
        const announcements = data.items || data;
        const unread = announcements.filter(
          (a) => new Date(a.created_at).getTime() > lastSeenTime
        ).length;
        setAnnouncementBadge(unread);
      } catch {}
    })();
  }, []);

  // On first login (missing name or home location), send user to profile tab
  // so the mandatory setup modal fires immediately.
  useEffect(() => {
    if (user && (!user.name || !user.latitude)) {
      router.replace('/(citizen)/profile');
    }
  }, [user?.id]); // run once per login session

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1a56db',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingBottom: 4 },
        headerStyle: { backgroundColor: '#1a56db' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <BadgeIcon name="notifications" size={size} color={color} count={unreadCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: 'Announcements',
          tabBarIcon: ({ color, size }) => <BadgeIcon name="megaphone" size={size} color={color} count={announcementBadge} />,
        }}
      />
      {/* Hidden screens — accessible via router.push but not shown in tab bar */}
      <Tabs.Screen name="chat" options={{ href: null, title: 'AI Assistant', headerShown: true, headerStyle: { backgroundColor: '#1a56db' }, headerTintColor: '#fff' }} />
      <Tabs.Screen name="leaderboard" options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
    </Tabs>
  );
}
