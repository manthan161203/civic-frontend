import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { issuesApi } from '../../src/api/issues';
import { useAuthStore } from '../../src/store/authStore';
import { formatDate, formatDateTime } from '../../src/utils/dateUtils';

const STATUS_COLORS = {
  open: { bg: '#fef3c7', text: '#92400e' },
  in_progress: { bg: '#dbeafe', text: '#1e40af' },
  resolved: { bg: '#d1fae5', text: '#065f46' },
  escalated: { bg: '#fee2e2', text: '#991b1b' },
  closed: { bg: '#f3f4f6', text: '#6b7280' },
};

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [issue, setIssue] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [upvoted, setUpvoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    try {
      const [issueRes, timelineRes, commentsRes] = await Promise.all([
        issuesApi.get(id),
        issuesApi.getTimeline(id),
        issuesApi.getComments(id),
      ]);
      setIssue(issueRes.data);
      setTimeline(timelineRes.data.items || timelineRes.data);
      setComments(commentsRes.data.items || commentsRes.data);
      navigation.setOptions({ title: issueRes.data.issue_type?.replace('_', ' ') || 'Issue Details' });
    } catch {}
    setLoading(false);
  };

  const handleUpvote = async () => {
    try {
      if (upvoted) {
        await issuesApi.removeUpvote(id);
        setIssue((prev) => ({ ...prev, upvote_count: (prev.upvote_count || 1) - 1 }));
      } else {
        await issuesApi.upvote(id);
        setIssue((prev) => ({ ...prev, upvote_count: (prev.upvote_count || 0) + 1 }));
      }
      setUpvoted(!upvoted);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed');
    }
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const { data } = await issuesApi.addComment(id, comment.trim());
      setComments((prev) => [...prev, data]);
      setComment('');
    } catch {}
    setPosting(false);
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} color="#1a56db" size="large" />;
  }

  if (!issue) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#9ca3af' }}>Issue not found</Text>
      </View>
    );
  }

  const status = STATUS_COLORS[issue.status] || STATUS_COLORS.open;
  const beforePhoto = issue.photos?.find((p) => p.photo_type === 'before')?.photo_url;
  const afterPhoto = issue.photos?.find((p) => p.photo_type === 'after')?.photo_url;

  return (
    <ScrollView style={styles.container}>
      {/* Photos */}
      {beforePhoto && (
        <Image source={{ uri: beforePhoto }} style={styles.heroPhoto} resizeMode="cover" />
      )}

      {/* Status + Type */}
      <View style={styles.headerSection}>
        <View style={styles.badgesRow}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>
              {issue.status?.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.typeChip}>
            <Text style={styles.typeText}>{issue.issue_type?.replace('_', ' ')}</Text>
          </View>
          <View style={[styles.priorityChip, { backgroundColor: issue.priority === 'high' || issue.priority === 'critical' ? '#fee2e2' : '#f3f4f6' }]}>
            <Text style={{ fontSize: 12, color: issue.priority === 'high' || issue.priority === 'critical' ? '#991b1b' : '#6b7280', fontWeight: '600' }}>
              {issue.priority}
            </Text>
          </View>
        </View>
        <Text style={styles.description}>{issue.description}</Text>
        {issue.address && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#9ca3af" />
            <Text style={styles.locationText}>{issue.address}</Text>
          </View>
        )}
        <Text style={styles.date}>
          Reported {formatDate(issue.created_at, 'en-IN')}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, upvoted && styles.actionBtnActive]} onPress={handleUpvote}>
          <Ionicons name={upvoted ? 'arrow-up' : 'arrow-up-outline'} size={18} color={upvoted ? '#1a56db' : '#374151'} />
          <Text style={[styles.actionText, upvoted && styles.actionTextActive]}>
            {issue.upvote_count || 0} Upvotes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => Alert.alert('Flag Issue', 'Report this as spam or duplicate?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Report', onPress: () => issuesApi.flag(id, 'spam', '') },
          ])}
        >
          <Ionicons name="flag-outline" size={18} color="#374151" />
          <Text style={styles.actionText}>Flag</Text>
        </TouchableOpacity>
        {issue.status === 'resolved' && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => issuesApi.reopen(id).then(() => load())}
          >
            <Ionicons name="refresh-outline" size={18} color="#374151" />
            <Text style={styles.actionText}>Reopen</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* After Photo */}
      {afterPhoto && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resolution Photo</Text>
          <Image source={{ uri: afterPhoto }} style={styles.afterPhoto} resizeMode="cover" />
        </View>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {timeline.map((event, i) => (
            <View key={i} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              {i < timeline.length - 1 && <View style={styles.timelineLine} />}
              <View style={styles.timelineContent}>
                <Text style={styles.timelineEvent}>{event.event?.replace(/_/g, ' ')}</Text>
                <Text style={styles.timelineDate}>
                  {formatDateTime(event.created_at, 'en-IN')}
                </Text>
                {event.note && <Text style={styles.timelineNote}>{event.note}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Comments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
        {comments.map((c) => (
          <View key={c.id} style={styles.comment}>
            <View style={styles.commentAvatar}>
              <Text style={styles.commentAvatarText}>{c.author_name?.charAt(0) || '?'}</Text>
            </View>
            <View style={styles.commentBody}>
              <Text style={styles.commentAuthor}>{c.author_name || 'User'}</Text>
              <Text style={styles.commentText}>{c.content}</Text>
              <Text style={styles.commentTime}>
                {formatDate(c.created_at, 'en-IN')}
              </Text>
            </View>
          </View>
        ))}
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment…"
            value={comment}
            onChangeText={setComment}
            returnKeyType="send"
            onSubmitEditing={postComment}
          />
          <TouchableOpacity
            style={[styles.commentSend, (!comment.trim() || posting) && { opacity: 0.5 }]}
            onPress={postComment}
            disabled={!comment.trim() || posting}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  heroPhoto: { width: '100%', height: 220 },
  headerSection: { backgroundColor: '#fff', padding: 16 },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  typeChip: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  priorityChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  description: { fontSize: 16, color: '#111827', lineHeight: 24, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  locationText: { fontSize: 13, color: '#9ca3af' },
  date: { fontSize: 12, color: '#9ca3af' },
  actionsRow: {
    flexDirection: 'row', backgroundColor: '#fff', marginTop: 8,
    paddingHorizontal: 16, paddingVertical: 12, gap: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  actionBtnActive: {},
  actionText: { fontSize: 13, color: '#374151' },
  actionTextActive: { color: '#1a56db', fontWeight: '600' },
  section: { backgroundColor: '#fff', marginTop: 12, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  afterPhoto: { width: '100%', height: 180, borderRadius: 8 },
  timelineItem: { flexDirection: 'row', gap: 12, paddingBottom: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1a56db', marginTop: 4 },
  timelineLine: { position: 'absolute', left: 5, top: 16, width: 2, height: '100%', backgroundColor: '#dbeafe' },
  timelineContent: { flex: 1 },
  timelineEvent: { fontSize: 14, color: '#111827', fontWeight: '600', textTransform: 'capitalize' },
  timelineDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  timelineNote: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  comment: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 15, fontWeight: '700', color: '#1a56db' },
  commentBody: { flex: 1 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#111827' },
  commentText: { fontSize: 13, color: '#374151', lineHeight: 18 },
  commentTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  commentInputRow: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'flex-end' },
  commentInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827',
  },
  commentSend: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a56db', justifyContent: 'center', alignItems: 'center' },
});
