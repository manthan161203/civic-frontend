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
import { useUiStore } from '../../src/store/uiStore';
import { reverseGeocode } from '../../src/utils/geocode';
import MapView, { Marker } from '../../src/components/PlatformMap';
import { compressImage } from '../../src/utils/imageUtils';
import { enqueue, ACTIONS } from '../../src/api/offlineQueue';
import { toApiError, getErrorMessage } from '../../src/api/errors';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useVoiceToText, VOICE_LANGUAGES } from '../../src/utils/voiceToText';

const BUILT_IN_TYPES = [
  'roads', 'water', 'electricity', 'sanitation', 'parks', 'garbage', 'other',
];

const TYPE_LABELS = {
  roads: 'Roads',
  water: 'Water',
  electricity: 'Electricity',
  sanitation: 'Sanitation',
  parks: 'Parks',
  garbage: 'Garbage',
  other: 'Other',
};

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export default function ReportScreen() {
  const { isOffline } = useNetworkStatus();
  const router = useRouter();
  const { addToast } = useUiStore();
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState('roads');
  const [priority, setPriority] = useState('medium');
  const [photos, setPhotos] = useState([]);
  const [voiceLang, setVoiceLang] = useState('en-IN');

  /*
   * Dictation writes straight into the description as results arrive, so the
   * user watches the text appear and can correct it by hand at any point —
   * `onResult` sets the field rather than the field being bound to the hook's
   * transcript, which would fight manual edits.
   */
  const { isListening, startListening, stopListening } = useVoiceToText({
    language: voiceLang,
    onResult: (text) => {
      if (text) setDescription(text);
    },
    onError: () => addToast('Could not hear that — please try again or type it.', 'error'),
  });
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
  const [fetchingWard, setFetchingWard] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [customTypes, setCustomTypes] = useState([]);
  const [customLabel, setCustomLabel] = useState('');
  // Structured address fields
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [locality, setLocality] = useState('');
  const [addrCity, setAddrCity] = useState('');

  useEffect(() => {
    getLocation();

    // Load approved custom issue types
    issuesApi.getApprovedCustomTypes()
      .then(({ data }) => setCustomTypes(data || []))
      .catch(() => {});

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

  const confirmLocation = async () => {
    if (!location) return;
    setFetchingWard(true);
    try {
      const { data: wardData } = await locationsApi.getNearbyWard(location.latitude, location.longitude, 10);
      if (wardData?.id) {
        setCurrentWardId(wardData.id);
        setSelectedWard(wardData.id);
        const distanceMsg = wardData.distance_km ? ` (${wardData.distance_km} km away)` : '';
        Alert.alert('Success', `Ward updated to: ${wardData.name}${distanceMsg}`);
      } else {
        Alert.alert('Not Found', 'No ward found within 10 km of this location');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch nearby ward');
    } finally {
      setFetchingWard(false);
    }
  };

  const getLocation = async () => {
    setLocating(true);
    setLocationDenied(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocating(false); setLocationDenied(true); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
      
      const geo = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      if (geo) {
        setAddrLine1(geo.street);
        setLocality(geo.locality);
        setAddrCity(geo.city);
        setAddress(geo.address);
      }

      // Find the current ward based on location
      try {
        const { data } = await locationsApi.getNearbyWard(loc.coords.latitude, loc.coords.longitude);
        if (data?.id) {
          setCurrentWardId(data.id);
          setSelectedWard(data.id);
        }
      } catch (err) {
        console.warn('Failed to load secondary location data:', err.message);
      }
    } catch (err) {
      console.warn('Failed to get locating position:', err.message);
    }
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
      if (!result.canceled) {
        const compressedUri = await compressImage(result.assets[0].uri);
        setPhotos((prev) => [...prev, { ...result.assets[0], uri: compressedUri }]);
      }
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
      if (!result.canceled) {
        const compressedUri = await compressImage(result.assets[0].uri);
        setPhotos((prev) => [...prev, { ...result.assets[0], uri: compressedUri }]);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open camera. Please check app permissions in Settings.');
    }
  };

  const submit = async () => {
    if (!description.trim()) {
      addToast('Please describe the issue.', 'error');
      return;
    }
    if (!location) {
      addToast('Please allow location access to report an issue.', 'error');
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
    // Send approved custom types directly as their slug; send "other" with a
    // label for new suggestions.
    const issuePayload = {
      description: description.trim(),
      issue_type: issueType,
      ...(issueType === 'other' && customLabel ? { custom_issue_type_label: customLabel.trim() } : {}),
      priority,
      latitude: location.latitude,
      longitude: location.longitude,
      address: fullAddress,
      ward_id: selectedWard,
    };

    const resetForm = () => {
      setDescription(''); setPhotos([]); setIssueType('pothole'); setPriority('medium');
      setAddress(''); setAddrLine1(''); setAddrLine2(''); setLandmark('');
      setLocality(''); setAddrCity(''); setLocation(null);
      setSelectedWard(null); setCurrentWardId(null);
      setFilteredWards(wards); setShowMapPin(false);
      getLocation();
    };

    /*
     * Reporting a problem is exactly the moment a citizen is least likely to
     * have signal — a flooded underpass, a basement car park, a back lane. The
     * report used to be lost outright.
     *
     * Queued reports replay through POST /sync when the connection returns.
     * Photos cannot travel in that JSON batch, so they are held on the device
     * and uploaded once the server answers with the new issue's id.
     */
    if (isOffline) {
      try {
        await enqueue(ACTIONS.CREATE_ISSUE, {
          payload: issuePayload,
          local: { photos: photos.map((p) => ({ uri: p.uri, name: 'photo.jpg', type: 'image/jpeg' })) },
        });
        addToast('Saved — will be sent when you reconnect', 'success');
        Alert.alert(
          'Saved offline',
          photos.length
            ? `Your report and ${photos.length} photo${photos.length === 1 ? '' : 's'} will be sent automatically when you reconnect.`
            : 'Your report will be sent automatically when you reconnect.',
          [{ text: 'Report Another', onPress: resetForm }, { text: 'Done', onPress: () => router.push('/(citizen)/') }],
        );
      } catch (err) {
        addToast(getErrorMessage(err, 'Could not save the report on this device.'), 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const { data } = await issuesApi.create(issuePayload);

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

      addToast('Issue reported successfully!', 'success');
      Alert.alert('Reported!', 'Your issue has been submitted successfully.', [
        { text: 'View Issue', onPress: () => router.push(`/issue/${data.id}`) },
        { text: 'Report Another', onPress: () => {
          setDescription(''); setPhotos([]); setIssueType('pothole'); setPriority('medium');
          setAddress(''); setAddrLine1(''); setAddrLine2(''); setLandmark('');
          setLocality(''); setAddrCity(''); setLocation(null);
          setSelectedWard(null); setCurrentWardId(null);
          setFilteredWards(wards); setShowMapPin(false);
          getLocation();
        }},
      ]);
    } catch (err) {
      const apiError = toApiError(err);

      // The connection dropped mid-submit. Queue rather than discard — the
      // user has typed a description and taken photos; losing that because a
      // train entered a tunnel is the failure this whole path exists to avoid.
      if (apiError.kind === 'network' || apiError.kind === 'timeout') {
        try {
          await enqueue(ACTIONS.CREATE_ISSUE, {
            payload: issuePayload,
            local: { photos: photos.map((p) => ({ uri: p.uri, name: 'photo.jpg', type: 'image/jpeg' })) },
          });
          addToast('Connection lost — saved, will send when you reconnect', 'success');
          Alert.alert('Saved offline', 'Your report will be sent automatically when you reconnect.', [
            { text: 'OK', onPress: resetForm },
          ]);
          return;
        } catch {
          // fall through to the generic error below
        }
      }

      addToast(apiError.message, 'error');
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
                  onPress={async () => {
                    setShowDuplicateModal(false);
                    // Auto-follow (upvote) so it appears on their dashboard
                    try { await issuesApi.upvote(issue.id); } catch (err) { console.warn('Failed to upvote issue:', err.message); }
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
          {BUILT_IN_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, issueType === t && styles.typeBtnActive]}
              onPress={() => { setIssueType(t); if (t !== 'other') setCustomLabel(''); }}
            >
              <Text style={[styles.typeBtnText, issueType === t && styles.typeBtnTextActive]}>
                {TYPE_LABELS[t] || t.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
          {customTypes.map((ct) => (
            <TouchableOpacity
              key={ct.slug}
              style={[styles.typeBtn, issueType === ct.slug && styles.typeBtnCustomActive]}
              onPress={() => { setIssueType(ct.slug); setCustomLabel(ct.label); }}
            >
              <Text style={[styles.typeBtnText, issueType === ct.slug && styles.typeBtnTextActive]}>
                {ct.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {issueType === 'other' && (
          <TextInput
            style={[styles.addrInput, { marginTop: 10 }]}
            placeholder="Describe the issue type (e.g. Broken bench)"
            value={customLabel}
            onChangeText={setCustomLabel}
            maxLength={100}
          />
        )}
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
        <View style={styles.descriptionHeader}>
          <Text style={styles.sectionTitle}>Description *</Text>

          {/*
            On-device speech recognition. Chosen over the server transcription
            route because it needs no API key and — the reason that matters
            here — it works with no connection, which is exactly when people
            are reporting a flooded underpass or a dark stairwell.
          */}
          <TouchableOpacity
            onPress={isListening ? stopListening : startListening}
            style={[styles.micButton, isListening && styles.micButtonActive]}
            accessibilityLabel={isListening ? 'Stop dictation' : 'Dictate description'}
            accessibilityRole="button"
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                 stroke={isListening ? '#fff' : '#1a56db'} strokeWidth={2}>
              <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <Path d="M19 10v2a7 7 0 01-14 0v-2" />
              <Line x1="12" y1="19" x2="12" y2="23" />
            </Svg>
            <Text style={[styles.micText, isListening && styles.micTextActive]}>
              {isListening ? 'Listening…' : 'Speak'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Language picker only while dictating — it is meaningless otherwise. */}
        {isListening && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langRow}>
            {Object.entries(VOICE_LANGUAGES).map(([label, code]) => (
              <TouchableOpacity
                key={code}
                onPress={() => setVoiceLang(code)}
                style={[styles.langChip, voiceLang === code && styles.langChipActive]}
              >
                <Text style={[styles.langText, voiceLang === code && styles.langTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TextInput
          style={styles.textarea}
          placeholder="Describe the issue in detail, or tap Speak…"
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
          ) : locationDenied ? (
            <Text style={styles.locationDenied}>
              Location access denied. Enable it in Settings and tap refresh.
            </Text>
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
              <>
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
                        const geo = await reverseGeocode(latitude, longitude);
                        if (geo) {
                          setAddrLine1(geo.street);
                          setLocality(geo.locality);
                          setAddrCity(geo.city);
                          setAddress(geo.address);
                        }
                      } catch (err) {
                        console.warn('Reverse geocoding failed:', err.message);
                      }
                      // Dynamically update ward suggestion based on new pin position
                      try {
                        const { data: wardData } = await locationsApi.getNearbyWard(latitude, longitude);
                        if (wardData?.id) {
                          setCurrentWardId(wardData.id);
                          setSelectedWard(wardData.id);
                        }
                      } catch (err) {
                        console.warn('Ward lookup failed:', err.message);
                      }
                    }}
                  />
                </MapView>
                <TouchableOpacity
                  style={[styles.confirmBtn, fetchingWard && styles.confirmBtnDisabled]}
                  onPress={confirmLocation}
                  disabled={fetchingWard}
                >
                  {fetchingWard ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Confirm Location</Text>
                  )}
                </TouchableOpacity>
              </>
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
  descriptionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  micButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: '#c7d2fe', backgroundColor: '#eef2ff',
  },
  micButtonActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  micText: { fontSize: 12, fontWeight: '700', color: '#1a56db' },
  micTextActive: { color: '#fff' },
  langRow: { marginBottom: 8 },
  langChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginRight: 6,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  langChipActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  langText: { fontSize: 11, fontWeight: '600', color: '#4b5563' },
  langTextActive: { color: '#fff' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  section: { backgroundColor: '#fff', marginTop: 12, paddingHorizontal: 16, paddingVertical: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  typeBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  typeBtnCustomActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
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
  locationDenied: { flex: 1, fontSize: 13, color: '#dc2626', fontStyle: 'italic' },
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
  confirmBtn: { 
    backgroundColor: '#1a56db', marginHorizontal: 16, marginTop: 12, paddingVertical: 12, paddingHorizontal: 16, 
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
