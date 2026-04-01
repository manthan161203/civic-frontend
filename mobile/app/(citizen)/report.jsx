import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image, ActivityIndicator, Modal, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { issuesApi } from '../../src/api/issues';
import { locationsApi } from '../../src/api/locations';
import MapView, { Marker } from '../../src/components/PlatformMap';

const ISSUE_TYPES = [
  'pothole', 'streetlight', 'garbage', 'drain', 'other',
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export default function ReportScreen() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState('pothole');
  const [priority, setPriority] = useState('medium');
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [currentWardId, setCurrentWardId] = useState(null);
  const [filteredWards, setFilteredWards] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showMapPin, setShowMapPin] = useState(false);
  // Structured address fields
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [locality, setLocality] = useState('');
  const [addrCity, setAddrCity] = useState('');

  useEffect(() => {
    getLocation();
    
    // Load all wards on component mount
    locationsApi.getTree()
      .then(({ data }) => {
        const allWards = [];
        (data.districts || data).forEach((district) => {
          (district.talukas || []).forEach((taluka) => {
            (taluka.wards || []).forEach((ward) => {
              allWards.push({
                id: ward.id,
                name: ward.name,
                taluka: taluka.name,
                district: district.name,
              });
            });
          });
        });
        setWards(allWards);
        
        // Initially show all wards
        setFilteredWards(allWards);
      })
      .catch(() => {});
  }, []);

  // When current ward is identified, optionally filter to show only that ward
  useEffect(() => {
    if (currentWardId && wards.length > 0) {
      // Option 1: Show only current ward
      const current = wards.filter((w) => w.id === currentWardId);
      setFilteredWards(current.length > 0 ? current : wards);
    }
  }, [currentWardId, wards]);

  const getLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocating(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
      
      const geo = await Location.reverseGeocodeAsync(loc.coords);
      if (geo[0]) {
        const g = geo[0];
        const line1 = [g.name, g.street].filter(Boolean).join(', ');
        const area = g.district || g.subregion || '';
        const city = g.city || '';
        setAddrLine1(line1);
        setLocality(area);
        setAddrCity(city);
        setAddress([line1, area, city].filter(Boolean).join(', '));
      }

      // Find the current ward based on location
      try {
        const { data } = await locationsApi.getNearbyWard(loc.coords.latitude, loc.coords.longitude);
        if (data?.id) {
          setCurrentWardId(data.id);
          setSelectedWard(data.id);
        }
      } catch {
        // If endpoint doesn't exist or fails, that's okay
      }
    } catch {}
    setLocating(false);
  };

  const pickPhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limit', 'You can attach up to 3 photos.');
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library in Settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled) setPhotos((prev) => [...prev, result.assets[0]]);
    } catch (err) {
      Alert.alert('Error', 'Could not open photo library. Please check app permissions in Settings.');
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limit', 'You can attach up to 3 photos.');
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access in Settings.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled) setPhotos((prev) => [...prev, result.assets[0]]);
    } catch (err) {
      Alert.alert('Error', 'Could not open camera. Please check app permissions in Settings.');
    }
  };

  const submit = async () => {
    if (!description.trim()) {
      Alert.alert('Required', 'Please describe the issue.');
      return;
    }
    if (!location) {
      Alert.alert('Location', 'Please allow location access to report an issue.');
      return;
    }

    // --- Duplicate detection: check for nearby issues of the same type ---
    try {
      const { data: nearbyData } = await issuesApi.nearby({
        lat: location.latitude,
        lng: location.longitude,
        radius_km: 0.3,
      });
      const nearby = (nearbyData.items || nearbyData || []).filter(
        (i) => i.issue_type === issueType && i.status !== 'resolved'
      );
      if (nearby.length > 0) {
        setDuplicates(nearby);
        setShowDuplicateModal(true);
        return; // pause — user will confirm or cancel
      }
    } catch {
      // If nearby check fails, proceed with submission anyway
    }

    await doSubmit();
  };

  const doSubmit = async () => {
    setShowDuplicateModal(false);
    setSubmitting(true);
    const fullAddress = [addrLine1, addrLine2, landmark, locality, addrCity]
      .filter(Boolean).join(', ') || address;
    try {
      const { data } = await issuesApi.create({
        description: description.trim(),
        issue_type: issueType,
        priority,
        latitude: location.latitude,
        longitude: location.longitude,
        address: fullAddress,
        ward_id: selectedWard,
      });

      // Upload photos
      for (const photo of photos) {
        const form = new FormData();
        form.append('photos', {
          uri: photo.uri,
          name: 'photo.jpg',
          type: 'image/jpeg',
        });
        await issuesApi.uploadPhoto(data.id, form);
      }

      Alert.alert('Reported!', 'Your issue has been submitted successfully.', [
        { text: 'View Issue', onPress: () => router.push(`/issue/${data.id}`) },
        { text: 'Report Another', onPress: () => {
          setDescription(''); setPhotos([]); setIssueType('pothole'); setPriority('medium');
        }},
      ]);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Duplicate issue warning modal */}
      <Modal visible={showDuplicateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.dupModal}>
            <View style={styles.dupModalHeader}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
                <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <Line x1="12" y1="9" x2="12" y2="13" />
                <Line x1="12" y1="17" x2="12.01" y2="17" />
              </Svg>
              <Text style={styles.dupModalTitle}>Similar Issues Found</Text>
            </View>
            <Text style={styles.dupModalSubtitle}>
              {duplicates.length} similar {issueType.replace('_', ' ')} issue{duplicates.length > 1 ? 's are' : ' is'} already reported within 300 m.
            </Text>
            <ScrollView style={styles.dupList} nestedScrollEnabled>
              {duplicates.slice(0, 5).map((issue) => (
                <TouchableOpacity
                  key={issue.id}
                  style={styles.dupItem}
                  onPress={() => {
                    setShowDuplicateModal(false);
                    router.push(`/issue/${issue.id}`);
                  }}
                >
                  <View style={styles.dupItemRow}>
                    <Text style={styles.dupItemType}>{issue.issue_type?.replace('_', ' ')}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS_DUP[issue.status] || '#e5e7eb' }]}>
                      <Text style={styles.statusBadgeText}>{issue.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.dupItemDesc} numberOfLines={2}>{issue.description}</Text>
                  <Text style={styles.dupItemLink}>Tap to view →</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.dupModalBtns}>
              <TouchableOpacity
                style={styles.dupModalSecBtn}
                onPress={() => setShowDuplicateModal(false)}
              >
                <Text style={styles.dupModalSecBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dupModalPrimBtn}
                onPress={doSubmit}
              >
                <Text style={styles.dupModalPrimBtnText}>Report Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Issue Type</Text>
        <View style={styles.grid}>
          {ISSUE_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, issueType === t && styles.typeBtnActive]}
              onPress={() => setIssueType(t)}
            >
              <Text style={[styles.typeBtnText, issueType === t && styles.typeBtnTextActive]}>
                {t.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Priority</Text>
        <View style={styles.row}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]}
              onPress={() => setPriority(p)}
            >
              <Text style={[styles.priorityBtnText, priority === p && styles.priorityBtnTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description *</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Describe the issue in detail..."
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.locationBox}>
          {locating ? (
            <ActivityIndicator color="#1a56db" />
          ) : location ? (
            <>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth={2}>
                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <Circle cx="12" cy="10" r="3" />
              </Svg>
              <Text style={styles.locationText} numberOfLines={2}>
                {address || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
              </Text>
            </>
          ) : (
            <Text style={styles.locationMissing}>Location not available</Text>
          )}
          <TouchableOpacity onPress={getLocation} style={styles.refreshBtn}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
              <Polyline points="23 4 23 10 17 10" />
              <Path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Structured address fields */}
        <View style={styles.addrFields}>
          <View style={styles.addrRow}>
            <View style={[styles.addrField, { flex: 1 }]}>
              <Text style={styles.addrLabel}>Address Line 1</Text>
              <TextInput
                style={styles.addrInput}
                value={addrLine1}
                onChangeText={setAddrLine1}
                placeholder="Street / building"
              />
            </View>
          </View>
          <View style={styles.addrRow}>
            <View style={[styles.addrField, { flex: 1 }]}>
              <Text style={styles.addrLabel}>Address Line 2 (optional)</Text>
              <TextInput
                style={styles.addrInput}
                value={addrLine2}
                onChangeText={setAddrLine2}
                placeholder="Apartment, floor, etc."
              />
            </View>
          </View>
          <View style={styles.addrRow}>
            <View style={[styles.addrField, { flex: 1 }]}>
              <Text style={styles.addrLabel}>Landmark (optional)</Text>
              <TextInput
                style={styles.addrInput}
                value={landmark}
                onChangeText={setLandmark}
                placeholder="Near school, temple…"
              />
            </View>
          </View>
          <View style={styles.addrRow}>
            <View style={[styles.addrField, { flex: 1 }]}>
              <Text style={styles.addrLabel}>Area / Locality</Text>
              <TextInput
                style={styles.addrInput}
                value={locality}
                onChangeText={setLocality}
                placeholder="Locality / sub-district"
              />
            </View>
            <View style={[styles.addrField, { flex: 1 }]}>
              <Text style={styles.addrLabel}>City / District</Text>
              <TextInput
                style={styles.addrInput}
                value={addrCity}
                onChangeText={setAddrCity}
                placeholder="City"
              />
            </View>
          </View>
        </View>

        {location && (
          <>
            <View style={styles.mapToggleRow}>
              <TouchableOpacity
                onPress={() => setShowMapPin(v => !v)}
                style={styles.mapToggleBtn}
              >
                {showMapPin ? (
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth={2}>
                    <Rect x="1" y="3" width="15" height="13" rx="2" />
                    <Path d="M16 8l5-3v14l-5-3" />
                  </Svg>
                ) : (
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth={2}>
                    <Path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
                    <Line x1="8" y1="2" x2="8" y2="18" />
                    <Line x1="16" y1="6" x2="16" y2="22" />
                  </Svg>
                )}
                <Text style={styles.mapToggleText}>
                  {showMapPin ? 'Hide Map' : 'Adjust on Map'}
                </Text>
              </TouchableOpacity>
              {showMapPin && (
                <Text style={styles.mapHintText}>Drag the pin to adjust</Text>
              )}
            </View>
            {showMapPin && (
              <MapView
                style={styles.mapView}
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
              >
                <Marker
                  coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                  draggable
                  onDragEnd={async (e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setLocation({ latitude, longitude });
                    try {
                      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
                      if (geo[0]) {
                        const g = geo[0];
                        const line1 = [g.name, g.street].filter(Boolean).join(', ');
                        const area = g.district || g.subregion || '';
                        const city = g.city || '';
                        setAddrLine1(line1);
                        setLocality(area);
                        setAddrCity(city);
                        setAddress([line1, area, city].filter(Boolean).join(', '));
                      }
                    } catch (_) {}
                    // Dynamically update ward suggestion based on new pin position
                    try {
                      const { data: wardData } = await locationsApi.getNearbyWard(latitude, longitude);
                      if (wardData?.id) {
                        setCurrentWardId(wardData.id);
                        setSelectedWard(wardData.id);
                      }
                    } catch (_) {}
                  }}
                />
              </MapView>
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ward (optional)</Text>
        {currentWardId && (
          <View style={styles.wardHintRow}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2}>
              <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <Circle cx="12" cy="10" r="3" />
            </Svg>
            <Text style={styles.wardHintText}>Showing ward near your location</Text>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.wardList}
          scrollEventThrottle={16}
        >
          {filteredWards.length === 0 ? (
            <Text style={styles.noWardsText}>Loading wards...</Text>
          ) : (
            filteredWards.map((ward) => (
              <TouchableOpacity
                key={ward.id}
                style={[styles.wardBtn, selectedWard === ward.id && styles.wardBtnActive]}
                onPress={() => setSelectedWard(selectedWard === ward.id ? null : ward.id)}
              >
                <Text style={[styles.wardBtnText, selectedWard === ward.id && styles.wardBtnTextActive]}>
                  {ward.name}
                </Text>
                {selectedWard === ward.id && (
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} style={{ marginLeft: 4 }}>
                    <Polyline points="20 6 9 17 4 12" />
                  </Svg>
                )}
                <Text style={[styles.wardSubtext2, selectedWard === ward.id && styles.wardSubtext2Active]}>
                  {ward.taluka}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos (optional)</Text>
        <View style={styles.photoRow}>
          {photos.map((p, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image source={{ uri: p.uri }} style={styles.thumbImg} />
              <TouchableOpacity
                style={styles.removePhoto}
                onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="#ef4444" stroke="#fff" strokeWidth={2}>
                  <Circle cx="12" cy="12" r="10" />
                  <Line x1="15" y1="9" x2="9" y2="15" />
                  <Line x1="9" y1="9" x2="15" y2="15" />
                </Svg>
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 3 && (
            <View style={styles.addPhotoRow}>
              <TouchableOpacity style={styles.addPhotoBtn} onPress={takePhoto}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                  <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <Circle cx="12" cy="13" r="4" />
                </Svg>
                <Text style={styles.addPhotoText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhoto}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                  <Rect x="3" y="3" width="18" height="18" rx="2" />
                  <Circle cx="8.5" cy="8.5" r="1.5" />
                  <Polyline points="21 15 16 10 5 21" />
                </Svg>
                <Text style={styles.addPhotoText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={submit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  section: { backgroundColor: '#fff', marginTop: 12, paddingHorizontal: 16, paddingVertical: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  typeBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  typeBtnText: { fontSize: 13, color: '#374151', textTransform: 'capitalize' },
  typeBtnTextActive: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  priorityBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  priorityBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  priorityBtnText: { fontSize: 13, color: '#374151', textTransform: 'capitalize' },
  priorityBtnTextActive: { color: '#fff', fontWeight: '600' },
  textarea: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', minHeight: 100 },
  locationBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#eff6ff', borderRadius: 10, borderWidth: 1, borderColor: '#dbeafe' },
  locationText: { flex: 1, fontSize: 13, color: '#374151' },
  locationMissing: { flex: 1, fontSize: 13, color: '#9ca3af' },
  refreshBtn: { padding: 4 },
  addrFields: { marginTop: 12, gap: 8, borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 10, padding: 12, backgroundColor: '#fafbfc' },
  addrRow: { flexDirection: 'row', gap: 8 },
  addrField: { gap: 3 },
  addrLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 },
  addrInput: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827', backgroundColor: '#fff' },
  mapToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  mapToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#eff6ff', borderRadius: 8, borderWidth: 1, borderColor: '#dbeafe' },
  mapToggleText: { fontSize: 13, color: '#1a56db', fontWeight: '600' },
  mapHintText: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic' },
  mapView: { height: 200, borderRadius: 10, marginTop: 8, overflow: 'hidden' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: { position: 'relative', width: 80, height: 80 },
  thumbImg: { width: 80, height: 80, borderRadius: 8 },
  removePhoto: { position: 'absolute', top: -8, right: -8 },
  addPhotoRow: { flexDirection: 'row', gap: 10 },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: 8, borderWidth: 1.5, borderColor: '#d1d5db',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  addPhotoText: { fontSize: 11, color: '#9ca3af' },
  wardList: { flexDirection: 'row', gap: 10, paddingHorizontal: 0 },
  wardBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff', minWidth: 90, alignItems: 'center' },
  wardBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  wardBtnText: { fontSize: 13, fontWeight: '600', color: '#374151', textAlign: 'center' },
  wardBtnTextActive: { color: '#fff' },
  wardSubtext2: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  wardSubtext2Active: { color: '#dbeafe' },
  wardHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  wardHintText: { fontSize: 12, color: '#059669', fontWeight: '500' },
  noWardsText: { fontSize: 13, color: '#9ca3af', padding: 8 },
  submitBtn: {
    margin: 16, height: 52, backgroundColor: '#1a56db', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Duplicate modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  dupModal: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '75%',
  },
  dupModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dupModalTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  dupModalSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  dupList: { maxHeight: 260 },
  dupItem: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb',
  },
  dupItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dupItemType: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'capitalize' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  dupItemDesc: { fontSize: 13, color: '#4b5563', lineHeight: 18 },
  dupItemLink: { fontSize: 12, color: '#1a56db', marginTop: 4, fontWeight: '600' },
  dupModalBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  dupModalSecBtn: {
    flex: 1, height: 48, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb',
  },
  dupModalSecBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  dupModalPrimBtn: {
    flex: 1, height: 48, borderRadius: 10, backgroundColor: '#1a56db',
    justifyContent: 'center', alignItems: 'center',
  },
  dupModalPrimBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

const STATUS_COLORS_DUP = {
  open: '#fee2e2',
  in_progress: '#fef3c7',
  resolved: '#d1fae5',
  escalated: '#ede9fe',
};
