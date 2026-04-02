import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Modal, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { rewardsApi } from '../../src/api/rewards';
import { authApi } from '../../src/api/auth';
import { locationsApi } from '../../src/api/locations';

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
  const [mandatoryWard, setMandatoryWard] = useState(user?.ward || '');
  const [mandatoryLanguage, setMandatoryLanguage] = useState(user?.language || 'en');
  const [mandatoryShowWardDropdown, setMandatoryShowWardDropdown] = useState(false);
  const [mandatoryShowLanguageDropdown, setMandatoryShowLanguageDropdown] = useState(false);
  const [mandatorySaving, setMandatorySaving] = useState(false);

  useEffect(() => {
    rewardsApi.getMyRewards()
      .then(({ data }) => setRewards(data))
      .catch(() => {})
      .finally(() => setLoading(false));
      
    // Load wards for dropdown
    locationsApi.getTree()
      .then(({ data }) => {
        const allWards = [];
        (data.districts || data).forEach((district) => {
          (district.talukas || []).forEach((taluka) => {
            (taluka.wards || []).forEach((ward) => {
              allWards.push({ id: ward.id, name: ward.name });
            });
          });
        });
        setWards(allWards);
      })
      .catch(() => {});
      
    // Update profile photo when user changes
    if (user?.profile_photo_url) {
      setProfilePhoto(user.profile_photo_url);
    }
  }, [user?.profile_photo_url]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const pickProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedPhotoUri(result.assets[0].uri);
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
    if (!mandatoryEmail.trim()) {
      Alert.alert('Error', 'Email is required.');
      return;
    }
    if (!mandatoryWard) {
      Alert.alert('Error', 'Ward is required.');
      return;
    }
    setMandatorySaving(true);
    try {
      const updateData = {
        name: mandatoryName.trim(),
        email: mandatoryEmail.trim(),
        ward: mandatoryWard,
        language: mandatoryLanguage,
        phone: '',
      };
      const { data } = await authApi.updateProfile(updateData);
      updateUser({ 
        name: data.name,
        email: data.email,
        ward: data.ward,
        language: data.language,
      });
      setShowMandatoryModal(false);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to complete profile setup.');
    }
    setMandatorySaving(false);
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
        <Text style={styles.phone}>{user?.phone}</Text>
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

      {/* Menu */}
      <View style={styles.menu}>
        <MenuItem icon="megaphone-outline" label="Announcements" onPress={() => router.push('/(citizen)/announcements')} />
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

      {/* Mandatory Profile Completion Modal (First-time Registration) */}
      <Modal visible={showMandatoryModal} transparent animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
        <View style={styles.mandatoryModalOverlay}>
          <View style={styles.mandatoryModal}>
            <View style={styles.mandatoryModalHeader}>
              <Text style={styles.mandatoryModalTitle}>Complete Your Profile</Text>
              <Text style={styles.mandatoryModalSubtitle}>Required information to get started</Text>
            </View>

            <ScrollView style={styles.mandatoryModalContent}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter your full name"
                  placeholderTextColor="#d1d5db"
                  value={mandatoryName}
                  onChangeText={setMandatoryName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#d1d5db"
                  value={mandatoryEmail}
                  onChangeText={setMandatoryEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Ward *</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setMandatoryShowWardDropdown(!mandatoryShowWardDropdown)}
                >
                  <Text style={styles.dropdownBtnText}>{mandatoryWard || '-- Select Ward --'}</Text>
                  <Ionicons name={mandatoryShowWardDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#374151" />
                </TouchableOpacity>
                {mandatoryShowWardDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                      <TouchableOpacity
                        style={[styles.dropdownItem, mandatoryWard === '' && styles.dropdownItemActive]}
                        onPress={() => {
                          setMandatoryWard('');
                          setMandatoryShowWardDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>-- Select Ward --</Text>
                      </TouchableOpacity>
                      {wards.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.dropdownItem, mandatoryWard === item.name && styles.dropdownItemActive]}
                          onPress={() => {
                            setMandatoryWard(item.name);
                            setMandatoryShowWardDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Language Preference *</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setMandatoryShowLanguageDropdown(!mandatoryShowLanguageDropdown)}
                >
                  <Text style={styles.dropdownBtnText}>
                    {mandatoryLanguage === 'en' ? 'English (en)' : mandatoryLanguage === 'gu' ? 'Gujarati (gu)' : 'Hindi (hi)'}
                  </Text>
                  <Ionicons name={mandatoryShowLanguageDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#374151" />
                </TouchableOpacity>
                {mandatoryShowLanguageDropdown && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity
                      style={[styles.dropdownItem, mandatoryLanguage === 'en' && styles.dropdownItemActive]}
                      onPress={() => {
                        setMandatoryLanguage('en');
                        setMandatoryShowLanguageDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, mandatoryLanguage === 'en' && styles.dropdownItemTextActive]}>
                        English (en)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dropdownItem, mandatoryLanguage === 'gu' && styles.dropdownItemActive]}
                      onPress={() => {
                        setMandatoryLanguage('gu');
                        setMandatoryShowLanguageDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, mandatoryLanguage === 'gu' && styles.dropdownItemTextActive]}>
                        Gujarati (gu)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dropdownItem, mandatoryLanguage === 'hi' && styles.dropdownItemActive]}
                      onPress={() => {
                        setMandatoryLanguage('hi');
                        setMandatoryShowLanguageDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, mandatoryLanguage === 'hi' && styles.dropdownItemTextActive]}>
                        Hindi (hi)
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.mandatoryModalActions}>
              <TouchableOpacity
                style={[styles.mandatorySaveBtn, mandatorySaving && { opacity: 0.6 }]}
                onPress={handleMandatorySaveProfile}
                disabled={mandatorySaving}
              >
                <Text style={styles.mandatorySaveBtnText}>{mandatorySaving ? 'Setting up…' : 'Continue'}</Text>
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
  mandatoryModal: { backgroundColor: '#fff', borderRadius: 16, paddingBottom: 0, maxHeight: '85%' },
  mandatoryModalHeader: { paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  mandatoryModalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  mandatoryModalSubtitle: { fontSize: 14, color: '#6b7280' },
  mandatoryModalContent: { paddingHorizontal: 20, paddingTop: 20 },
  mandatoryModalActions: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  mandatorySaveBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingVertical: 14, justifyContent: 'center', alignItems: 'center' },
  mandatorySaveBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },
});
