import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Alert } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { issuesApi } from '../../src/api/issues';

const STATUS_COLORS = {
  open: '#ef4444',
  in_progress: '#f59e0b',
  resolved: '#10b981',
  escalated: '#7c3aed',
};

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef(null);
  const [issues, setIssues] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation(loc.coords);
        const { data } = await issuesApi.nearby({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          radius_km: 5,
        });
        setIssues(data.items || data);
      }
    } catch {}
    setLoading(false);
  };

  const goToMyLocation = () => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1a56db" size="large" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading map…</Text>
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
            ? {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 5, longitudeDelta: 5 }
        }
      >
        {issues.map((issue) =>
          issue.latitude && issue.longitude ? (
            <Marker
              key={issue.id}
              coordinate={{ latitude: issue.latitude, longitude: issue.longitude }}
              pinColor={STATUS_COLORS[issue.status] || '#ef4444'}
            >
              <Callout onPress={() => router.push(`/issue/${issue.id}`)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle} numberOfLines={2}>{issue.description}</Text>
                  <Text style={styles.calloutSub}>{issue.issue_type?.replace('_', ' ')} · {issue.status}</Text>
                  <Text style={styles.calloutLink}>Tap to view →</Text>
                </View>
              </Callout>
            </Marker>
          ) : null
        )}
      </MapView>

      {/* My location button */}
      <TouchableOpacity style={styles.locationBtn} onPress={goToMyLocation}>
        <Ionicons name="locate" size={22} color="#1a56db" />
      </TouchableOpacity>

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{status.replace('_', ' ')}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  callout: { width: 180, padding: 4 },
  calloutTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  calloutSub: { fontSize: 11, color: '#6b7280', textTransform: 'capitalize', marginBottom: 4 },
  calloutLink: { fontSize: 11, color: '#1a56db', fontWeight: '600' },
  locationBtn: {
    position: 'absolute', bottom: 100, right: 16,
    backgroundColor: '#fff', width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    elevation: 4,
  },
  legend: {
    position: 'absolute', bottom: 16, left: 16,
    backgroundColor: '#fff', borderRadius: 10, padding: 10, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    elevation: 3,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#374151', textTransform: 'capitalize' },
});
