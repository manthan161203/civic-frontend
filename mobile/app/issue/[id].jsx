import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, FlatList, Modal,
  KeyboardAvoidingView, Platform, Share, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { issuesApi } from '../../src/api/issues';
import { BASE_URL } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { formatDate, formatDateTime } from '../../src/utils/dateUtils';
import { logger } from '../../src/utils/logger';  // Structured logging for debugging

const STATUS_COLORS = {
  open: { bg: '#fef3c7', text: '#92400e' },
  in_progress: { bg: '#dbeafe', text: '#1e40af' },
  resolved: { bg: '#d1fae5', text: '#065f46' },
  escalated: { bg: '#fee2e2', text: '#991b1b' },
  closed: { bg: '#f3f4f6', text: '#6b7280' },
};

const FLAG_REASONS = ['spam', 'duplicate', 'inappropriate', 'false_report', 'other'];

function FlagModal({ visible, onClose, onSubmit }) {
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit(reason, description.trim());
    setSubmitting(false);
    setReason('spam');
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Issue</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalLabel}>Reason</Text>
          <View style={styles.reasonGrid}>
            {FLAG_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.reasonBtn, reason === r && styles.reasonBtnActive]}
                onPress={() => setReason(r)}
              >
                <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>
                  {r.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.modalLabel}>Additional Details (optional)</Text>
          <TextInput
            style={styles.modalTextArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue..."
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>{submitting ? 'Submitting…' : 'Submit Report'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const AVATAR_COLORS = {
  citizen: { bg: '#dbeafe', text: '#1a56db' },
  worker:  { bg: '#d1fae5', text: '#065f46' },
  admin:   { bg: '#fef3c7', text: '#92400e' },
};

const ROLE_BADGES = {
  worker: { bg: '#d1fae5', text: '#065f46', label: 'Worker' },
  admin:  { bg: '#fef3c7', text: '#92400e', label: 'Admin' },
};

function CommentBubble({ comment, user, onReply, onDelete, isReply = false }) {
  const role = comment.author?.role || 'citizen';
  const colors = AVATAR_COLORS[role] || AVATAR_COLORS.citizen;
  const roleBadge = ROLE_BADGES[role];
  const canDelete = comment.author?.id === user?.id || user?.role?.includes('admin');
  const avatarSize = isReply ? 28 : 34;

  return (
    <View style={[cbStyles.row, isReply && cbStyles.replyRow]}>
      <View style={[cbStyles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: colors.bg }]}>
        <Text style={[cbStyles.avatarText, { color: colors.text, fontSize: isReply ? 12 : 14 }]}>
          {comment.author?.name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>

      <View style={cbStyles.bubble}>
        <View style={cbStyles.bubbleHeader}>
          <Text style={cbStyles.authorName}>{comment.author?.name || 'User'}</Text>
          {roleBadge && (
            <View style={[cbStyles.rolePill, { backgroundColor: roleBadge.bg }]}>
              <Text style={[cbStyles.rolePillText, { color: roleBadge.text }]}>{roleBadge.label}</Text>
            </View>
          )}
        </View>
        <Text style={cbStyles.bodyText}>{comment.body}</Text>
        <View style={cbStyles.footer}>
          <Text style={cbStyles.timeText}>{formatDate(comment.created_at, 'en-IN')}</Text>
          {!isReply && onReply && (
            <TouchableOpacity onPress={onReply} style={cbStyles.replyBtn}>
              <Ionicons name="return-down-forward-outline" size={12} color="#1a56db" />
              <Text style={cbStyles.replyBtnText}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {canDelete && (
        <TouchableOpacity style={cbStyles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={13} color="#ef4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const cbStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  replyRow: { marginBottom: 8 },
  avatar: { justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2 },
  avatarText: { fontWeight: '700' },
  bubble: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  authorName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  rolePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rolePillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  bodyText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  timeText: { fontSize: 11, color: '#9ca3af' },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  replyBtnText: { fontSize: 11, fontWeight: '600', color: '#1a56db' },
  deleteBtn: { padding: 6, alignSelf: 'flex-start', marginTop: 2 },
});

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [issue, setIssue] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { id, authorName }
  const [upvoted, setUpvoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [flagModal, setFlagModal] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [id]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const load = async () => {
    try {
      const [issueRes, timelineRes] = await Promise.all([
        issuesApi.get(id),
        issuesApi.getTimeline(id),
      ]);
      const issueData = issueRes.data;
      setIssue(issueData);
      setUpvoted(issueData.user_upvoted ?? false);
      setTimeline(timelineRes.data.items || timelineRes.data);
      navigation.setOptions({ title: issueData.issue_type?.replace('_', ' ') || 'Issue Details' });

      // Comments may be restricted (403) for non-reporters — handle gracefully
      try {
        const commentsRes = await issuesApi.getComments(id);
        setComments(commentsRes.data.items || commentsRes.data);
      } catch {
        setComments([]);
      }
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
      const { data } = await issuesApi.addComment(id, comment.trim(), replyingTo?.id ?? null);
      if (replyingTo) {
        // Append reply under its parent
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyingTo.id
              ? { ...c, replies: [...(c.replies || []), data] }
              : c
          )
        );
      } else {
        setComments((prev) => [...prev, { ...data, replies: [] }]);
      }
      setComment('');
      setReplyingTo(null);
    } catch {}
    setPosting(false);
  };

  const handleFlag = async (reason, details) => {
    try {
      await issuesApi.flag(id, reason, details);
      Alert.alert('Reported', 'Thank you. Our team will review this issue.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit report.');
    }
  };

  const handleReopen = async () => {
    setReopening(true);
    try {
      await issuesApi.reopen(id);
      await load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to reopen issue.');
    }
    setReopening(false);
  };

  const handleDeleteComment = (commentId) => {
    Alert.alert('Delete Comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await issuesApi.deleteComment(id, commentId);
            setComments((prev) => {
              // Remove top-level or remove from replies
              const withoutTop = prev.filter((c) => c.id !== commentId);
              return withoutTop.map((c) => ({
                ...c,
                replies: (c.replies || []).filter((r) => r.id !== commentId),
              }));
            });
          } catch (err) {
            Alert.alert('Error', err.response?.data?.detail || 'Failed to delete comment.');
          }
        },
      },
    ]);
  };

  const handleRate = async (rating) => {
    setRatingSubmitting(true);
    try {
      const { data } = await issuesApi.update(id, { citizen_rating: rating });
      setIssue((prev) => ({ ...prev, citizen_rating: data.citizen_rating ?? rating }));
      setRatingSubmitted(true);

      if (rating === 1) {
        await issuesApi.reopen(id);
        await load();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit rating.');
    }
    setRatingSubmitting(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Civic Issue: ${issue.description}\nStatus: ${issue.status}\nLocation: ${issue.address || issue.ward || 'N/A'}`,
        title: `Civic Issue - ${issue.issue_type?.replace('_', ' ')}`,
      });
    } catch {}
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
  let beforePhoto = issue.before_photos?.[0] ?? null;
  let afterPhoto = issue.after_photos?.[0] ?? null;

  // If photos are relative paths, prepend the base URL
  if (beforePhoto && !beforePhoto.startsWith('http')) {
    beforePhoto = `${BASE_URL}${beforePhoto.startsWith('/') ? '' : '/'}${beforePhoto}`;
  }
  if (afterPhoto && !afterPhoto.startsWith('http')) {
    afterPhoto = `${BASE_URL}${afterPhoto.startsWith('/') ? '' : '/'}${afterPhoto}`;
  }

  const isReporter = user?.id === issue.reporter_id;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a56db" />}
    >
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

        {/* Visual Pipeline */}
        <View style={{ flexDirection: 'row', marginTop: 24, marginBottom: 20, paddingHorizontal: 10 }}>
          {['open', 'assigned', 'in_progress', 'resolved', 'closed'].map((step, index, arr) => {
            const stepLabels = ['Reported', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
            const getStepIndex = (st) => {
              if (st === 'open') return 0;
              if (st === 'assigned') return 1;
              if (st === 'in_progress' || st === 'escalated') return 2;
              if (st === 'resolved') return 3;
              if (st === 'closed') return 4;
              return 0;
            };
            const currentIndex = getStepIndex(issue.status);
            const isCompleted = index <= currentIndex;
            const isActive = index === currentIndex;
            const isLast = index === arr.length - 1;

            return (
              <View key={step} style={{ flexDirection: 'row', alignItems: 'center', flex: isLast ? 0 : 1 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: isCompleted ? '#1a56db' : '#f3f4f6',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: isActive ? 4 : 0, borderColor: '#bfdbfe',
                  }}>
                    {isCompleted && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={{
                    position: 'absolute', top: 32, width: 70, textAlign: 'center', left: -21,
                    fontSize: 10, color: isCompleted ? '#111827' : '#9ca3af',
                    fontWeight: isActive ? '700' : '500'
                  }}>
                    {stepLabels[index]}
                  </Text>
                </View>
                {!isLast && (
                  <View style={{
                    flex: 1, height: 3,
                    backgroundColor: index < currentIndex ? '#1a56db' : '#f3f4f6',
                    marginHorizontal: 4
                  }} />
                )}
              </View>
            );
          })}
        </View>
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
          onPress={() => setFlagModal(true)}
        >
          <Ionicons name="flag-outline" size={18} color="#374151" />
          <Text style={styles.actionText}>Flag</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={18} color="#374151" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        {issue.status === 'resolved' && isReporter && (
          <TouchableOpacity
            style={[styles.actionBtn, reopening && { opacity: 0.5 }]}
            onPress={handleReopen}
            disabled={reopening}
          >
            <Ionicons name="refresh-outline" size={18} color="#374151" />
            <Text style={styles.actionText}>{reopening ? 'Reopening…' : 'Reopen'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlagModal
        visible={flagModal}
        onClose={() => setFlagModal(false)}
        onSubmit={handleFlag}
      />

      {/* After Photo */}
      {afterPhoto && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resolution Photo</Text>
          <Image source={{ uri: afterPhoto }} style={styles.afterPhoto} resizeMode="cover" />
        </View>
      )}

      {/* Citizen Rating — shown for reporter on resolved/closed issues */}
      {isReporter && (issue.status === 'resolved' || issue.status === 'closed') && (
        <View style={styles.section}>
          {issue.citizen_rating ? (
            <View style={styles.thankYouBox}>
              <Ionicons name="checkmark-circle" size={40} color="#059669" />
              <Text style={styles.thankYouTitle}>Thank you for your feedback!</Text>
              <Text style={styles.thankYouSub}>Your rating helps us improve our service</Text>
              <View style={styles.ratingDisplay}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={issue.citizen_rating >= star ? 'star' : 'star-outline'}
                    size={24}
                    color={issue.citizen_rating >= star ? '#f59e0b' : '#d1d5db'}
                  />
                ))}
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Rate Resolution</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => !ratingSubmitting && handleRate(star)}
                    disabled={ratingSubmitting}
                  >
                    <Ionicons
                      name="star-outline"
                      size={32}
                      color="#f59e0b"
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingHint}>Tap a star to rate the resolution</Text>
            </>
          )}
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
                  {formatDateTime(event.at, 'en-IN')}
                </Text>
                {event.note && <Text style={styles.timelineNote}>{event.note}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Comments */}
      <View style={styles.commentSection}>
        {/* Header */}
        <View style={styles.commentHeader}>
          <Ionicons name="chatbubbles-outline" size={16} color="#374151" />
          <Text style={styles.commentHeaderText}>
            {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)} Comments
          </Text>
        </View>

        {/* Comment list */}
        {comments.length === 0 ? (
          <View style={styles.commentEmpty}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color="#d1d5db" />
            <Text style={styles.commentEmptyText}>No comments yet. Be the first!</Text>
          </View>
        ) : (
          comments.map((c) => (
            <View key={c.id} style={styles.commentThread}>
              {/* Top-level comment */}
              <CommentBubble
                comment={c}
                user={user}
                onReply={() => setReplyingTo({ id: c.id, authorName: c.author?.name || 'User' })}
                onDelete={() => handleDeleteComment(c.id)}
              />

              {/* Replies */}
              {(c.replies || []).length > 0 && (
                <View style={styles.repliesContainer}>
                  <View style={styles.replyConnector} />
                  <View style={styles.repliesList}>
                    {(c.replies || []).map((r) => (
                      <CommentBubble
                        key={r.id}
                        comment={r}
                        user={user}
                        isReply
                        onDelete={() => handleDeleteComment(r.id)}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          ))
        )}

        {/* Reply-to indicator */}
        {replyingTo && (
          <View style={styles.replyingToBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="return-down-forward-outline" size={14} color="#1a56db" />
              <Text style={styles.replyingToText}>Replying to {replyingTo.authorName}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={styles.commentInputRow}>
          <View style={styles.commentInputAvatar}>
            <Text style={styles.commentInputAvatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.commentInputBox}>
            <TextInput
              style={styles.commentInput}
              placeholder={replyingTo ? `Reply to ${replyingTo.authorName}…` : 'Write a comment…'}
              placeholderTextColor="#9ca3af"
              value={comment}
              onChangeText={setComment}
              multiline
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[styles.commentSend, (!comment.trim() || posting) && { opacity: 0.4 }]}
              onPress={postComment}
              disabled={!comment.trim() || posting}
            >
              {posting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={15} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
    </KeyboardAvoidingView>
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
  ratingRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  ratingHint: { fontSize: 13, color: '#6b7280', marginTop: 8 },
  timelineItem: { flexDirection: 'row', gap: 12, paddingBottom: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1a56db', marginTop: 4 },
  timelineLine: { position: 'absolute', left: 5, top: 16, width: 2, height: '100%', backgroundColor: '#dbeafe' },
  timelineContent: { flex: 1 },
  timelineEvent: { fontSize: 14, color: '#111827', fontWeight: '600', textTransform: 'capitalize' },
  timelineDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  timelineNote: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  // Comments section
  commentSection: { backgroundColor: '#fff', marginTop: 12, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 8 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  commentHeaderText: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  commentThread: { marginBottom: 4 },
  commentEmpty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  commentEmptyText: { fontSize: 13, color: '#9ca3af' },
  repliesContainer: { flexDirection: 'row', marginLeft: 17, marginTop: 2, marginBottom: 6 },
  replyConnector: { width: 2, backgroundColor: '#e2e8f0', borderRadius: 1, marginRight: 14, marginTop: 4, marginBottom: 4 },
  repliesList: { flex: 1 },
  replyingToBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#1a56db',
  },
  replyingToText: { fontSize: 12, color: '#1a56db', fontWeight: '600' },
  commentInputRow: { flexDirection: 'row', gap: 10, paddingTop: 12, paddingBottom: 12, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 8 },
  commentInputAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginBottom: 2 },
  commentInputAvatarText: { fontSize: 14, fontWeight: '700', color: '#1a56db' },
  commentInputBox: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 20,
    paddingLeft: 14, paddingRight: 6, paddingVertical: 6, backgroundColor: '#f8fafc',
  },
  commentInput: { flex: 1, fontSize: 14, color: '#111827', maxHeight: 100, paddingTop: 4, paddingBottom: 4 },
  commentSend: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1a56db', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  // Flag Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  reasonBtnActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  reasonText: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'capitalize' },
  reasonTextActive: { color: '#1a56db' },
  modalTextArea: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', minHeight: 72, textAlignVertical: 'top' },
  submitBtn: { marginTop: 20, backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  ratingHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
  thankYouBox: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16 },
  thankYouTitle: { fontSize: 16, fontWeight: '700', color: '#059669', marginTop: 12 },
  thankYouSub: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  ratingDisplay: { flexDirection: 'row', gap: 8, marginTop: 16, justifyContent: 'center' },
});
