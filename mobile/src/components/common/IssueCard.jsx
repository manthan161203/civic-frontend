import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STATUS_COLORS = {
  open: { bg: '#fef3c7', text: '#92400e' },
  in_progress: { bg: '#dbeafe', text: '#1e40af' },
  resolved: { bg: '#d1fae5', text: '#065f46' },
  closed: { bg: '#f3f4f6', text: '#6b7280' },
  escalated: { bg: '#fee2e2', text: '#991b1b' },
};

const PRIORITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7c3aed',
};

export default function IssueCard({ issue, onPress }) {
  const status = STATUS_COLORS[issue.status] || STATUS_COLORS.open;
  const priorityColor = PRIORITY_COLORS[issue.priority] || PRIORITY_COLORS.medium;
  // Backend returns before_photos / after_photos as flat string arrays
  let photo = issue.before_photos?.[0] ?? null;

  // If photo is a relative path, prepend the base URL
  if (photo && !photo.startsWith('http')) {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
    photo = `${baseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`;
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {photo && (
        <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
      )}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>
              {issue.status?.replace('_', ' ')}
            </Text>
          </View>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        </View>

        <Text style={styles.title} numberOfLines={2}>{issue.description}</Text>

        <View style={styles.meta}>
          <Ionicons name="location-outline" size={13} color="#9ca3af" />
          <Text style={styles.metaText} numberOfLines={1}>{issue.address || issue.ward || 'Unknown location'}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.typeChip}>
            <Text style={styles.typeText}>{issue.issue_type?.replace('_', ' ')}</Text>
          </View>
          <View style={styles.statsRow}>
            <Ionicons name="arrow-up-outline" size={12} color="#9ca3af" />
            <Text style={styles.stat}>{issue.upvote_count || 0}</Text>
            <Ionicons name="chatbubble-outline" size={12} color="#9ca3af" style={{ marginLeft: 8 }} />
            <Text style={styles.stat}>{issue.comment_count || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  photo: { width: '100%', height: 140 },
  content: { padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 14, color: '#111827', fontWeight: '500', lineHeight: 20, marginBottom: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
  metaText: { fontSize: 12, color: '#9ca3af', flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeChip: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeText: { fontSize: 11, color: '#6b7280', textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stat: { fontSize: 12, color: '#9ca3af' },
});
