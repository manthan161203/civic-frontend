import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { issuesApi } from '../../src/api/issues';
import { locationsApi } from '../../src/api/locations';

const ISSUE_TYPES = [
  'pothole', 'streetlight', 'garbage', 'water_leak',
  'sewage', 'road_damage', 'encroachment', 'other',
];

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

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
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
      
      const geo = await Location.reverseGeocodeAsync(loc.coords);
      if (geo[0]) {
        setAddress(
          [geo[0].name, geo[0].street, geo[0].district, geo[0].city]
            .filter(Boolean)
            .join(', ')
        );
      }

      // Find the current ward based on location
      try {
        const { data } = await locationsApi.getNearbyWard(loc.coords.latitude, loc.coords.longitude);
        if (data?.id) {
          setCurrentWardId(data.id);
          // Auto-select current ward
          setSelectedWard(data.id);
        }
      } catch {
        // If endpoint doesn't exist or fails, that's okay - we'll show all wards
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
    setSubmitting(true);
    try {
      const { data } = await issuesApi.create({
        description: description.trim(),
        issue_type: issueType,
        priority,
        latitude: location.latitude,
        longitude: location.longitude,
        address,
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
              <Ionicons name="location" size={18} color="#1a56db" />
              <Text style={styles.locationText} numberOfLines={2}>
                {address || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
              </Text>
            </>
          ) : (
            <Text style={styles.locationMissing}>Location not available</Text>
          )}
          <TouchableOpacity onPress={getLocation} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ward (optional)</Text>
        {currentWardId && (
          <Text style={styles.wardHintText}>
            📍 Showing only your current ward location
          </Text>
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
                  <Ionicons name="checkmark" size={16} color="#fff" style={{ marginLeft: 4 }} />
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
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 3 && (
            <View style={styles.addPhotoRow}>
              <TouchableOpacity style={styles.addPhotoBtn} onPress={takePhoto}>
                <Ionicons name="camera" size={22} color="#6b7280" />
                <Text style={styles.addPhotoText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhoto}>
                <Ionicons name="image" size={22} color="#6b7280" />
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
  section: { backgroundColor: '#fff', marginTop: 12, paddingHorizontal: 16, paddingVertical: 14 },
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
  locationBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#f9fafb', borderRadius: 10 },
  locationText: { flex: 1, fontSize: 13, color: '#374151' },
  locationMissing: { flex: 1, fontSize: 13, color: '#9ca3af' },
  refreshBtn: { padding: 4 },
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
  wardHintText: { fontSize: 12, color: '#059669', marginBottom: 8, fontWeight: '500' },
  noWardsText: { fontSize: 13, color: '#9ca3af', padding: 8 },
  submitBtn: {
    margin: 16, height: 52, backgroundColor: '#1a56db', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
