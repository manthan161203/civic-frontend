import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Modal, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from '../../src/components/PlatformMap';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { rewardsApi } from '../../src/api/rewards';
import { authApi } from '../../src/api/auth';
import { locationsApi } from '../../src/api/locations';
import { compressImage } from '../../src/utils/imageUtils';
import { reverseGeocode, forwardGeocode } from '../../src/utils/geocode';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// Helper to construct full image URL
const getImageUrl = (profilePhotoUrl) => {
  if (!profilePhotoUrl) return null;
  if (profilePhotoUrl.startsWith('http')) return profilePhotoUrl; // Already absolute
  return `${BASE_URL}${profilePhotoUrl}`; // Add base URL to relative path
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editDistrict, setEditDistrict] = useState(null);
  const [editTaluka, setEditTaluka] = useState(null);
  const [editWard, setEditWard] = useState(null);
  const [editLanguage, setEditLanguage] = useState(user?.language || 'en');
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [wards, setWards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo_url || null);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showTalukaDropdown, setShowTalukaDropdown] = useState(false);
  const [showWardDropdown, setShowWardDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showMandatoryModal, setShowMandatoryModal] = useState(false);
  const [mandatoryName, setMandatoryName] = useState(user?.name || '');
  const [mandatoryEmail, setMandatoryEmail] = useState(user?.email || '');
  const [mandatoryLanguage, setMandatoryLanguage] = useState(user?.language || 'en');
  const [mandatoryShowLanguageDropdown, setMandatoryShowLanguageDropdown] = useState(false);
  const [mandatorySaving, setMandatorySaving] = useState(false);
  // Mandatory modal — location fields (proper cascading district/taluka/ward + GPS)
  const [mandatoryDistrict, setMandatoryDistrict] = useState(null);
  const [mandatoryTaluka, setMandatoryTaluka] = useState(null);
  const [mandatoryWardObj, setMandatoryWardObj] = useState(null);
  const [mandatoryTalukas, setMandatoryTalukas] = useState([]);
  const [mandatoryWards, setMandatoryWards] = useState([]);
  const [mandatoryShowDistrictDropdown, setMandatoryShowDistrictDropdown] = useState(false);
  const [mandatoryShowTalukaDropdown, setMandatoryShowTalukaDropdown] = useState(false);
  const [mandatoryShowWardDropdown, setMandatoryShowWardDropdown] = useState(false);
  const [mandatoryLat, setMandatoryLat] = useState(null);
  const [mandatoryLon, setMandatoryLon] = useState(null);
  const [mandatoryGettingGPS, setMandatoryGettingGPS] = useState(false);
  // Edit Home Location modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationLat, setLocationLat] = useState(user?.latitude || null);
  const [locationLon, setLocationLon] = useState(user?.longitude || null);
  const [locationDistrict, setLocationDistrict] = useState(null);
  const [locationTaluka, setLocationTaluka] = useState(null);
  const [locationWardObj, setLocationWardObj] = useState(null);
  const [locationTalukas, setLocationTalukas] = useState([]);
  const [locationWards, setLocationWards] = useState([]);
  const [locationShowDistrictDropdown, setLocationShowDistrictDropdown] = useState(false);
  const [locationShowTalukaDropdown, setLocationShowTalukaDropdown] = useState(false);
  const [locationShowWardDropdown, setLocationShowWardDropdown] = useState(false);
  const [locationGettingGPS, setLocationGettingGPS] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  // Address search states
  const [mandatoryAddress, setMandatoryAddress] = useState('');
  const [mandatorySearching, setMandatorySearching] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);
  // Map refs for animateToRegion
  const mandatoryMapRef = useRef(null);
  const locationMapRef = useRef(null);

  const loadRewards = useCallback(() => {
    rewardsApi.getMyRewards()
      .then(({ data }) => setRewards(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRewards();

    // Preload districts for modals
    locationsApi.getDistricts()
      .then(({ data }) => setDistricts(data || []))
      .catch(() => {});

    // Update profile photo when user changes
    if (user?.profile_photo_url) {
      setProfilePhoto(user.profile_photo_url);
    }
  }, [user?.profile_photo_url]);

  useFocusEffect(useCallback(() => { loadRewards(); }, [loadRewards]));

  // Trigger first-login setup modal
  useEffect(() => {
    if (user && (!user.name || !user.latitude)) {
      setShowMandatoryModal(true);
    }
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const pickProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const compressedUri = await compressImage(result.assets[0].uri);
        setSelectedPhotoUri(compressedUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfilePhoto = async () => {
    if (!selectedPhotoUri) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedPhotoUri,
        name: 'profile.jpg',
        type: 'image/jpeg',
      });

      const { data } = await authApi.uploadProfilePhoto(formData);
      // The response is a UserResponse object, update with full data
      const photoUrl = data.profile_photo_url;
      setProfilePhoto(photoUrl);
      updateUser(data); // Update entire user object
      setSelectedPhotoUri(null);
      Alert.alert('Success', 'Profile photo updated!');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to upload photo');
    }
    setUploadingPhoto(false);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }
    if (!editDistrict) {
      Alert.alert('Error', 'Please select a district.');
      return;
    }
    if (!editTaluka) {
      Alert.alert('Error', 'Please select a taluka.');
      return;
    }
    if (!editWard) {
      Alert.alert('Error', 'Please select a ward.');
      return;
    }
    setSaving(true);
    try {
      const updateData = {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        district_id: editDistrict.id,
        taluka_id: editTaluka.id,
        ward_id: editWard.id,
        language: editLanguage,
      };
      const { data } = await authApi.updateProfile(updateData);
      updateUser(data);
      setEditModal(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to update profile.');
    }
    setSaving(false);
  };

  const handleMandatorySaveProfile = async () => {
    if (!mandatoryName.trim()) {
      Alert.alert('Error', 'Full Name is required.');
      return;
    }
    if (!mandatoryWardObj) {
      Alert.alert('Error', 'Please select your ward.');
      return;
    }
    if (!mandatoryLat || !mandatoryLon) {
      Alert.alert('Error', 'Please set your home location using GPS or enter it manually.');
      return;
    }
    setMandatorySaving(true);
    try {
      const updateData = {
        name: mandatoryName.trim(),
        email: mandatoryEmail.trim() || undefined,
        ward: mandatoryWardObj.name,
        ward_id: mandatoryWardObj.id,
        taluka_id: mandatoryTaluka?.id,
        district_id: mandatoryDistrict?.id,
        language: mandatoryLanguage,
        latitude: mandatoryLat,
        longitude: mandatoryLon,
      };
      const { data } = await authApi.updateProfile(updateData);
      updateUser(data);
      setShowMandatoryModal(false);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to complete profile setup.');
    }
    setMandatorySaving(false);
  };

  const getGPSLocation = async (setLat, setLon, setGetting, { setAddress, mapRef } = {}) => {
    setGetting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required. Please enable it in Settings.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setLat(latitude);
      setLon(longitude);
      mapRef?.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
      if (setAddress) {
        const geo = await reverseGeocode(latitude, longitude);
        if (geo) setAddress(geo.address);
      }
    } catch {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      setGetting(false);
    }
  };

  const handleAddressSearch = async (address, setLat, setLon, setAddress, mapRef, setSearching) => {
    if (!address.trim()) return;
    setSearching(true);
    try {
      const result = await forwardGeocode(address.trim());
      if (result) {
        setLat(result.latitude);
        setLon(result.longitude);
        setAddress(result.address);
        mapRef?.current?.animateToRegion({
          latitude: result.latitude,
          longitude: result.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);
      } else {
        Alert.alert('Not found', 'Could not find that address. Try a more specific search.');
      }
    } catch {
      Alert.alert('Error', 'Address search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const openLocationModal = async () => {
    setLocationLat(user?.latitude || null);
    setLocationLon(user?.longitude || null);
    setLocationDistrict(null);
    setLocationTaluka(null);
    setLocationWardObj(null);
    setLocationTalukas([]);
    setLocationWards([]);
    // Preload existing district/taluka/ward
    if (user?.district_id && districts.length > 0) {
      const d = districts.find(x => x.id === user.district_id);
      if (d) {
        setLocationDistrict(d);
        try {
          const { data: tData } = await locationsApi.getTalukas(d.id);
          setLocationTalukas(tData || []);
          if (user?.taluka_id) {
            const t = (tData || []).find(x => x.id === user.taluka_id);
            if (t) {
              setLocationTaluka(t);
              const { data: wData } = await locationsApi.getWards(t.id);
              setLocationWards(wData || []);
              if (user?.ward_id) {
                const w = (wData || []).find(x => x.id === user.ward_id);
                if (w) setLocationWardObj(w);
              }
            }
          }
        } catch {}
      }
    }
    setShowLocationModal(true);
  };

  const handleSaveLocation = async () => {
    if (!locationLat || !locationLon) {
      Alert.alert('Error', 'Please set your location using GPS or select it manually.');
      return;
    }
    setLocationSaving(true);
    try {
      const updateData = {
        latitude: locationLat,
        longitude: locationLon,
        ...(locationWardObj && { ward_id: locationWardObj.id, ward: locationWardObj.name }),
        ...(locationTaluka && { taluka_id: locationTaluka.id }),
        ...(locationDistrict && { district_id: locationDistrict.id }),
      };
      const { data } = await authApi.updateProfile(updateData);
      updateUser(data);
      setShowLocationModal(false);
      Alert.alert('Success', 'Home location updated!');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to save location.');
    }
    setLocationSaving(false);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.avatar} 
          onPress={() => { 
            setSelectedPhotoUri(null); 
            setEditModal(true); 
          }}
        >
          {profilePhoto ? (
            <Image source={{ uri: getImageUrl(profilePhoto) }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          )}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{user?.name || 'Civic User'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || 'citizen'}</Text>
        </View>
      </View>

      {/* Rewards Summary */}
      {!loading && rewards && (
        <View style={styles.rewardsCard}>
          <View style={styles.rewardItem}>
            <Text style={styles.rewardVal}>{rewards.total_points || 0}</Text>
            <Text style={styles.rewardLabel}>Points</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.rewardItem}>
            <Text style={styles.rewardVal}>#{rewards.rank || '—'}</Text>
            <Text style={styles.rewardLabel}>Rank</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.rewardItem}>
            <Text style={styles.rewardVal}>{rewards.badges?.length || 0}</Text>
            <Text style={styles.rewardLabel}>Badges</Text>
          </View>
        </View>
      )}

      {/* Home Location Card */}
      <View style={styles.locationCard}>
        <View style={styles.locationCardLeft}>
          <Ionicons name="home" size={20} color={user?.latitude ? '#1a56db' : '#9ca3af'} />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationCardTitle}>Home Location</Text>
            {user?.latitude ? (
              <Text style={styles.locationCardValue}>
                {user.ward ? `${user.ward}` : ''}{user.ward && '\n'}
                {user.latitude.toFixed(5)}, {user.longitude.toFixed(5)}
              </Text>
            ) : (
              <Text style={styles.locationCardEmpty}>Not set — tap to add</Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.locationEditBtn} onPress={openLocationModal}>
          <Ionicons name={user?.latitude ? 'pencil' : 'add'} size={16} color="#1a56db" />
          <Text style={styles.locationEditBtnText}>{user?.latitude ? 'Edit' : 'Set'}</Text>
        </TouchableOpacity>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <MenuItem icon="trophy-outline" label="Leaderboard & Badges" onPress={() => router.push('/(citizen)/leaderboard')} />
        <MenuItem icon="chatbubble-ellipses-outline" label="AI Assistant" onPress={() => router.push('/(citizen)/chat')} />
        <MenuItem icon="notifications-outline" label="Ward Subscriptions" onPress={() => router.push('/(citizen)/subscriptions')} />
        <MenuItem icon="download-outline" label="Download My Data" onPress={() => {
          Alert.alert(
            'Download My Data',
            'Export all your personal data (profile, issues, notifications, rewards) as JSON.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Export',
                onPress: async () => {
                  try {
                    const { data } = await authApi.exportMyData();
                    Alert.alert('Data Exported', `Export contains:\n• ${data.issues_reported?.length || 0} issues\n• ${data.notifications?.length || 0} notifications\n• ${data.reward_transactions?.length || 0} transactions\n• ${data.badges_earned?.length || 0} badges\n\nExported at: ${data.exported_at}`);
                  } catch (err) {
                    Alert.alert('Error', err.response?.data?.detail || 'Failed to export data. Try again later.');
                  }
                },
              },
            ]
          );
        }} />
        <MenuItem icon="person-outline" label="Edit Profile" onPress={async () => { 
          setEditName(user?.name || ''); 
          setEditPhone(user?.phone || '');
          setEditEmail(user?.email || '');
          setEditLanguage(user?.language || 'en');
          setSelectedPhotoUri(null);
          
          // Load districts
          try {
            const { data: districtsData } = await locationsApi.getDistricts();
            setDistricts(districtsData || []);
            
            // If user has existing district, load and set it
            if (user?.district_id && districtsData) {
              const existingDistrict = districtsData.find(d => d.id === user.district_id);
              if (existingDistrict) {
                setEditDistrict(existingDistrict);
                
                // Load talukas for this district
                const { data: talukasData } = await locationsApi.getTalukas(existingDistrict.id);
                setTalukas(talukasData || []);
                
                // If user has taluka, find and set it
                if (user?.taluka_id && talukasData) {
                  const existingTaluka = talukasData.find(t => t.id === user.taluka_id);
                  if (existingTaluka) {
                    setEditTaluka(existingTaluka);
                    
                    // Load wards for this taluka
                    const { data: wardsData } = await locationsApi.getWards(existingTaluka.id);
                    setWards(wardsData || []);
                    
                    // If user has ward, find and set it
                    if (user?.ward_id && wardsData) {
                      const existingWard = wardsData.find(w => w.id === user.ward_id);
                      if (existingWard) {
                        setEditWard(existingWard);
                      }
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error loading locations:', err);
          }
          
          setEditModal(true); 
        }} />
      </View>

      <View style={[styles.menu, { marginTop: 12 }]}>
        <MenuItem icon="log-out-outline" label="Logout" onPress={handleLogout} danger />
        <MenuItem
          icon="trash-outline"
          label="Delete Account"
          onPress={() => {
            Alert.alert(
              'Delete Account',
              'This will permanently delete your account and all data. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await authApi.deleteAccount();
                      await logout();
                    } catch {
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    }
                  },
                },
              ]
            );
          }}
          danger
        />
      </View>

      <Text style={styles.version}>Civic v1.0.0</Text>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay2}>
          <View style={styles.modal2}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle2}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.photoSection}>
                <View style={styles.photoPreviewContainer}>
                  {selectedPhotoUri || profilePhoto ? (
                    <Image 
                      source={{ uri: selectedPhotoUri || getImageUrl(profilePhoto) }}
                      style={styles.photoPreview}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="image-outline" size={48} color="#d1d5db" />
                      <Text style={styles.photoPlaceholderText}>No photo</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.pickPhotoBtn}
                  onPress={pickProfilePhoto}
                >
                  <Ionicons name="image" size={18} color="#fff" />
                  <Text style={styles.pickPhotoBtnText}>Choose Photo</Text>
                </TouchableOpacity>
                {selectedPhotoUri && (
                  <TouchableOpacity 
                    style={[styles.uploadPhotoBtn, uploadingPhoto && { opacity: 0.6 }]}
                    onPress={uploadProfilePhoto}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                        <Text style={styles.uploadPhotoBtnText}>Upload Photo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your full name"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Your phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="your@email.com"
                  keyboardType="email-address"
                />
              </View>

              {/* District */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>District *</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowDistrictDropdown(!showDistrictDropdown)}
                >
                  <Text style={styles.dropdownBtnText}>{editDistrict?.name || '-- Select District --'}</Text>
                  <Ionicons name={showDistrictDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#374151" />
                </TouchableOpacity>
                {showDistrictDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                      {districts.map((d) => (
                        <TouchableOpacity
                          key={d.id}
                          style={[styles.dropdownItem, editDistrict?.id === d.id && styles.dropdownItemActive]}
                          onPress={async () => {
                            setEditDistrict(d);
                            setEditTaluka(null);
                            setEditWard(null);
                            setShowDistrictDropdown(false);
                            // Load talukas
                            try {
                              const { data } = await locationsApi.getTalukas(d.id);
                              setTalukas(data || []);
                            } catch {}
                          }}
                        >
                          <Text style={[styles.dropdownItemText, editDistrict?.id === d.id && styles.dropdownItemTextActive]}>
                            {d.name}
                          </Text>
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
                  style={[styles.dropdownBtn, !editDistrict && styles.dropdownBtnDisabled]}
                  onPress={() => editDistrict && setShowTalukaDropdown(!showTalukaDropdown)}
                  disabled={!editDistrict}
                >
                  <Text style={[styles.dropdownBtnText, !editDistrict && styles.dropdownBtnTextDisabled]}>
                    {editTaluka?.name || '-- Select Taluka --'}
                  </Text>
                  <Ionicons name={showTalukaDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={!editDistrict ? '#d1d5db' : '#374151'} />
                </TouchableOpacity>
                {showTalukaDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                      {talukas.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.dropdownItem, editTaluka?.id === t.id && styles.dropdownItemActive]}
                          onPress={async () => {
                            setEditTaluka(t);
                            setEditWard(null);
                            setShowTalukaDropdown(false);
                            // Load wards
                            try {
                              const { data } = await locationsApi.getWards(t.id);
                              setWards(data || []);
                            } catch {}
                          }}
                        >
                          <Text style={[styles.dropdownItemText, editTaluka?.id === t.id && styles.dropdownItemTextActive]}>
                            {t.name}
                          </Text>
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
                  style={[styles.dropdownBtn, !editTaluka && styles.dropdownBtnDisabled]}
                  onPress={() => editTaluka && setShowWardDropdown(!showWardDropdown)}
                  disabled={!editTaluka}
                >
                  <Text style={[styles.dropdownBtnText, !editTaluka && styles.dropdownBtnTextDisabled]}>
                    {editWard ? `${editWard.name} (${editWard.ward_number})` : '-- Select Ward --'}
                  </Text>
                  <Ionicons name={showWardDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={!editTaluka ? '#d1d5db' : '#374151'} />
                </TouchableOpacity>
                {showWardDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                      {wards.map((w) => (
                        <TouchableOpacity
                          key={w.id}
                          style={[styles.dropdownItem, editWard?.id === w.id && styles.dropdownItemActive]}
                          onPress={() => {
                            setEditWard(w);
                            setShowWardDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, editWard?.id === w.id && styles.dropdownItemTextActive]}>
                            {w.name} ({w.ward_number})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Language Preference</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
                >
                  <Text style={styles.dropdownBtnText}>
                    {editLanguage === 'en' ? 'English (en)' : editLanguage === 'gu' ? 'Gujarati (gu)' : 'Hindi (hi)'}
                  </Text>
                  <Ionicons name={showLanguageDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#374151" />
                </TouchableOpacity>
                {showLanguageDropdown && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity
                      style={[styles.dropdownItem, editLanguage === 'en' && styles.dropdownItemActive]}
                      onPress={() => {
                        setEditLanguage('en');
                        setShowLanguageDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, editLanguage === 'en' && styles.dropdownItemTextActive]}>
                        English (en)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dropdownItem, editLanguage === 'gu' && styles.dropdownItemActive]}
                      onPress={() => {
                        setEditLanguage('gu');
                        setShowLanguageDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, editLanguage === 'gu' && styles.dropdownItemTextActive]}>
                        Gujarati (gu)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dropdownItem, editLanguage === 'hi' && styles.dropdownItemActive]}
                      onPress={() => {
                        setEditLanguage('hi');
                        setShowLanguageDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, editLanguage === 'hi' && styles.dropdownItemTextActive]}>
                        Hindi (hi)
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions2}>
              <TouchableOpacity
                style={styles.modalCancel2}
                onPress={() => setEditModal(false)}
              >
                <Text style={styles.modalCancelText2}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave2, saving && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                <Text style={styles.modalSaveText2}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* First-Login Setup Modal */}
      <Modal visible={showMandatoryModal} transparent animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
        <View style={styles.mandatoryModalOverlay}>
          <View style={styles.mandatoryModal}>
            <View style={styles.mandatoryModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Ionicons name="hand-left" size={22} color="#1a56db" />
                <Text style={styles.mandatoryModalTitle}>Welcome to Civic!</Text>
              </View>
              <Text style={styles.mandatoryModalSubtitle}>Set up your profile and home location to get started</Text>
            </View>

            <ScrollView style={styles.mandatoryModalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9ca3af"
                  value={mandatoryName}
                  onChangeText={setMandatoryName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter your email (optional)"
                  placeholderTextColor="#9ca3af"
                  value={mandatoryEmail}
                  onChangeText={setMandatoryEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* District → Taluka → Ward */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>District *</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setMandatoryShowDistrictDropdown(!mandatoryShowDistrictDropdown)}
                >
                  <Text style={styles.dropdownBtnText}>{mandatoryDistrict?.name || '-- Select District --'}</Text>
                  <Ionicons name={mandatoryShowDistrictDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#374151" />
                </TouchableOpacity>
                {mandatoryShowDistrictDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                      {districts.map((d) => (
                        <TouchableOpacity
                          key={d.id}
                          style={[styles.dropdownItem, mandatoryDistrict?.id === d.id && styles.dropdownItemActive]}
                          onPress={async () => {
                            setMandatoryDistrict(d);
                            setMandatoryTaluka(null);
                            setMandatoryWardObj(null);
                            setMandatoryShowDistrictDropdown(false);
                            try {
                              const { data } = await locationsApi.getTalukas(d.id);
                              setMandatoryTalukas(data || []);
                            } catch {}
                          }}
                        >
                          <Text style={[styles.dropdownItemText, mandatoryDistrict?.id === d.id && styles.dropdownItemTextActive]}>{d.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Taluka *</Text>
                <TouchableOpacity
                  style={[styles.dropdownBtn, !mandatoryDistrict && styles.dropdownBtnDisabled]}
                  onPress={() => mandatoryDistrict && setMandatoryShowTalukaDropdown(!mandatoryShowTalukaDropdown)}
                  disabled={!mandatoryDistrict}
                >
                  <Text style={[styles.dropdownBtnText, !mandatoryDistrict && styles.dropdownBtnTextDisabled]}>
                    {mandatoryTaluka?.name || '-- Select Taluka --'}
                  </Text>
                  <Ionicons name={mandatoryShowTalukaDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={!mandatoryDistrict ? '#d1d5db' : '#374151'} />
                </TouchableOpacity>
                {mandatoryShowTalukaDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                      {mandatoryTalukas.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.dropdownItem, mandatoryTaluka?.id === t.id && styles.dropdownItemActive]}
                          onPress={async () => {
                            setMandatoryTaluka(t);
                            setMandatoryWardObj(null);
                            setMandatoryShowTalukaDropdown(false);
                            try {
                              const { data } = await locationsApi.getWards(t.id);
                              setMandatoryWards(data || []);
                            } catch {}
                          }}
                        >
                          <Text style={[styles.dropdownItemText, mandatoryTaluka?.id === t.id && styles.dropdownItemTextActive]}>{t.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Ward *</Text>
                <TouchableOpacity
                  style={[styles.dropdownBtn, !mandatoryTaluka && styles.dropdownBtnDisabled]}
                  onPress={() => mandatoryTaluka && setMandatoryShowWardDropdown(!mandatoryShowWardDropdown)}
                  disabled={!mandatoryTaluka}
                >
                  <Text style={[styles.dropdownBtnText, !mandatoryTaluka && styles.dropdownBtnTextDisabled]}>
                    {mandatoryWardObj ? `${mandatoryWardObj.name}` : '-- Select Ward --'}
                  </Text>
                  <Ionicons name={mandatoryShowWardDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={!mandatoryTaluka ? '#d1d5db' : '#374151'} />
                </TouchableOpacity>
                {mandatoryShowWardDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                      {mandatoryWards.map((w) => (
                        <TouchableOpacity
                          key={w.id}
                          style={[styles.dropdownItem, mandatoryWardObj?.id === w.id && styles.dropdownItemActive]}
                          onPress={() => {
                            setMandatoryWardObj(w);
                            setMandatoryShowWardDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, mandatoryWardObj?.id === w.id && styles.dropdownItemTextActive]}>
                            {w.name}{w.ward_number ? ` (${w.ward_number})` : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Home Location (Address + GPS + Map) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Home Location *</Text>
                <Text style={styles.fieldHint}>Set your home so we can send relevant local alerts.</Text>

                {/* Address search row */}
                <View style={styles.addressRow}>
                  <TextInput
                    style={[styles.fieldInput, styles.addressInput]}
                    placeholder="Search address…"
                    placeholderTextColor="#9ca3af"
                    value={mandatoryAddress}
                    onChangeText={setMandatoryAddress}
                    onSubmitEditing={() => handleAddressSearch(mandatoryAddress, setMandatoryLat, setMandatoryLon, setMandatoryAddress, mandatoryMapRef, setMandatorySearching)}
                    returnKeyType="search"
                  />
                  <TouchableOpacity
                    style={[styles.addressSearchBtn, mandatorySearching && { opacity: 0.6 }]}
                    onPress={() => handleAddressSearch(mandatoryAddress, setMandatoryLat, setMandatoryLon, setMandatoryAddress, mandatoryMapRef, setMandatorySearching)}
                    disabled={mandatorySearching}
                  >
                    {mandatorySearching
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="search" size={18} color="#fff" />}
                  </TouchableOpacity>
                </View>

                {/* GPS button */}
                <TouchableOpacity
                  style={[styles.gpsBtn, { marginTop: 8 }, mandatoryGettingGPS && { opacity: 0.7 }]}
                  onPress={() => getGPSLocation(setMandatoryLat, setMandatoryLon, setMandatoryGettingGPS, { setAddress: setMandatoryAddress, mapRef: mandatoryMapRef })}
                  disabled={mandatoryGettingGPS}
                >
                  {mandatoryGettingGPS
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="locate" size={18} color="#fff" />}
                  <Text style={styles.gpsBtnText}>
                    {mandatoryGettingGPS ? 'Getting location…' : 'Use My Current Location'}
                  </Text>
                </TouchableOpacity>

                {/* Map */}
                <View style={styles.locationMapContainer}>
                  <MapView
                    ref={mandatoryMapRef}
                    style={styles.locationMapView}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                      latitude: 22.2587,
                      longitude: 71.1924,
                      latitudeDelta: 0.5,
                      longitudeDelta: 0.5,
                    }}
                    onPress={(e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      setMandatoryLat(latitude);
                      setMandatoryLon(longitude);
                      reverseGeocode(latitude, longitude).then((geo) => { if (geo) setMandatoryAddress(geo.address); });
                    }}
                  >
                    {mandatoryLat && (
                      <Marker
                        coordinate={{ latitude: mandatoryLat, longitude: mandatoryLon }}
                        draggable
                        pinColor="#1a56db"
                        onDragEnd={async (e) => {
                          const { latitude, longitude } = e.nativeEvent.coordinate;
                          setMandatoryLat(latitude);
                          setMandatoryLon(longitude);
                          const geo = await reverseGeocode(latitude, longitude);
                          if (geo) setMandatoryAddress(geo.address);
                        }}
                      />
                    )}
                  </MapView>
                  <View style={styles.mapDragHint}>
                    <Ionicons name="location-sharp" size={13} color="#fff" />
                    <Text style={styles.mapDragHintText}>
                      {mandatoryLat
                        ? `${mandatoryLat.toFixed(5)}, ${mandatoryLon.toFixed(5)}  ·  Drag pin or tap to adjust`
                        : 'Tap map to pin your location'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Language Preference</Text>
                <View style={styles.langBtnRow}>
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'hi', label: 'हिंदी' },
                    { code: 'gu', label: 'ગુજરાતી' },
                  ].map(({ code, label }) => (
                    <TouchableOpacity
                      key={code}
                      style={[styles.langBtn, mandatoryLanguage === code && styles.langBtnActive]}
                      onPress={() => setMandatoryLanguage(code)}
                    >
                      <Text style={[styles.langBtnText, mandatoryLanguage === code && styles.langBtnTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.mandatoryModalActions}>
              <TouchableOpacity
                style={[styles.mandatorySaveBtn, mandatorySaving && { opacity: 0.6 }]}
                onPress={handleMandatorySaveProfile}
                disabled={mandatorySaving}
              >
                <Text style={styles.mandatorySaveBtnText}>{mandatorySaving ? 'Setting up…' : 'Get Started'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Home Location Modal */}
      <Modal visible={showLocationModal} transparent animationType="slide" onRequestClose={() => setShowLocationModal(false)}>
        <View style={styles.modalOverlay2}>
          <View style={styles.modal2}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle2}>Edit Home Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              {/* Address search + GPS + Map */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Location</Text>

                {/* Address search row */}
                <View style={styles.addressRow}>
                  <TextInput
                    style={[styles.fieldInput, styles.addressInput]}
                    placeholder="Search address…"
                    placeholderTextColor="#9ca3af"
                    value={locationAddress}
                    onChangeText={setLocationAddress}
                    onSubmitEditing={() => handleAddressSearch(locationAddress, setLocationLat, setLocationLon, setLocationAddress, locationMapRef, setLocationSearching)}
                    returnKeyType="search"
                  />
                  <TouchableOpacity
                    style={[styles.addressSearchBtn, locationSearching && { opacity: 0.6 }]}
                    onPress={() => handleAddressSearch(locationAddress, setLocationLat, setLocationLon, setLocationAddress, locationMapRef, setLocationSearching)}
                    disabled={locationSearching}
                  >
                    {locationSearching
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="search" size={18} color="#fff" />}
                  </TouchableOpacity>
                </View>

                {/* GPS button */}
                <TouchableOpacity
                  style={[styles.gpsBtn, { marginTop: 8 }, locationGettingGPS && { opacity: 0.7 }]}
                  onPress={() => getGPSLocation(setLocationLat, setLocationLon, setLocationGettingGPS, { setAddress: setLocationAddress, mapRef: locationMapRef })}
                  disabled={locationGettingGPS}
                >
                  {locationGettingGPS
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="locate" size={18} color="#fff" />}
                  <Text style={styles.gpsBtnText}>
                    {locationGettingGPS ? 'Getting location…' : 'Use My Current Location'}
                  </Text>
                </TouchableOpacity>

                {/* Map */}
                <View style={styles.locationMapContainer}>
                  <MapView
                    ref={locationMapRef}
                    style={styles.locationMapView}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                      latitude: locationLat || 22.2587,
                      longitude: locationLon || 71.1924,
                      latitudeDelta: locationLat ? 0.005 : 0.5,
                      longitudeDelta: locationLon ? 0.005 : 0.5,
                    }}
                    onPress={(e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      setLocationLat(latitude);
                      setLocationLon(longitude);
                      reverseGeocode(latitude, longitude).then((geo) => { if (geo) setLocationAddress(geo.address); });
                    }}
                  >
                    {locationLat && (
                      <Marker
                        coordinate={{ latitude: locationLat, longitude: locationLon }}
                        draggable
                        pinColor="#1a56db"
                        onDragEnd={async (e) => {
                          const { latitude, longitude } = e.nativeEvent.coordinate;
                          setLocationLat(latitude);
                          setLocationLon(longitude);
                          const geo = await reverseGeocode(latitude, longitude);
                          if (geo) setLocationAddress(geo.address);
                        }}
                      />
                    )}
                  </MapView>
                  <View style={styles.mapDragHint}>
                    <Ionicons name="location-sharp" size={13} color="#fff" />
                    <Text style={styles.mapDragHintText}>
                      {locationLat
                        ? `${locationLat.toFixed(5)}, ${locationLon.toFixed(5)}  ·  Drag pin or tap to adjust`
                        : 'Tap map to pin your location'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* District / Taluka / Ward (optional for edit) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>District</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setLocationShowDistrictDropdown(!locationShowDistrictDropdown)}
                >
                  <Text style={styles.dropdownBtnText}>{locationDistrict?.name || '-- Select District --'}</Text>
                  <Ionicons name={locationShowDistrictDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#374151" />
                </TouchableOpacity>
                {locationShowDistrictDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                      {districts.map((d) => (
                        <TouchableOpacity
                          key={d.id}
                          style={[styles.dropdownItem, locationDistrict?.id === d.id && styles.dropdownItemActive]}
                          onPress={async () => {
                            setLocationDistrict(d);
                            setLocationTaluka(null);
                            setLocationWardObj(null);
                            setLocationShowDistrictDropdown(false);
                            try {
                              const { data } = await locationsApi.getTalukas(d.id);
                              setLocationTalukas(data || []);
                            } catch {}
                          }}
                        >
                          <Text style={[styles.dropdownItemText, locationDistrict?.id === d.id && styles.dropdownItemTextActive]}>{d.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Taluka</Text>
                <TouchableOpacity
                  style={[styles.dropdownBtn, !locationDistrict && styles.dropdownBtnDisabled]}
                  onPress={() => locationDistrict && setLocationShowTalukaDropdown(!locationShowTalukaDropdown)}
                  disabled={!locationDistrict}
                >
                  <Text style={[styles.dropdownBtnText, !locationDistrict && styles.dropdownBtnTextDisabled]}>
                    {locationTaluka?.name || '-- Select Taluka --'}
                  </Text>
                  <Ionicons name={locationShowTalukaDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={!locationDistrict ? '#d1d5db' : '#374151'} />
                </TouchableOpacity>
                {locationShowTalukaDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                      {locationTalukas.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.dropdownItem, locationTaluka?.id === t.id && styles.dropdownItemActive]}
                          onPress={async () => {
                            setLocationTaluka(t);
                            setLocationWardObj(null);
                            setLocationShowTalukaDropdown(false);
                            try {
                              const { data } = await locationsApi.getWards(t.id);
                              setLocationWards(data || []);
                            } catch {}
                          }}
                        >
                          <Text style={[styles.dropdownItemText, locationTaluka?.id === t.id && styles.dropdownItemTextActive]}>{t.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Ward</Text>
                <TouchableOpacity
                  style={[styles.dropdownBtn, !locationTaluka && styles.dropdownBtnDisabled]}
                  onPress={() => locationTaluka && setLocationShowWardDropdown(!locationShowWardDropdown)}
                  disabled={!locationTaluka}
                >
                  <Text style={[styles.dropdownBtnText, !locationTaluka && styles.dropdownBtnTextDisabled]}>
                    {locationWardObj?.name || '-- Select Ward --'}
                  </Text>
                  <Ionicons name={locationShowWardDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={!locationTaluka ? '#d1d5db' : '#374151'} />
                </TouchableOpacity>
                {locationShowWardDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                      {locationWards.map((w) => (
                        <TouchableOpacity
                          key={w.id}
                          style={[styles.dropdownItem, locationWardObj?.id === w.id && styles.dropdownItemActive]}
                          onPress={() => {
                            setLocationWardObj(w);
                            setLocationShowWardDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, locationWardObj?.id === w.id && styles.dropdownItemTextActive]}>
                            {w.name}{w.ward_number ? ` (${w.ward_number})` : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalActions2}>
              <TouchableOpacity style={styles.modalCancel2} onPress={() => setShowLocationModal(false)}>
                <Text style={styles.modalCancelText2}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave2, locationSaving && { opacity: 0.6 }]}
                onPress={handleSaveLocation}
                disabled={locationSaving}
              >
                <Text style={styles.modalSaveText2}>{locationSaving ? 'Saving…' : 'Save Location'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? '#ef4444' : '#374151'} />
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    alignItems: 'center', backgroundColor: '#1a56db',
    paddingTop: 32, paddingBottom: 28, gap: 6,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  cameraIcon: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#1a56db', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, marginTop: 4 },
  roleText: { fontSize: 12, color: '#fff', fontWeight: '600', textTransform: 'capitalize' },
  rewardsCard: {
    flexDirection: 'row', backgroundColor: '#fff', margin: 16,
    borderRadius: 12, paddingVertical: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  rewardItem: { flex: 1, alignItems: 'center' },
  rewardVal: { fontSize: 22, fontWeight: '800', color: '#1a56db' },
  rewardLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  divider: { width: 1, backgroundColor: '#f3f4f6' },
  menu: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  menuLabel: { flex: 1, fontSize: 15, color: '#111827' },
  menuLabelDanger: { color: '#ef4444' },
  version: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24, marginBottom: 32 },
  languageCard: {
    backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 12,
    padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  languageCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  languageCardTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  langBtnRow: { flexDirection: 'row', gap: 8 },
  langBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center',
    backgroundColor: '#fff',
  },
  langBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  langBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  langBtnTextActive: { color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 32 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 14 },
  modalInput: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  modalCancelText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  modalSave: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1a56db' },
  modalSaveText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  // New expanded modal styles
  modalOverlay2: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal2: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  modalTitle2: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalContent: { paddingHorizontal: 20, paddingTop: 16 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  fieldInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  pickerContainer: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, overflow: 'hidden' },
  picker: { height: 50, color: '#111827' },
  modalActions2: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  modalCancel2: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  modalCancelText2: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  modalSave2: { flex: 1, backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  modalSaveText2: { fontSize: 14, color: '#fff', fontWeight: '700' },
  // Photo section styles
  photoSection: { paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f9fafb', marginBottom: 16 },
  photoPreviewContainer: { height: 300, backgroundColor: '#f9fafb', borderRadius: 12, overflow: 'hidden', marginBottom: 12, justifyContent: 'center', alignItems: 'center' },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  photoPlaceholderText: { fontSize: 12, color: '#d1d5db', marginTop: 8 },
  pickPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1a56db', paddingVertical: 12, borderRadius: 8, marginBottom: 8 },
  pickPhotoBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  uploadPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', paddingVertical: 12, borderRadius: 8 },
  uploadPhotoBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  // Dropdown styles
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  dropdownBtnDisabled: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  dropdownBtnText: { fontSize: 15, color: '#111827' },
  dropdownBtnTextDisabled: { color: '#9ca3af' },
  dropdownMenu: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, marginTop: 8, maxHeight: 200, backgroundColor: '#fff', overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownItemActive: { backgroundColor: '#f3f4f6' },
  dropdownItemText: { fontSize: 14, color: '#374151' },
  dropdownItemTextActive: { color: '#1a56db', fontWeight: '600' },
  // Mandatory profile modal styles
  mandatoryModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 16 },
  mandatoryModal: { backgroundColor: '#fff', borderRadius: 16, paddingBottom: 0, maxHeight: '90%' },
  mandatoryModalHeader: { paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  mandatoryModalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  mandatoryModalSubtitle: { fontSize: 14, color: '#6b7280' },
  mandatoryModalContent: { paddingHorizontal: 20, paddingTop: 20 },
  mandatoryModalActions: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  mandatorySaveBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 14, justifyContent: 'center', alignItems: 'center' },
  mandatorySaveBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  // GPS / location styles
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', paddingVertical: 12, borderRadius: 8, marginBottom: 8 },
  gpsBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  locationSetCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  locationSetText: { fontSize: 13, color: '#059669', fontWeight: '500', flex: 1 },
  fieldHint: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  // Address search row
  addressRow: { flexDirection: 'row', gap: 8, marginBottom: 0 },
  addressInput: { flex: 1 },
  addressSearchBtn: { width: 44, height: 44, backgroundColor: '#1a56db', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  // Map
  locationMapContainer: { borderRadius: 12, overflow: 'hidden', marginTop: 8, height: 220, backgroundColor: '#e5e7eb' },
  locationMapView: { flex: 1 },
  mapDragHint: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 6 },
  mapDragHintText: { fontSize: 12, color: '#fff' },
  // Home location card
  locationCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  locationCardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  locationCardTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 2 },
  locationCardValue: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  locationCardEmpty: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },
  locationEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  locationEditBtnText: { fontSize: 13, color: '#1a56db', fontWeight: '600' },
});
