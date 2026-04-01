import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Image, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { workersApi } from '../../src/api/workers';
import { issuesApi } from '../../src/api/issues';
import { formatDateTime } from '../../src/utils/dateUtils';

const PRIORITY_COLOR = { critical: '#7c3aed', high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    issuesApi.get(id)
      .then(({ data }) => {
        setIssue(data);
        navigation.setOptions({ title: data.issue_type?.replace('_', ' ') || 'Task' });
      })
      .finally(() => setLoading(false));
  }, [id]);

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
    Alert.prompt('Reject Task', 'Reason for rejection:', async (reason) => {
      if (!reason) return;
      setActionLoading(true);
      try {
        await workersApi.rejectTask(id, reason);
        Alert.alert('Rejected', 'Task has been rejected and reassigned.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (err) {
        Alert.alert('Error', err.response?.data?.detail || 'Failed');
      }
      setActionLoading(false);
    });
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
      const form = new FormData();
      form.append('after_photo', {
        uri: result.assets[0].uri,
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
    Alert.prompt('Block Task', 'Describe why you cannot proceed:', async (reason) => {
      if (!reason) return;
      setActionLoading(true);
      try {
        await workersApi.blockTask(id, reason);
        setIssue((prev) => ({ ...prev, status: 'blocked' }));
        Alert.alert('Reported', 'Admin has been notified.');
      } catch (err) {
        Alert.alert('Error', err.response?.data?.detail || 'Failed');
      }
      setActionLoading(false);
    });
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#059669" size="large" />;
  if (!issue) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Not found</Text></View>;

  const photo = issue.photos?.find((p) => p.photo_type === 'before')?.photo_url;
  const priorityColor = PRIORITY_COLOR[issue.priority] || '#9ca3af';
  const isActive = ['assigned', 'in_progress'].includes(issue.status);

  return (
    <ScrollView style={styles.container}>
      {photo && <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />}

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
          onPress={() => router.push('/(worker)/map')}
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

      <View style={{ height: 40 }} />
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
});
