import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  TextInput, Modal, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { workersApi } from '../../src/api/workers';
import { compressImage } from '../../src/utils/imageUtils';

const STATUS_FLOW = {
  assigned: ['in_progress', 'blocked', 'rejected'],
  in_progress: ['blocked', 'resolved'],
  resolved: ['closed'],
  blocked: ['in_progress', 'rejected'],
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [statusModal, setStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);

  // Load task details
  useCallback(() => {
    (async () => {
      try {
        const { data } = await workersApi.getTaskDetail(id);
        setTask(data);
      } catch (err) {
        Alert.alert('Error', 'Failed to load task details');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const pickImage = async (isAfter = false) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        const compressedUri = await compressImage(result.assets[0].uri);
        if (isAfter) {
          setAfterPhotos([...afterPhotos, compressedUri]);
        } else {
          setBeforePhotos([...beforePhotos, compressedUri]);
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const removePhoto = (index, isAfter = false) => {
    if (isAfter) {
      setAfterPhotos(afterPhotos.filter((_, i) => i !== index));
    } else {
      setBeforePhotos(beforePhotos.filter((_, i) => i !== index));
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;

    setSubmitting(true);
    try {
      await workersApi.updateTaskStatus(id, selectedStatus, {
        resolution_notes: notes,
        before_photos: beforePhotos,
        after_photos: afterPhotos,
      });

      Alert.alert('Success', `Task marked as ${selectedStatus}`);
      setStatusModal(false);
      setSelectedStatus(null);
      
      // Reload task
      const { data } = await workersApi.getTaskDetail(id);
      setTask(data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update task');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  const availableStatusOptions = STATUS_FLOW[task.status] || [];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.issueType}>{task.issue_type?.replace(/_/g, ' ')}</Text>
              <Text style={styles.issueId}>ID: {String(task.id).slice(0, 12)}</Text>
            </View>
            <View style={[styles.statusBadge, styles.headerStatusBadge]}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
              <Text style={styles.statusBadgeText}>{task.status.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.description} numberOfLines={3}>{task.description}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Priority</Text>
              <Text style={[styles.infoBadge, { color: getPriorityColor(task.priority) }]}>
                {task.priority?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{task.address || 'No address'}</Text>
            </View>
          </View>
        </View>

        {/* Before Photos Section */}
        {(task.status === 'assigned' || task.status === 'in_progress') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="camera" size={18} color="#059669" />
              <Text style={styles.sectionTitle}>Before Photos</Text>
              <Text style={styles.photoBadge}>{beforePhotos.length}</Text>
            </View>

            <View style={styles.photoGrid}>
              {beforePhotos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => removePhoto(index, false)}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {beforePhotos.length < 5 && (
                <TouchableOpacity
                  style={styles.photoAdd}
                  onPress={() => pickImage(false)}
                >
                  <MaterialCommunityIcons name="camera-plus" size={32} color="#059669" />
                  <Text style={styles.photoAddText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Notes Section */}
        {(task.status === 'assigned' || task.status === 'in_progress') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={18} color="#059669" />
              <Text style={styles.sectionTitle}>Resolution Notes</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder="Add detailed notes about the work..."
              placeholderTextColor="#9ca3af"
              multiline={true}
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{notes.length}/1000</Text>
          </View>
        )}

        {/* After Photos Section (for marking resolved) */}
        {task.status === 'in_progress' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-done" size={18} color="#059669" />
              <Text style={styles.sectionTitle}>After Photos</Text>
              <Text style={styles.photoBadge}>{afterPhotos.length}</Text>
            </View>

            <View style={styles.photoGrid}>
              {afterPhotos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => removePhoto(index, true)}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {afterPhotos.length < 5 && (
                <TouchableOpacity
                  style={styles.photoAdd}
                  onPress={() => pickImage(true)}
                >
                  <MaterialCommunityIcons name="camera-plus" size={32} color="#059669" />
                  <Text style={styles.photoAddText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Status History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={18} color="#059669" />
            <Text style={styles.sectionTitle}>Timeline</Text>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Assigned</Text>
                <Text style={styles.timelineTime}>{new Date(task.created_at).toLocaleString()}</Text>
              </View>
            </View>

            {task.updated_at !== task.created_at && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: '#f59e0b' }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Last Updated</Text>
                  <Text style={styles.timelineTime}>{new Date(task.updated_at).toLocaleString()}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Action Bar */}
      {availableStatusOptions.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => setStatusModal(true)}
            disabled={submitting}
          >
            <Ionicons name="arrow-forward" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Update Status</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Update Modal */}
      <Modal visible={statusModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Task Status</Text>
              <TouchableOpacity onPress={() => setStatusModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Select new status:</Text>
            <View style={styles.statusOptions}>
              {availableStatusOptions.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    selectedStatus === status && styles.statusOptionSelected,
                  ]}
                  onPress={() => setSelectedStatus(status)}
                >
                  <View
                    style={[
                      styles.statusOptionDot,
                      selectedStatus === status && styles.statusOptionDotSelected,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusOptionText,
                      selectedStatus === status && styles.statusOptionTextSelected,
                    ]}
                  >
                    {status.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setStatusModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleUpdateStatus}
                disabled={!selectedStatus || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function getPriorityColor(priority) {
  const colors = {
    critical: '#7c3aed',
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
  };
  return colors[priority] || '#9ca3af';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6b7280' },
  content: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  spacer: { height: 80 },

  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  issueType: { fontSize: 16, fontWeight: '700', color: '#111' },
  issueId: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  headerStatusBadge: { paddingHorizontal: 10, paddingVertical: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: '#059669', marginLeft: 4 },
  description: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 12 },
  infoGrid: { flexDirection: 'row', gap: 12 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '500', marginBottom: 4 },
  infoBadge: { fontWeight: '600', fontSize: 12 },
  infoValue: { fontSize: 12, color: '#4b5563' },

  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111', flex: 1 },
  photoBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: { position: 'relative', width: '48%', aspectRatio: 1 },
  photoImage: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: '#f3f4f6' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 4,
  },
  photoAdd: {
    width: '48%',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafbfc',
  },
  photoAddText: { fontSize: 11, color: '#059669', fontWeight: '600', marginTop: 4 },

  notesInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#111',
    backgroundColor: '#fafbfc',
  },
  charCount: { fontSize: 11, color: '#9ca3af', marginTop: 4, textAlign: 'right' },

  timeline: { gap: 12 },
  timelineItem: { flexDirection: 'row', gap: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#059669', marginTop: 4 },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: 12, fontWeight: '600', color: '#111' },
  timelineTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 12,
    paddingBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  primaryButton: { backgroundColor: '#059669' },
  actionButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 12 },

  statusOptions: { gap: 8, marginBottom: 20 },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fafbfc',
  },
  statusOptionSelected: { borderColor: '#059669', backgroundColor: '#f0fdf4' },
  statusOptionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#d1d5db', marginRight: 10 },
  statusOptionDotSelected: { backgroundColor: '#059669' },
  statusOptionText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  statusOptionTextSelected: { color: '#059669', fontWeight: '600' },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  confirmButton: { backgroundColor: '#059669' },
  confirmButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
