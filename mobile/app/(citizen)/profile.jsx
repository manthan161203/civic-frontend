import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { rewardsApi } from '../../src/api/rewards';
import { authApi } from '../../src/api/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuthStore();
  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    rewardsApi.getMyRewards()
      .then(({ data }) => setRewards(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const { data } = await authApi.updateProfile({ name: editName.trim() });
      updateUser({ name: data.name });
      setEditModal(false);
    } catch {
      Alert.alert('Error', 'Failed to update name.');
    }
    setSaving(false);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
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
        <MenuItem icon="person-outline" label="Edit Profile" onPress={() => { setEditName(user?.name || ''); setEditModal(true); }} />
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

      {/* Edit Name Modal */}
      <Modal visible={editModal} transparent animationType="fade" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your full name"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setEditModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, saving && { opacity: 0.6 }]}
                onPress={handleSaveName}
                disabled={saving}
              >
                <Text style={styles.modalSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
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
});
