import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Image, TextInput, Modal, KeyboardAvoidingView, Platform, Linking,
  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { workersApi } from '../../src/api/workers';
import { issuesApi } from '../../src/api/issues';
import { BASE_URL } from '../../src/api/client';
import { formatDateTime } from '../../src/utils/dateUtils';
import { compressImage } from '../../src/utils/imageUtils';

const PRIORITY_COLOR = { critical: '#7c3aed', high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reasonModal, setReasonModal] = useState(null); // 'reject' | 'block' | null
  const [reasonText, setReasonText] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [notes, setNotes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      console.log('Loading task:', id);
      const [issueRes, commentsRes] = await Promise.all([
        issuesApi.get(id),
        issuesApi.getComments(id),
      ]);
      console.log('Task loaded:', issueRes.data);
      const allComments = commentsRes.data.items || commentsRes.data;
      setIssue(issueRes.data);
      setNotes(allComments.filter((c) => c.is_internal));
      navigation.setOptions({ title: issueRes.data.issue_type?.replace('_', ' ') || 'Task' });
    } catch (err) {
      console.error('Failed to load task:', err);
      Alert.alert('Error', 'Failed to load task details: ' + (err.response?.data?.detail || err.message));
    }
  }, [id]);

  const loadNotes = useCallback(async () => {
    try {
      const { data } = await issuesApi.getComments(id);
      const all = data.items || data;
      setNotes(all.filter((c) => c.is_internal));
    } catch {}
  }, [id]);

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, [id]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const accept = async () => {
    setActionLoading(true);
    try {
      await workersApi.acceptTask(id);
      setIssue((prev) => ({ ...prev, status: 'in_progress' }));
      Alert.alert('Accepted', 'Task is now in progress.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed');
    }
    setActionLoading(false);
  };

  const reject = () => {
    setReasonText('');
    setReasonModal('reject');
  };

  const resolve = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access in Settings.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7, allowsEditing: true, aspect: [4, 3],
      });
      if (result.canceled) return;

      setActionLoading(true);
      const compressedUri = await compressImage(result.assets[0].uri);
      const form = new FormData();
      form.append('after_photo', {
        uri: compressedUri,
        name: 'after.jpg',
        type: 'image/jpeg',
      });
      await workersApi.resolveTask(id, form);
      setIssue((prev) => ({ ...prev, status: 'resolved' }));
      Alert.alert('Resolved!', 'Task marked as resolved. Great work!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not open camera. Please check app permissions in Settings.');
    }
    setActionLoading(false);
  };

  const block = () => {
    setReasonText('');
    setReasonModal('block');
  };

  const addNote = async () => {
    if (!noteInput.trim()) return;
    setNotesLoading(true);
    try {
      await issuesApi.addComment(id, noteInput.trim(), null, true); // is_internal=true
      setNoteInput('');
      await loadNotes();
    } catch (err) {
      Alert.alert('Error', 'Could not add note');
    }
    setNotesLoading(false);
  };

  const submitReason = async () => {
    if (!reasonText.trim()) return;
    setReasonModal(null);
    setActionLoading(true);
    try {
      if (reasonModal === 'reject') {
        await workersApi.rejectTask(id, reasonText.trim());
        Alert.alert('Rejected', 'Task has been rejected and reassigned.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await workersApi.blockTask(id, reasonText.trim());
        setIssue((prev) => ({ ...prev, status: 'blocked' }));
        Alert.alert('Reported', 'Admin has been notified.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed');
    }
    setActionLoading(false);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#059669" size="large" />;
  if (!issue) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Not found</Text></View>;

  const photo = issue.before_photos?.[0] ?? null;
  const photoUri = photo
    ? (photo.startsWith('http') ? photo : `${BASE_URL}${photo.startsWith('/') ? '' : '/'}${photo}`)
    : null;
  const priorityColor = PRIORITY_COLOR[issue.priority] || '#9ca3af';
  const isActive = ['assigned', 'in_progress'].includes(issue.status);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />}
    >
      {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />}

      <View style={styles.section}>
        <View style={styles.badgeRow}>
          <View style={[styles.priorityChip, { backgroundColor: priorityColor + '22', borderColor: priorityColor }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>{issue.priority} priority</Text>
          </View>
          <Text style={styles.issueType}>{issue.issue_type?.replace('_', ' ')}</Text>
        </View>
        <Text style={styles.description}>{issue.description}</Text>

        <View style={styles.row}>
          <Ionicons name="location-outline" size={14} color="#9ca3af" />
          <Text style={styles.meta}>{issue.address || 'Location unknown'}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
          <Text style={styles.meta}>{formatDateTime(issue.created_at, 'en-IN')}</Text>
        </View>
        {issue.reporter_name && (
          <View style={styles.row}>
            <Ionicons name="person-outline" size={14} color="#9ca3af" />
            <Text style={styles.meta}>Reported by {issue.reporter_name}</Text>
          </View>
        )}
      </View>

      {/* Navigation button */}
      {issue.latitude && issue.longitude && (
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => {
            const lat = issue.latitude;
            const lon = issue.longitude;
            const label = encodeURIComponent(issue.address || issue.issue_type || 'Issue Location');
            const url = Platform.select({
              ios: `maps:0,0?q=${label}@${lat},${lon}`,
              android: `geo:${lat},${lon}?q=${lat},${lon}(${label})`,
            });
            Linking.canOpenURL(url).then((supported) => {
              if (supported) {
                Linking.openURL(url);
              } else {
                // Fallback to Google Maps web
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`);
              }
            });
          }}
        >
          <Ionicons name="navigate" size={18} color="#fff" />
          <Text style={styles.navBtnText}>Navigate to Location</Text>
        </TouchableOpacity>
      )}

      {/* Actions */}
      {isActive && !actionLoading && (
        <View style={styles.actions}>
          {issue.status === 'assigned' && (
            <TouchableOpacity style={styles.acceptBtn} onPress={accept}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.btnText}>Accept Task</Text>
            </TouchableOpacity>
          )}
          {issue.status === 'in_progress' && (
            <TouchableOpacity style={styles.resolveBtn} onPress={resolve}>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.btnText}>Resolve with Photo</Text>
            </TouchableOpacity>
          )}
          <View style={styles.secondaryRow}>
            <TouchableOpacity style={styles.rejectBtn} onPress={reject}>
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.blockBtn} onPress={block}>
              <Text style={styles.blockText}>Block</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {actionLoading && <ActivityIndicator style={{ margin: 20 }} color="#059669" />}

      {issue.status === 'resolved' && (
        <View style={styles.resolvedBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#059669" />
          <Text style={styles.resolvedText}>This task has been resolved</Text>
        </View>
      )}

      {/* Task Notes — internal, visible to workers and admins only */}
      <View style={styles.notesSection}>
        <View style={styles.notesTitleRow}>
          <Text style={styles.notesTitle}>Task Notes</Text>
          <View style={styles.internalBadge}>
            <Text style={styles.internalBadgeText}>Internal</Text>
          </View>
        </View>

        {/* Notes List */}
        {notes.length > 0 ? (
          <View style={styles.commentsList}>
            {notes.map((note) => (
              <View key={note.id} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{note.author?.name || 'Unknown'}</Text>
                  <Text style={styles.commentTime}>{formatDateTime(note.created_at, 'en-IN')}</Text>
                </View>
                <Text style={styles.commentBody}>{note.body}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noComments}>No notes yet</Text>
        )}

        {/* Add Note Input */}
        <View style={styles.noteInputSection}>
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note..."
            value={noteInput}
            onChangeText={setNoteInput}
            multiline
            editable={!notesLoading}
          />
          <TouchableOpacity
            style={[styles.addNoteBtn, (!noteInput.trim() || notesLoading) && { opacity: 0.4 }]}
            onPress={addNote}
            disabled={!noteInput.trim() || notesLoading}
          >
            <Text style={styles.addNoteBtnText}>{notesLoading ? 'Adding...' : 'Add Note'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />

      {/* Reason Modal for Reject / Block (cross-platform replacement for Alert.prompt) */}
      <Modal visible={!!reasonModal} transparent animationType="fade" onRequestClose={() => setReasonModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={modalStyles.overlay}>
          <View style={modalStyles.box}>
            <Text style={modalStyles.title}>
              {reasonModal === 'reject' ? 'Reject Task' : 'Block Task'}
            </Text>
            <Text style={modalStyles.subtitle}>
              {reasonModal === 'reject' ? 'Reason for rejection:' : 'Describe why you cannot proceed:'}
            </Text>
            <TextInput
              style={modalStyles.input}
              value={reasonText}
              onChangeText={setReasonText}
              placeholder="Enter reason..."
              multiline
              autoFocus
            />
            <View style={modalStyles.btnRow}>
              <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setReasonModal(null)}>
                <Text style={modalStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.submitBtn, !reasonText.trim() && { opacity: 0.4 }]}
                onPress={submitReason}
                disabled={!reasonText.trim()}
              >
                <Text style={modalStyles.submitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  photo: { width: '100%', height: 220 },
  section: { backgroundColor: '#fff', padding: 16, marginTop: 0 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  priorityChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  priorityText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  issueType: { fontSize: 13, color: '#6b7280', textTransform: 'capitalize' },
  description: { fontSize: 16, color: '#111827', lineHeight: 24, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  meta: { fontSize: 13, color: '#9ca3af' },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 16, backgroundColor: '#1a56db', borderRadius: 12, height: 48,
  },
  navBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  actions: { marginHorizontal: 16, gap: 10 },
  acceptBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#059669', borderRadius: 12, height: 52,
  },
  resolveBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#059669', borderRadius: 12, height: 52,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, height: 44, borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rejectText: { color: '#ef4444', fontWeight: '700' },
  blockBtn: { flex: 1, height: 44, borderWidth: 1.5, borderColor: '#f59e0b', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  blockText: { color: '#f59e0b', fontWeight: '700' },
  resolvedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    margin: 16, backgroundColor: '#d1fae5', borderRadius: 12, padding: 16,
  },
  resolvedText: { fontSize: 15, color: '#065f46', fontWeight: '600' },
  notesSection: { backgroundColor: '#fff', padding: 16, marginTop: 8 },
  notesTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  notesTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  internalBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  internalBadgeText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  commentsList: { marginBottom: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
  commentItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: '#111827' },
  commentTime: { fontSize: 12, color: '#9ca3af' },
  commentBody: { fontSize: 13, color: '#374151', lineHeight: 18 },
  noComments: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', marginBottom: 12 },
  noteInputSection: { gap: 8 },
  noteInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10,
    fontSize: 13, color: '#111827', minHeight: 60, textAlignVertical: 'top',
  },
  addNoteBtn: { backgroundColor: '#059669', borderRadius: 8, padding: 12, alignItems: 'center' },
  addNoteBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  box: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#111827', minHeight: 80,
    textAlignVertical: 'top',
  },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelText: { color: '#6b7280', fontWeight: '600' },
  submitBtn: { backgroundColor: '#ef4444', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  submitText: { color: '#fff', fontWeight: '700' },
});
