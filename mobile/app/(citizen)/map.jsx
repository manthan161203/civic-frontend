import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from '../../src/components/PlatformMap';
const WebMap = lazy(() => import('../../src/components/WebMap'));
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
  const [error, setError] = useState(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location access required to view nearby issues');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation(loc.coords);
      const { data } = await issuesApi.nearby({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        radius_km: 5,
      });
      setIssues(data.items || data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load nearby issues. Please try again.');
    }
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
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading nearby issues…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={{ marginTop: 12, color: '#111827', fontWeight: '600', fontSize: 16 }}>
          Unable to Load Map
        </Text>
        <Text style={{ marginTop: 8, color: '#6b7280', textAlign: 'center', paddingHorizontal: 24 }}>
          {error}
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={init}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If running on web, render a web-specific map (lazy-loaded) that uses react-leaflet
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Suspense fallback={<View style={styles.center}><ActivityIndicator color="#1a56db" size="large" /><Text style={{ marginTop: 12, color: '#6b7280' }}>Loading web map…</Text></View>}>
          <WebMap issues={issues} initialRegion={
            userLocation
              ? {
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }
              : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 5, longitudeDelta: 5 }
          } />
        </Suspense>
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
                  <Text style={styles.calloutLink} onPress={() => router.push(`/issue/${issue.id}`)}>Tap to view →</Text>
                </View>
              </Callout>
            </Marker>
          ) : null
        )}
      </MapView>

      {/* No issues message */}
      {issues.length === 0 && (
        <View style={styles.noIssuesBox}>
          <Ionicons name="checkmark-circle-outline" size={32} color="#10b981" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 8 }}>
            All clear!
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            No issues reported within 5 km
          </Text>
        </View>
      )}

      {/* My location button */}
      <TouchableOpacity style={styles.locationBtn} onPress={goToMyLocation}>
        <Ionicons name="locate" size={22} color="#1a56db" />
      </TouchableOpacity>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Issue Status</Text>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{status.replace('_', ' ')}</Text>
          </View>
        ))}
      </View>

      {/* Issues count badge */}
      {issues.length > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{issues.length} issues nearby</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  callout: { width: 180, padding: 8 },
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
    backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: { fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#374151', textTransform: 'capitalize' },
  noIssuesBox: {
    position: 'absolute', top: '50%', left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 12, padding: 24,
    marginLeft: 'auto', marginRight: 'auto',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    elevation: 3,
  },
  countBadge: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: '#1a56db', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    elevation: 3,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  retryBtn: {
    marginTop: 24, backgroundColor: '#1a56db', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 8,
  },
});
