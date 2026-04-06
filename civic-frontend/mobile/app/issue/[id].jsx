import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, FlatList, Modal,
  KeyboardAvoidingView, Platform, Share, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { issuesApi } from '../../src/api/issues';
import { workersApi } from '../../src/api/workers';
import { BASE_URL } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { formatDate, formatDateTime } from '../../src/utils/dateUtils';
import { logger } from '../../src/utils/logger';

const STATUS_COLORS = {
  open: { bg: '#fef3c7', text: '#92400e' },
  in_progress: { bg: '#dbeafe', text: '#1e40af' },
  resolved: { bg: '#d1fae5', text: '#065f46' },
  escalated: { bg: '#fee2e2', text: '#991b1b' },
  closed: { bg: '#f3f4f6', text: '#6b7280' },
};

const FLAG_REASONS = ['spam', 'duplicate', 'inappropriate', 'false_report', 'other'];

const COMPLAINT_REASONS = [
  { key: 'rude_behavior', label: 'Rude Behavior' },
  { key: 'poor_work', label: 'Poor Work' },
  { key: 'delayed', label: 'Delayed' },
  { key: 'no_show', label: 'No Show' },
  { key: 'other', label: 'Other' },
];

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

function DisputeModal({ visible, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      Alert.alert('Too Short', 'Please provide at least 10 characters explaining why you dispute this resolution.');
      return;
    }
    setSubmitting(true);
    await onSubmit(reason.trim());
    setSubmitting(false);
    setReason('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dispute Resolution</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
            If you believe this issue was not properly resolved, explain why below. The issue will be reopened for review.
          </Text>
          <TextInput
            style={styles.modalTextArea}
            value={reason}
            onChangeText={setReason}
            placeholder="Why was this not properly resolved? (min 10 chars)"
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: '#f59e0b' }, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>{submitting ? 'Submitting…' : 'Submit Dispute'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function SurveyModal({ visible, onClose, onSubmit }) {
  const [fullyResolved, setFullyResolved] = useState(true);
  const [speedRating, setSpeedRating] = useState(2);
  const [wouldReportAgain, setWouldReportAgain] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const speedLabels = ['Too Slow', 'Acceptable', 'Fast'];

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit({
      fully_resolved: fullyResolved,
      speed_rating: speedRating,
      would_report_again: wouldReportAgain,
      feedback: feedback.trim() || undefined,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Satisfaction Survey</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Was the issue fully resolved?</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.reasonBtn, fullyResolved && styles.reasonBtnActive]}
              onPress={() => setFullyResolved(true)}
            >
              <Text style={[styles.reasonText, fullyResolved && styles.reasonTextActive]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reasonBtn, !fullyResolved && styles.reasonBtnActive]}
              onPress={() => setFullyResolved(false)}
            >
              <Text style={[styles.reasonText, !fullyResolved && styles.reasonTextActive]}>No</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Resolution Speed</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {[1, 2, 3].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.reasonBtn, { flex: 1, alignItems: 'center' }, speedRating === val && styles.reasonBtnActive]}
                onPress={() => setSpeedRating(val)}
              >
                <Text style={[styles.reasonText, speedRating === val && styles.reasonTextActive]}>
                  {speedLabels[val - 1]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.modalLabel}>Would you report issues again?</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.reasonBtn, wouldReportAgain && styles.reasonBtnActive]}
              onPress={() => setWouldReportAgain(true)}
            >
              <Text style={[styles.reasonText, wouldReportAgain && styles.reasonTextActive]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reasonBtn, !wouldReportAgain && styles.reasonBtnActive]}
              onPress={() => setWouldReportAgain(false)}
            >
              <Text style={[styles.reasonText, !wouldReportAgain && styles.reasonTextActive]}>No</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Additional Feedback (optional)</Text>
          <TextInput
            style={styles.modalTextArea}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Any additional feedback..."
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: '#059669' }, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>{submitting ? 'Submitting…' : 'Submit Survey'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ComplaintModal({ visible, onClose, onSubmit, workerId, issueId }) {
  const [reason, setReason] = useState('poor_work');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (description.trim().length < 10) {
      Alert.alert('Too Short', 'Please provide at least 10 characters.');
      return;
    }
    setSubmitting(true);
    await onSubmit({
      worker_id: workerId,
      issue_id: issueId,
      reason,
      description: description.trim(),
    });
    setSubmitting(false);
    setReason('poor_work');
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Worker</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalLabel}>Reason</Text>
          <View style={styles.reasonGrid}>
            {COMPLAINT_REASONS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.reasonBtn, reason === key && styles.reasonBtnActive]}
                onPress={() => setReason(key)}
              >
                <Text style={[styles.reasonText, reason === key && styles.reasonTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.modalLabel}>Description</Text>
          <TextInput
            style={styles.modalTextArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue with this worker... (min 10 chars)"
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>{submitting ? 'Submitting…' : 'Submit Complaint'}</Text>
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
  const { id, action } = useLocalSearchParams();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [issue, setIssue] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [upvoted, setUpvoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [flagModal, setFlagModal] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // New feature states
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [disputeModal, setDisputeModal] = useState(false);
  const [surveyModal, setSurveyModal] = useState(false);
  const [surveyData, setSurveyData] = useState(null);
  const [complaintModal, setComplaintModal] = useState(false);

  useEffect(() => { load(); }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [id]));

  // Handle notification deep links with action_type
  useEffect(() => {
    if (action && issue) {
      if (action === 'dispute') setDisputeModal(true);
      else if (action === 'survey') setSurveyModal(true);
      else if (action === 'complaint') setComplaintModal(true);
      else if (action === 'flag') setFlagModal(true);
    }
  }, [action, issue]);

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

      // Check bookmark status
      try {
        const { data: bookmarks } = await issuesApi.getBookmarks({ page: 1, size: 100 });
        const list = bookmarks.items || bookmarks;
        setBookmarked(list.some((b) => b.issue_id === id));
      } catch { setBookmarked(false); }

      // Check if survey already submitted (for resolved issues)
      if (['resolved', 'closed'].includes(issueData.status)) {
        try {
          const { data: survey } = await issuesApi.getSurvey(id);
          setSurveyData(survey);
        } catch { setSurveyData(null); }
      }

      // Comments
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

  const handleBookmark = async () => {
    setBookmarkLoading(true);
    try {
      if (bookmarked) {
        await issuesApi.removeBookmark(id);
        setBookmarked(false);
      } else {
        await issuesApi.bookmark(id);
        setBookmarked(true);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update bookmark');
    }
    setBookmarkLoading(false);
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const { data } = await issuesApi.addComment(id, comment.trim(), replyingTo?.id ?? null);
      if (replyingTo) {
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

  const handleDispute = async (reason) => {
    try {
      await issuesApi.createDispute(id, reason);
      Alert.alert('Dispute Filed', 'Your dispute has been submitted. The issue will be reopened for review.');
      await load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to file dispute.');
    }
  };

  const handleSurvey = async (data) => {
    try {
      const { data: survey } = await issuesApi.submitSurvey(id, data);
      setSurveyData(survey);
      Alert.alert('Thank You!', 'Your feedback helps us improve.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit survey.');
    }
  };

  const handleComplaint = async (data) => {
    try {
      await workersApi.fileComplaint(data);
      Alert.alert('Complaint Filed', 'Your complaint has been submitted for admin review.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to file complaint.');
    }
  };

  const handleDeleteComment = (commentId) => {
    Alert.alert('Delete Comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await issuesApi.deleteComment(id, commentId);
            setComments((prev) => {
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

  if (beforePhoto && !beforePhoto.startsWith('http')) {
    beforePhoto = `${BASE_URL}${beforePhoto.startsWith('/') ? '' : '/'}${beforePhoto}`;
  }
  if (afterPhoto && !afterPhoto.startsWith('http')) {
    afterPhoto = `${BASE_URL}${afterPhoto.startsWith('/') ? '' : '/'}${afterPhoto}`;
  }

  const isReporter = user?.id === issue.reporter_id;
  const isResolved = issue.status === 'resolved' || issue.status === 'closed';
  const hasWorker = !!issue.assigned_worker_id;

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
          {issue.custom_issue_type_label && (
            <View style={[styles.typeChip, { backgroundColor: '#ede9fe' }]}>
              <Text style={[styles.typeText, { color: '#7c3aed' }]}>{issue.custom_issue_type_label}</Text>
            </View>
          )}
          <View style={[styles.priorityChip, { backgroundColor: issue.priority === 'high' || issue.priority === 'critical' ? '#fee2e2' : '#f3f4f6' }]}>
            <Text style={{ fontSize: 12, color: issue.priority === 'high' || issue.priority === 'critical' ? '#991b1b' : '#6b7280', fontWeight: '600' }}>
              {issue.priority}
            </Text>
          </View>
          {issue.escalation_level > 0 && (
            <View style={[styles.priorityChip, { backgroundColor: '#fee2e2' }]}>
              <Text style={{ fontSize: 11, color: '#991b1b', fontWeight: '700' }}>
                Escalation L{issue.escalation_level}
              </Text>
            </View>
          )}
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
            {issue.upvote_count || 0}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, bookmarked && styles.actionBtnActive]}
          onPress={handleBookmark}
          disabled={bookmarkLoading}
        >
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={bookmarked ? '#1a56db' : '#374151'}
          />
          <Text style={[styles.actionText, bookmarked && styles.actionTextActive]}>
            {bookmarked ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setFlagModal(true)}>
          <Ionicons name="flag-outline" size={18} color="#374151" />
          <Text style={styles.actionText}>Flag</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={18} color="#374151" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Reporter actions for resolved issues */}
      {isReporter && isResolved && (
        <View style={styles.resolvedActionsRow}>
          {issue.status === 'resolved' && (
            <TouchableOpacity
              style={[styles.resolvedActionBtn, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}
              onPress={() => setDisputeModal(true)}
            >
              <Ionicons name="alert-circle-outline" size={16} color="#92400e" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>Dispute</Text>
            </TouchableOpacity>
          )}
          {!surveyData && (
            <TouchableOpacity
              style={[styles.resolvedActionBtn, { backgroundColor: '#d1fae5', borderColor: '#059669' }]}
              onPress={() => setSurveyModal(true)}
            >
              <Ionicons name="clipboard-outline" size={16} color="#065f46" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#065f46' }}>Survey</Text>
            </TouchableOpacity>
          )}
          {hasWorker && (
            <TouchableOpacity
              style={[styles.resolvedActionBtn, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]}
              onPress={() => setComplaintModal(true)}
            >
              <Ionicons name="person-remove-outline" size={16} color="#991b1b" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#991b1b' }}>Report Worker</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.resolvedActionBtn, { backgroundColor: '#dbeafe', borderColor: '#1a56db' }, reopening && { opacity: 0.5 }]}
            onPress={handleReopen}
            disabled={reopening}
          >
            <Ionicons name="refresh-outline" size={16} color="#1e40af" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e40af' }}>{reopening ? 'Reopening…' : 'Reopen'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Worker complaint button for non-reporter citizens too (when worker is assigned) */}
      {!isReporter && hasWorker && user?.role === 'citizen' && isResolved && (
        <View style={styles.resolvedActionsRow}>
          <TouchableOpacity
            style={[styles.resolvedActionBtn, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]}
            onPress={() => setComplaintModal(true)}
          >
            <Ionicons name="person-remove-outline" size={16} color="#991b1b" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#991b1b' }}>Report Worker</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      <FlagModal visible={flagModal} onClose={() => setFlagModal(false)} onSubmit={handleFlag} />
      <DisputeModal visible={disputeModal} onClose={() => setDisputeModal(false)} onSubmit={handleDispute} />
      <SurveyModal visible={surveyModal} onClose={() => setSurveyModal(false)} onSubmit={handleSurvey} />
      {hasWorker && (
        <ComplaintModal
          visible={complaintModal}
          onClose={() => setComplaintModal(false)}
          onSubmit={handleComplaint}
          workerId={issue.assigned_worker_id}
          issueId={id}
        />
      )}

      {/* Survey submitted indicator */}
      {surveyData && (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.sectionTitle}>Survey Submitted</Text>
          </View>
          <Text style={{ fontSize: 13, color: '#6b7280' }}>
            Resolved: {surveyData.fully_resolved ? 'Yes' : 'No'} · Speed: {['Too Slow', 'Acceptable', 'Fast'][surveyData.speed_rating - 1]} · Would report again: {surveyData.would_report_again ? 'Yes' : 'No'}
          </Text>
          {surveyData.feedback && <Text style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>{surveyData.feedback}</Text>}
        </View>
      )}

      {/* After Photo */}
      {afterPhoto && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resolution Photo</Text>
          <Image source={{ uri: afterPhoto }} style={styles.afterPhoto} resizeMode="cover" />
        </View>
      )}

      {/* Citizen Rating */}
      {isReporter && isResolved && (
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
                    <Ionicons name="star-outline" size={32} color="#f59e0b" />
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
                <Text style={styles.timelineDate}>{formatDateTime(event.at, 'en-IN')}</Text>
                {event.note && <Text style={styles.timelineNote}>{event.note}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Comments */}
      <View style={styles.commentSection}>
        <View style={styles.commentHeader}>
          <Ionicons name="chatbubbles-outline" size={16} color="#374151" />
          <Text style={styles.commentHeaderText}>
            {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)} Comments
          </Text>
        </View>

        {comments.length === 0 ? (
          <View style={styles.commentEmpty}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color="#d1d5db" />
            <Text style={styles.commentEmptyText}>No comments yet. Be the first!</Text>
          </View>
        ) : (
          comments.map((c) => (
            <View key={c.id} style={styles.commentThread}>
              <CommentBubble
                comment={c}
                user={user}
                onReply={() => setReplyingTo({ id: c.id, authorName: c.author?.name || 'User' })}
                onDelete={() => handleDeleteComment(c.id)}
              />
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
  resolvedActionsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10,
  },
  resolvedActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1,
  },
  section: { backgroundColor: '#fff', marginTop: 12, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  afterPhoto: { width: '100%', height: 180, borderRadius: 8 },
  ratingRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  ratingHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
  timelineItem: { flexDirection: 'row', gap: 12, paddingBottom: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1a56db', marginTop: 4 },
  timelineLine: { position: 'absolute', left: 5, top: 16, width: 2, height: '100%', backgroundColor: '#dbeafe' },
  timelineContent: { flex: 1 },
  timelineEvent: { fontSize: 14, color: '#111827', fontWeight: '600', textTransform: 'capitalize' },
  timelineDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  timelineNote: { fontSize: 13, color: '#6b7280', marginTop: 4 },
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
  // Modal styles
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
  thankYouBox: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16 },
  thankYouTitle: { fontSize: 16, fontWeight: '700', color: '#059669', marginTop: 12 },
  thankYouSub: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  ratingDisplay: { flexDirection: 'row', gap: 8, marginTop: 16, justifyContent: 'center' },
});
