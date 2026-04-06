import React from 'react';
import { View, Text } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for most bundlers
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  });
} catch (e) {
  // ignore in non-webpack environments
}

function regionToZoom(latitudeDelta) {
  if (!latitudeDelta) return 6;
  const zoom = Math.round(Math.log2(360 / Math.max(0.0001, latitudeDelta)));
  return Math.max(1, Math.min(18, zoom));
}

export default function WebMap({ issues = [], initialRegion }) {
  const center = initialRegion
    ? [initialRegion.latitude, initialRegion.longitude]
    : [20.5937, 78.9629];
  const zoom = regionToZoom(initialRegion?.latitudeDelta || 5);

  return (
    <View style={{ flex: 1, height: '100%', width: '100%' }}>
      <div style={{ height: '100%', width: '100%' }}>
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {issues.map((issue) =>
            issue.latitude && issue.longitude ? (
              <Marker position={[issue.latitude, issue.longitude]} key={issue.id}>
                <Popup>
                  <div style={{ width: 200 }}>
                    <strong style={{ display: 'block', marginBottom: 6 }}>{issue.description}</strong>
                    <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>
                      {issue.issue_type?.replace('_', ' ')} · {issue.status}
                    </div>
                    <a href={`/issue/${issue.id}`}>Tap to view →</a>
                  </div>
                </Popup>
              </Marker>
            ) : null
          )}
        </MapContainer>
      </div>
    </View>
  );
}

export { Marker as WebMarker };
