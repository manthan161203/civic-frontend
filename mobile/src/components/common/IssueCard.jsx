import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, StatusColors, PriorityColors, Typography, Radius, Spacing, Shadow } from '../../theme';

export default function IssueCard({ issue, onPress }) {
  const status = StatusColors[issue.status] || StatusColors.open;
  const priority = PriorityColors[issue.priority] || PriorityColors.medium;
  let photo = issue.before_photos?.[0] ?? null;
  if (photo && !photo.startsWith('http')) {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
    photo = `${baseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`;
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {photo && <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>
              {issue.status?.replace('_', ' ')}
            </Text>
          </View>
          <View style={[styles.priorityDot, { backgroundColor: priority.dot }]} />
        </View>

        <Text style={styles.title} numberOfLines={2}>{issue.description}</Text>

        <View style={styles.meta}>
          <Ionicons name="location-outline" size={13} color={Colors.textLight} />
          <Text style={styles.metaText} numberOfLines={1}>
            {issue.address || issue.ward || 'Unknown location'}
          </Text>
        </View>

        {issue.assigned_worker_name ? (
          <View style={styles.workerRow}>
            <Ionicons name="person-circle-outline" size={13} color={Colors.worker} />
            <Text style={styles.workerText} numberOfLines={1}>
              {['assigned', 'in_progress', 'blocked'].includes(issue.status)
                ? `Assigned to ${issue.assigned_worker_name}`
                : `Resolved by ${issue.assigned_worker_name}`}
            </Text>
          </View>
        ) : (
          issue.status === 'open' && (
            <View style={styles.workerRow}>
              <Ionicons name="time-outline" size={13} color={Colors.textLight} />
              <Text style={[styles.workerText, { color: Colors.textLight }]}>Awaiting assignment</Text>
            </View>
          )
        )}

        <View style={styles.footer}>
          <View style={styles.typeChip}>
            <Text style={styles.typeText}>{issue.issue_type?.replace('_', ' ')}</Text>
          </View>
          <View style={styles.statsRow}>
            <Ionicons name="arrow-up-outline" size={12} color={Colors.textLight} />
            <Text style={styles.stat}>{issue.upvote_count || 0}</Text>
            <Ionicons name="chatbubble-outline" size={12} color={Colors.textLight} style={{ marginLeft: 8 }} />
            <Text style={styles.stat}>{issue.comment_count || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  photo: { width: '100%', height: 140 },
  content: { padding: Spacing.md + 2 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm - 2,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.md },
  statusText: { fontSize: Typography.xs + 1, fontWeight: Typography.bold, textTransform: 'capitalize' },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  title: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontWeight: Typography.medium,
    lineHeight: 20,
    marginBottom: Spacing.sm - 2,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: Spacing.sm - 2 },
  metaText: { fontSize: Typography.sm, color: Colors.textLight, flex: 1 },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  workerText: { fontSize: Typography.sm, color: Colors.worker, fontWeight: Typography.medium, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeChip: {
    backgroundColor: Colors.bgLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  typeText: { fontSize: Typography.xs + 1, color: Colors.textMuted, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stat: { fontSize: Typography.sm, color: Colors.textLight },
});
