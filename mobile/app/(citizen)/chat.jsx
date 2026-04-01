import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { chatApi } from '../../src/api/chat';
import { issuesApi } from '../../src/api/issues';
import { useAuthStore } from '../../src/store/authStore';

// Pre-defined suggestion chips shown before any conversation starts
const BASE_SUGGESTIONS = [
  { id: 's1', label: 'Issues near me', prompt: 'Show me open issues near my current location' },
  { id: 's2', label: 'Ward health', prompt: 'What is the health status of my ward?' },
  { id: 's3', label: 'My reports', prompt: 'Summarize the issues I have reported' },
  { id: 's4', label: 'Issue statuses', prompt: 'Explain what all the issue statuses mean' },
  { id: 's5', label: 'How to report', prompt: 'How do I report a civic issue?' },
];

const ISSUE_SUGGESTIONS = (issue) => [
  { id: 'i1', label: 'Issue summary', prompt: `Summarize issue #${issue.id?.slice(0, 8)}: ${issue.description?.slice(0, 40)}` },
  { id: 'i2', label: 'Timeline', prompt: `What is the current status and timeline of this issue?` },
  { id: 'i3', label: 'Similar nearby', prompt: `Are there similar ${issue.issue_type?.replace('_', ' ')} issues nearby?` },
  { id: 'i4', label: 'Who to contact', prompt: `Who should I contact about this ${issue.issue_type?.replace('_', ' ')} issue?` },
];

// Render a single message bubble — handles plain text and embedded issue cards
function MessageBubble({ item, router }) {
  const isUser = item.role === 'user';

  if (isUser) {
    return (
      <View style={[styles.bubble, styles.userBubble]}>
        <Text style={[styles.bubbleText, styles.userText]}>{item.text}</Text>
      </View>
    );
  }

  // AI response: check if it contains embedded issue list
  return (
    <View style={[styles.bubble, styles.aiBubble]}>
      <Text style={[styles.bubbleText, styles.aiText]}>{item.text}</Text>
      {item.issues && item.issues.length > 0 && (
        <View style={styles.issueCardList}>
          {item.issues.slice(0, 4).map((issue) => (
            <TouchableOpacity
              key={issue.id}
              style={styles.issueCard}
              onPress={() => router.push(`/issue/${issue.id}`)}
            >
              <View style={styles.issueCardHeader}>
                <Text style={styles.issueCardType}>
                  {issue.issue_type?.replace('_', ' ')}
                </Text>
                <View style={[styles.issueStatusBadge, { backgroundColor: STATUS_BG[issue.status] || '#f3f4f6' }]}>
                  <Text style={[styles.issueStatusText, { color: STATUS_COLOR[issue.status] || '#374151' }]}>
                    {issue.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.issueCardDesc} numberOfLines={2}>
                {issue.description}
              </Text>
              <Text style={styles.issueCardLink}>Tap to view →</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const STATUS_BG = { open: '#fee2e2', in_progress: '#fef3c7', resolved: '#d1fae5', escalated: '#ede9fe' };
const STATUS_COLOR = { open: '#dc2626', in_progress: '#d97706', resolved: '#059669', escalated: '#7c3aed' };

export default function ChatScreen() {
  const { issue_id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState(BASE_SUGGESTIONS);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextIssue, setContextIssue] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const listRef = useRef(null);
  const hasStarted = messages.length > 0;

  // Load issue context if chat was opened from an issue detail screen
  useEffect(() => {
    if (!issue_id) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        text: `Hi${user?.name ? ` ${user.name}` : ''}! I'm your Civic AI assistant. I can help you with civic issues, ward health, reporting problems, and more.\n\nSelect a suggestion below or type your question.`,
      }]);
      return;
    }

    setLoadingContext(true);
    issuesApi.get(issue_id)
      .then(({ data }) => {
        setContextIssue(data);
        setSuggestions(ISSUE_SUGGESTIONS(data));
        setMessages([{
          id: 'context-welcome',
          role: 'assistant',
          text: `I can see you're asking about the "${data.issue_type?.replace('_', ' ')}" issue: "${data.description?.slice(0, 80)}${data.description?.length > 80 ? '…' : ''}"\n\nStatus: ${data.status} · Priority: ${data.priority}\n\nWhat would you like to know?`,
        }]);
      })
      .catch(() => {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          text: `Hi! I'm your Civic AI assistant. Ask me anything about this issue or civic services.`,
        }]);
      })
      .finally(() => setLoadingContext(false));
  }, [issue_id]);

  const send = useCallback(async (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await chatApi.send(text, issue_id || null);
      const reply = data.reply || data.message || 'I could not find an answer to that.';

      // Parse embedded issues from structured response if backend includes them
      const issues = data.issues || data.context?.issues || null;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: reply,
          issues: Array.isArray(issues) ? issues : null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: 'Sorry, I could not process that. Please check your connection and try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, issue_id]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Context issue banner */}
      {contextIssue && (
        <View style={styles.contextBanner}>
          <Ionicons name="information-circle" size={16} color="#1a56db" />
          <Text style={styles.contextBannerText} numberOfLines={1}>
            Context: {contextIssue.issue_type?.replace('_', ' ')} · {contextIssue.status}
          </Text>
        </View>
      )}

      {loadingContext ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#1a56db" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble item={item} router={router} />}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            !hasStarted || messages.length <= 1 ? (
              <View style={styles.chipsWrap}>
                <Text style={styles.chipsLabel}>Suggested questions</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {suggestions.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.chip}
                      onPress={() => send(s.prompt)}
                      disabled={loading}
                    >
                      <Text style={styles.chipText}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null
          }
        />
      )}

      {loading && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color="#1a56db" />
          <Text style={styles.typingText}>Civic AI is typing…</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask anything about civic issues…"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => send()}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send()}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  contextBannerText: { fontSize: 13, color: '#1e40af', flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 4 },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#1a56db', borderBottomRightRadius: 4 },
  aiBubble: {
    alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  userText: { color: '#fff' },
  aiText: { color: '#111827' },

  // Inline issue cards inside AI reply
  issueCardList: { marginTop: 10, gap: 8 },
  issueCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  issueCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  issueCardType: { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'capitalize' },
  issueStatusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  issueStatusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  issueCardDesc: { fontSize: 13, color: '#4b5563', lineHeight: 18 },
  issueCardLink: { fontSize: 12, color: '#1a56db', marginTop: 4, fontWeight: '600' },

  // Suggestion chips
  chipsWrap: { marginTop: 16, paddingHorizontal: 4 },
  chipsLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 8, marginLeft: 4 },
  chipsRow: { gap: 8, paddingBottom: 4 },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: '#dbeafe',
  },
  chipText: { fontSize: 13, color: '#1a56db', fontWeight: '600' },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  typingText: { fontSize: 12, color: '#9ca3af' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 100, borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#111827',
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a56db', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#93c5fd' },
});
