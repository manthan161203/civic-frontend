import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Modal, TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useUiStore } from '../../src/store/uiStore';
import { useRouter, useFocusEffect } from 'expo-router';
import { workersApi } from '../../src/api/workers';
import { rewardsApi } from '../../src/api/rewards';
import { authApi } from '../../src/api/auth';
import { compressImage } from '../../src/utils/imageUtils';
import { logger } from '../../src/utils/logger';
import { notify, notifyError, confirm } from '../../src/lib/notify';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
};

const DAYS = [
  { key: 'monday', label: 'Mon', num: 0 },
  { key: 'tuesday', label: 'Tue', num: 1 },
  { key: 'wednesday', label: 'Wed', num: 2 },
  { key: 'thursday', label: 'Thu', num: 3 },
  { key: 'friday', label: 'Fri', num: 4 },
  { key: 'saturday', label: 'Sat', num: 5 },
  { key: 'sunday', label: 'Sun', num: 6 },
];

export default function WorkerProfile() {
  const { user, logout, updateUser } = useAuthStore();
  const { addToast } = useUiStore();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [rewards, setRewards] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo_url || null);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const loadStats = useCallback(() => {
    workersApi.getStats().then(({ data }) => {
      setStats(data);
      setIsAvailable(data.is_available ?? true);
    }).catch(() => {});
    rewardsApi.getMyRewards().then(({ data }) => setRewards(data)).catch(() => {});
  }, []);

  const loadShifts = useCallback(() => {
    workersApi.getShifts()
      .then(({ data }) => setShifts(data.items || data))
      .catch((err) => {
        logger.warn('Failed to load shifts in profile', err);
        setShifts([]);
      });
  }, []);

  useEffect(() => { loadStats(); }, []);

  // Reload stats + shifts every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadShifts();
    }, [loadStats, loadShifts])
  );

  useEffect(() => {
    if (user?.profile_photo_url) setProfilePhoto(user.profile_photo_url);
  }, [user?.profile_photo_url]);

  const handleLogout = async () => {
    // Same wording as the citizen app: signing out leaves anything queued on
    // the device, and a worker mid-shift should know that before tapping.
    const ok = await confirm({
      title: 'Sign out?',
      message: 'Anything still waiting to send stays on this device until you sign in again.',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (ok) logout();
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
        const compressedUri = await compressImage(result.assets[0].uri);
        setSelectedPhotoUri(compressedUri);
      }
    } catch {
      notifyError(err, 'Could not open your photo library.');
    }
  };

  const uploadPhoto = async () => {
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
      setProfilePhoto(data.profile_photo_url);
      updateUser(data);
      setSelectedPhotoUri(null);
      addToast('Profile photo updated!', 'success');
    } catch (error) {
      const msg = error?.response?.data?.detail || 'Failed to upload photo';
      addToast(msg, 'error');
    }
    setUploadingPhoto(false);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      addToast('Name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const { data } = await authApi.updateProfile({
        name: editName.trim(),
        email: editEmail.trim() || undefined,
      });
      updateUser(data);
      setEditModal(false);
      addToast('Profile updated!', 'success');
    } catch (error) {
      const msg = error?.response?.data?.detail || 'Failed to update profile.';
      addToast(msg, 'error');
    }
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarWrap} onPress={pickProfilePhoto}>
          {(selectedPhotoUri || profilePhoto) ? (
            <Image source={{ uri: selectedPhotoUri || getImageUrl(profilePhoto) }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'W'}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
        {selectedPhotoUri && (
          <TouchableOpacity style={styles.uploadBtn} onPress={uploadPhoto} disabled={uploadingPhoto}>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color="#059669" />
                <Text style={styles.uploadBtnText}>Upload Photo</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <Text style={styles.name}>{user?.name || 'Worker'}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Worker</Text>
        </View>
        {user?.ward ? (
          <View style={styles.wardBadge}>
            <Ionicons name="location-outline" size={12} color="#059669" />
            <Text style={styles.wardText}>{user.ward}</Text>
          </View>
        ) : null}
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{stats.tasks_completed_today || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{rewards?.total_points || 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={styles.statVal}>{stats.avg_rating ? stats.avg_rating.toFixed(1) : '—'}</Text>
              {!!stats.avg_rating && <Ionicons name="star" size={13} color="#f59e0b" />}
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      )}

      {/* Availability */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Accepting New Tasks</Text>
        <Switch
          value={isAvailable}
          onValueChange={async (val) => {
            const prev = isAvailable;
            setIsAvailable(val);
            try {
              await workersApi.setAvailability(val);
            } catch {
              setIsAvailable(prev);
              notify.error('Could not update your availability. Try again.');
            }
          }}
          trackColor={{ false: '#d1d5db', true: '#6ee7b7' }}
          thumbColor={isAvailable ? '#059669' : '#9ca3af'}
        />
      </View>

      {/* Shifts */}
      <View style={[styles.card, { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text style={styles.cardTitle}>Weekly Shifts</Text>
          <TouchableOpacity onPress={() => router.push('/(worker)/shifts')}>
            <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>Edit</Text>
          </TouchableOpacity>
        </View>
        {DAYS.map((day) => {
          const shift = shifts.find((s) => s.day_of_week === day.num);
          return (
            <View key={day.key} style={styles.shiftRow}>
              <Text style={styles.dayText}>{day.label}</Text>
              {shift ? (
                <View style={styles.shiftPill}>
                  <Text style={styles.shiftPillText}>{shift.start_time} – {shift.end_time}</Text>
                </View>
              ) : (
                <Text style={styles.shiftOff}>Off</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.menu}>
        <MenuItem icon="person-outline" label="Edit Profile" onPress={() => {
          setEditName(user?.name || '');
          setEditEmail(user?.email || '');
          setSelectedPhotoUri(null);
          setEditModal(true);
        }} />
        <MenuItem icon="trophy-outline" label="Leaderboard" onPress={() => router.push('/(worker)/leaderboard')} />
        <MenuItem icon="time-outline" label="Task History" onPress={() => router.push('/(worker)/history')} />
        <MenuItem icon="calendar-outline" label="Manage Shifts" onPress={() => router.push('/(worker)/shifts')} />
      </View>

      <View style={[styles.menu, { marginTop: 12 }]}>
        <MenuItem icon="log-out-outline" label="Logout" onPress={handleLogout} danger />
      </View>

      <Text style={styles.version}>Civic Worker v1.0.0</Text>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={26} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Photo Section */}
              <View style={styles.photoSection}>
                <View style={styles.photoPreview}>
                  {(selectedPhotoUri || profilePhoto) ? (
                    <Image source={{ uri: selectedPhotoUri || getImageUrl(profilePhoto) }} style={styles.photoImg} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="person" size={40} color="#d1d5db" />
                    </View>
                  )}
                </View>
                <View style={styles.photoBtns}>
                  <TouchableOpacity style={styles.pickBtn} onPress={pickProfilePhoto}>
                    <Ionicons name="image" size={16} color="#fff" />
                    <Text style={styles.pickBtnText}>Choose Photo</Text>
                  </TouchableOpacity>
                  {selectedPhotoUri && (
                    <TouchableOpacity
                      style={[styles.uploadModalBtn, uploadingPhoto && { opacity: 0.6 }]}
                      onPress={uploadPhoto}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                          <Text style={styles.uploadModalBtnText}>Upload</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <TextInput style={styles.fieldInput} value={editName} onChangeText={setEditName} placeholder="Your name" />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput style={styles.fieldInput} value={editEmail} onChangeText={setEditEmail} placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput style={[styles.fieldInput, { backgroundColor: '#f3f4f6', color: '#9ca3af' }]} value={user?.phone || ''} editable={false} />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
      </KeyboardAvoidingView>
  );
}

function MenuItem({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? '#ef4444' : '#374151'} />
      <Text style={[styles.menuLabel, danger && { color: '#ef4444' }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { alignItems: 'center', backgroundColor: '#059669', paddingTop: 32, paddingBottom: 28, gap: 4 },
  avatarWrap: { width: 80, height: 80, marginBottom: 6 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#059669', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginBottom: 4 },
  uploadBtnText: { fontSize: 12, fontWeight: '600', color: '#059669' },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, marginTop: 4 },
  roleText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  wardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 4 },
  wardText: { fontSize: 12, color: '#d1fae5', fontWeight: '500' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 12, paddingVertical: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', color: '#059669' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#f3f4f6' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  shiftRow: { flexDirection: 'row', gap: 12, alignItems: 'center', width: '100%', paddingVertical: 2 },
  dayText: { width: 34, fontSize: 13, fontWeight: '700', color: '#374151' },
  shiftPill: { backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  shiftPillText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  shiftOff: { fontSize: 13, color: '#d1d5db' },
  menu: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginTop: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  menuLabel: { flex: 1, fontSize: 15, color: '#111827' },
  version: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24, marginBottom: 32 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20 },
  photoSection: { alignItems: 'center', marginBottom: 20 },
  photoPreview: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', marginBottom: 12, backgroundColor: '#f3f4f6' },
  photoImg: { width: 100, height: 100 },
  photoPlaceholder: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  photoBtns: { flexDirection: 'row', gap: 8 },
  pickBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#059669', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  pickBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  uploadModalBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  uploadModalBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },
  saveBtn: { backgroundColor: '#059669', marginHorizontal: 20, marginVertical: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
