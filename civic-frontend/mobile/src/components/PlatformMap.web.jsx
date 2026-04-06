import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const MapViewWeb = forwardRef(({ style, children, initialRegion }, ref) => {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {
      // no-op on web
    },
  }));

  return (
    <View style={[styles.map, style]}>
      {children}
      <View style={styles.centerNotice} pointerEvents="none">
        <Text style={styles.noticeText}>Map view is not available on web in this build.</Text>
      </View>
    </View>
  );
});

const Marker = ({ coordinate, title, description, onCalloutPress }) => {
  const handlePress = () => {
    if (onCalloutPress) onCalloutPress();
  };
  return (
    <TouchableOpacity onPress={handlePress} style={styles.marker}>
      <Text style={styles.markerText}>{title || 'Marker'}</Text>
    </TouchableOpacity>
  );
};

const Polyline = () => null;
const PROVIDER_GOOGLE = 'google';

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  centerNotice: { position: 'absolute', top: 12, left: 12, right: 12, alignItems: 'center' },
  noticeText: { color: '#374151', fontSize: 13, textAlign: 'center' },
  marker: { padding: 8, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb', margin: 4 },
  markerText: { color: '#059669', fontWeight: '700' },
});

export default MapViewWeb;
export { Marker, Polyline, PROVIDER_GOOGLE };
