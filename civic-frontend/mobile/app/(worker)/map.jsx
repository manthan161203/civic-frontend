import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from '../../src/components/PlatformMap';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { workersApi } from '../../src/api/workers';

export default function WorkerMapScreen() {
  const router = useRouter();
  const mapRef = useRef(null);
  const [tasks, setTasks] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
    const interval = setInterval(updateLocation, 30000);
    return () => clearInterval(interval);
  }, []);

  const init = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation(loc.coords);
        await workersApi.updateLocation(loc.coords.latitude, loc.coords.longitude);
        // Snap map to user location once loaded
        setTimeout(() => {
          mapRef.current?.animateToRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }, 600);
        }, 300);
      }
      const { data } = await workersApi.getTasks();
      setTasks(data.items || data);
    } catch {}
    setLoading(false);
  };

  const updateLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation(loc.coords);
      await workersApi.updateLocation(loc.coords.latitude, loc.coords.longitude);
    } catch {}
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#059669" size="large" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading your tasks…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={
          userLocation
            ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 5, longitudeDelta: 5 }
        }
      >
        {tasks.map((task) =>
          task.latitude && task.longitude ? (
            <Marker
              key={task.id}
              coordinate={{ latitude: task.latitude, longitude: task.longitude }}
              pinColor={task.priority === 'critical' ? 'purple' : task.priority === 'high' ? 'red' : 'orange'}
              title={task.issue_type?.replace('_', ' ')}
              description={task.address || task.description?.slice(0, 60)}
              onCalloutPress={() => router.push(`/task/${task.id}`)}
            />
          ) : null
        )}
      </MapView>

      {/* Empty state overlay */}
      {tasks.length === 0 && (
        <View style={styles.emptyOverlay}>
          <View style={styles.emptyCard}>
            <Ionicons name="map-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No active tasks</Text>
            <Text style={styles.emptySub}>
              Go online on the Dashboard to start receiving task assignments
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.locationBtn}
        onPress={() => {
          if (!userLocation) return;
          mapRef.current?.animateToRegion({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
        }}
      >
        <Ionicons name="locate" size={22} color="#059669" />
      </TouchableOpacity>

      <View style={styles.counter}>
        <Text style={styles.counterText}>{tasks.length} active task{tasks.length !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  locationBtn: {
    position: 'absolute', bottom: 100, right: 16,
    backgroundColor: '#fff', width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    elevation: 4,
  },
  counter: {
    position: 'absolute', top: 12, left: 16,
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
    elevation: 3,
  },
  counterText: { fontSize: 13, fontWeight: '700', color: '#059669' },
  emptyOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28,
    alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
});
