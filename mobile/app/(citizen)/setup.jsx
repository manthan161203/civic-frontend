/**
 * Setup Screen — shown after first login when profile is incomplete.
 * Full-screen version of the "Welcome to Civic" modal from profile.jsx.
 * Fields: Name, Email, District → Taluka → Ward, Home Location, Language.
 */
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, BackHandler, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from '../../src/components/PlatformMap';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/auth';
import { locationsApi } from '../../src/api/locations';
import { reverseGeocode, forwardGeocode } from '../../src/utils/geocode';

export default function SetupScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [language, setLanguage] = useState(user?.language || 'en');
  const [saving, setSaving] = useState(false);

  // Area
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [wards, setWards] = useState([]);
  const [district, setDistrict] = useState(null);
  const [taluka, setTaluka] = useState(null);
  const [wardObj, setWardObj] = useState(null);
  const [showDistrict, setShowDistrict] = useState(false);
  const [showTaluka, setShowTaluka] = useState(false);
  const [showWard, setShowWard] = useState(false);

  // Location
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [address, setAddress] = useState('');
  const [gettingGPS, setGettingGPS] = useState(false);
  const [searching, setSearching] = useState(false);
  const mapRef = useRef(null);

  // Block hardware back during setup
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    locationsApi.getDistricts()
      .then(({ data }) => setDistricts(data || []))
      .catch(() => {});
  }, []);

  const handleGPS = async () => {
    setGettingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required. Please enable it in Settings.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setLat(latitude); setLon(longitude);
      mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
      const geo = await reverseGeocode(latitude, longitude);
      if (geo) setAddress(geo.address);
    } catch {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      setGettingGPS(false);
    }
  };

  const handleSearch = async () => {
    if (!address.trim()) return;
    setSearching(true);
    try {
      const geo = await forwardGeocode(address.trim());
      if (geo) {
        setLat(geo.latitude); setLon(geo.longitude);
        setAddress(geo.address);
        mapRef.current?.animateToRegion({ latitude: geo.latitude, longitude: geo.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
      } else {
        Alert.alert('Not found', 'Could not find that address. Try a more specific search.');
      }
    } catch {
      Alert.alert('Error', 'Address search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Full name is required.'); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Error', 'A valid email address is required.'); return;
    }
    if (!wardObj) { Alert.alert('Error', 'Please select your ward.'); return; }
    if (!lat || !lon) { Alert.alert('Error', 'Please set your home location using GPS or the map.'); return; }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        ward: wardObj.name,
        ward_id: wardObj.id,
        taluka_id: taluka?.id,
        district_id: district?.id,
        language,
        latitude: lat,
        longitude: lon,
      };
      await authApi.updateProfile(payload);
      const { data } = await authApi.getMe();
      updateUser(data);
      router.replace('/(citizen)/');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Ionicons name="hand-left" size={22} color="#1a56db" />
          <Text style={styles.title}>Welcome to Civic!</Text>
        </View>
        <Text style={styles.subtitle}>Set up your profile and home location to get started</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Full Name *</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="Enter your full name"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email *</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="Enter your email address"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* District */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>District *</Text>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => { setShowDistrict(!showDistrict); setShowTaluka(false); setShowWard(false); }}
          >
            <Text style={styles.dropdownBtnText}>{district?.name || '-- Select District --'}</Text>
            <Ionicons name={showDistrict ? 'chevron-up' : 'chevron-down'} size={20} color="#374151" />
          </TouchableOpacity>
          {showDistrict && (
            <View style={styles.dropdownMenu}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                {districts.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.dropdownItem, district?.id === d.id && styles.dropdownItemActive]}
                    onPress={async () => {
                      setDistrict(d); setTaluka(null); setWardObj(null); setShowDistrict(false);
                      const { data } = await locationsApi.getTalukas(d.id);
                      setTalukas(data || []);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, district?.id === d.id && styles.dropdownItemTextActive]}>{d.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Taluka */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Taluka *</Text>
          <TouchableOpacity
            style={[styles.dropdownBtn, !district && styles.dropdownBtnDisabled]}
            onPress={() => { if (!district) return; setShowTaluka(!showTaluka); setShowDistrict(false); setShowWard(false); }}
            disabled={!district}
          >
            <Text style={[styles.dropdownBtnText, !district && styles.dropdownBtnTextDisabled]}>
              {taluka?.name || '-- Select Taluka --'}
            </Text>
            <Ionicons name={showTaluka ? 'chevron-up' : 'chevron-down'} size={20} color={!district ? '#d1d5db' : '#374151'} />
          </TouchableOpacity>
          {showTaluka && (
            <View style={styles.dropdownMenu}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                {talukas.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.dropdownItem, taluka?.id === t.id && styles.dropdownItemActive]}
                    onPress={async () => {
                      setTaluka(t); setWardObj(null); setShowTaluka(false);
                      const { data } = await locationsApi.getWards(t.id);
                      setWards(data || []);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, taluka?.id === t.id && styles.dropdownItemTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Ward */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Ward *</Text>
          <TouchableOpacity
            style={[styles.dropdownBtn, !taluka && styles.dropdownBtnDisabled]}
            onPress={() => { if (!taluka) return; setShowWard(!showWard); setShowDistrict(false); setShowTaluka(false); }}
            disabled={!taluka}
          >
            <Text style={[styles.dropdownBtnText, !taluka && styles.dropdownBtnTextDisabled]}>
              {wardObj ? `${wardObj.name}` : '-- Select Ward --'}
            </Text>
            <Ionicons name={showWard ? 'chevron-up' : 'chevron-down'} size={20} color={!taluka ? '#d1d5db' : '#374151'} />
          </TouchableOpacity>
          {showWard && (
            <View style={styles.dropdownMenu}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                {wards.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.dropdownItem, wardObj?.id === w.id && styles.dropdownItemActive]}
                    onPress={() => { setWardObj(w); setShowWard(false); }}
                  >
                    <Text style={[styles.dropdownItemText, wardObj?.id === w.id && styles.dropdownItemTextActive]}>
                      {w.name}{w.ward_number ? ` (${w.ward_number})` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Home Location */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Home Location *</Text>
          <Text style={styles.fieldHint}>Set your home so we can send relevant local alerts.</Text>

          <View style={styles.addressRow}>
            <TextInput
              style={[styles.fieldInput, styles.addressInput]}
              placeholder="Search address…"
              placeholderTextColor="#9ca3af"
              value={address}
              onChangeText={setAddress}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.addressSearchBtn, searching && { opacity: 0.6 }]}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="search" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.gpsBtn, { marginTop: 8 }, gettingGPS && { opacity: 0.7 }]}
            onPress={handleGPS}
            disabled={gettingGPS}
          >
            {gettingGPS
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="locate" size={18} color="#fff" />}
            <Text style={styles.gpsBtnText}>
              {gettingGPS ? 'Getting location…' : 'Use My Current Location'}
            </Text>
          </TouchableOpacity>

          <View style={styles.locationMapContainer}>
            <MapView
              ref={mapRef}
              style={styles.locationMapView}
              provider={PROVIDER_GOOGLE}
              initialRegion={{ latitude: 22.2587, longitude: 71.1924, latitudeDelta: 0.5, longitudeDelta: 0.5 }}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setLat(latitude); setLon(longitude);
                reverseGeocode(latitude, longitude).then((geo) => { if (geo) setAddress(geo.address); });
              }}
            >
              {lat && (
                <Marker
                  coordinate={{ latitude: lat, longitude: lon }}
                  draggable
                  pinColor="#1a56db"
                  onDragEnd={async (e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setLat(latitude); setLon(longitude);
                    const geo = await reverseGeocode(latitude, longitude);
                    if (geo) setAddress(geo.address);
                  }}
                />
              )}
            </MapView>
            <View style={styles.mapDragHint}>
              <Ionicons name="location-sharp" size={13} color="#fff" />
              <Text style={styles.mapDragHintText}>
                {lat
                  ? `${lat.toFixed(5)}, ${lon.toFixed(5)}  ·  Drag pin or tap to adjust`
                  : 'Tap map to pin your location'}
              </Text>
            </View>
          </View>
        </View>

        {/* Language */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Language Preference</Text>
          <View style={styles.langBtnRow}>
            {[{ code: 'en', label: 'English' }, { code: 'hi', label: 'हिंदी' }, { code: 'gu', label: 'ગુજરાતી' }].map(({ code, label }) => (
              <TouchableOpacity
                key={code}
                style={[styles.langBtn, language === code && styles.langBtnActive]}
                onPress={() => setLanguage(code)}
              >
                <Text style={[styles.langBtnText, language === code && styles.langBtnTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Get Started</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  saveBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 14, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },

  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  fieldHint: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  fieldInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },

  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  dropdownBtnDisabled: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  dropdownBtnText: { fontSize: 15, color: '#111827' },
  dropdownBtnTextDisabled: { color: '#9ca3af' },
  dropdownMenu: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, marginTop: 8, maxHeight: 200, backgroundColor: '#fff', overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownItemActive: { backgroundColor: '#f3f4f6' },
  dropdownItemText: { fontSize: 14, color: '#374151' },
  dropdownItemTextActive: { color: '#1a56db', fontWeight: '600' },

  addressRow: { flexDirection: 'row', gap: 8, marginBottom: 0 },
  addressInput: { flex: 1 },
  addressSearchBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#1a56db', justifyContent: 'center', alignItems: 'center' },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#059669', borderRadius: 8, marginBottom: 12 },
  gpsBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  locationMapContainer: { height: 220, borderRadius: 10, overflow: 'hidden' },
  locationMapView: { flex: 1 },
  mapDragHint: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 7 },
  mapDragHintText: { color: '#fff', fontSize: 12, flex: 1 },

  langBtnRow: { flexDirection: 'row', gap: 8 },
  langBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  langBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  langBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  langBtnTextActive: { color: '#fff' },
});
