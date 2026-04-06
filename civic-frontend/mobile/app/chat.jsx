import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { workersApi } from '../src/api';

const COLORS = {
  primary: '#006AFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
};

const BUBBLE_COLORS = {
  user: { bg: '#006AFF', text: '#FFFFFF' },
  assistant: { bg: '#F3F4F6', text: '#111827' },
};

export default function ChatScreen() {
  const router = useRouter();
  const { issueId } = useLocalSearchParams();
  
  const [messages, setMessages] = useState([
    {
      id: '0',
      type: 'assistant',
      text: 'Hello! How can I help you today? I can answer questions in English, Hindi, or Gujarati.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollViewRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await workersApi.chat(input, issueId || undefined);
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: response.data?.message || response.message || 'I couldn\'t generate a response. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  }, [input, issueId]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat Assistant</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.type === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  {
                    color:
                      msg.type === 'user'
                        ? BUBBLE_COLORS.user.text
                        : BUBBLE_COLORS.assistant.text,
                  },
                ]}
              >
                {msg.text}
              </Text>
              <Text
                style={[
                  styles.bubbleTime,
                  msg.type === 'user'
                    ? { color: 'rgba(255,255,255,0.6)' }
                    : { color: `${COLORS.gray600}80` },
                ]}
              >
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.typingText}>Assistant is typing...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBubble}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                onPress={() => {
                  setError('');
                  setLoading(false);
                }}
                style={styles.dismissErrorButton}
              >
                <Text style={styles.dismissErrorText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything..."
            placeholderTextColor={COLORS.gray600}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!input.trim() || loading}
            style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>

        {/* Features Info */}
        <View style={styles.infoBar}>
          <Text style={styles.infoText}>Supports: English, Hindi, Gujarati</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  backButton: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  bubbleTime: {
    fontSize: 11,
  },
  loadingBubble: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    maxWidth: '85%',
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 14,
    color: COLORS.gray600,
    fontStyle: 'italic',
  },
  errorBubble: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    maxWidth: '85%',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 8,
  },
  dismissErrorButton: {
    paddingVertical: 4,
  },
  dismissErrorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 120,
    color: COLORS.gray900,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  infoBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.gray50,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.gray600,
    textAlign: 'center',
  },
});
