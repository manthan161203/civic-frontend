'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';
import { useUiStore } from '../../../src/store/uiStore';
import { useAuthStore } from '../../../src/store/authStore';
import { formatDate, formatDateTime } from '../../../src/lib/dateUtils';
import LoadingButton from '../../../src/components/ui/LoadingButton';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

const MESSAGE_TYPES = {
  general: { label: 'General', color: 'bg-surface-alt text-ink-muted' },
  issue: { label: 'Issue', color: 'bg-primary-soft text-primary-strong' },
  worker: { label: 'Worker', color: 'bg-success-soft text-success' },
  incident: { label: 'Incident', color: 'bg-warning-soft text-warning' },
  escalation: { label: 'Escalation', color: 'bg-danger-soft text-danger' },
};

const URGENCY_TYPES = {
  normal: { label: 'Normal', color: 'bg-primary-soft text-primary' },
  urgent: { label: 'Urgent', color: 'bg-warning-soft text-warning' },
  critical: { label: 'Critical', color: 'bg-danger-soft text-danger' },
};

// Send Message Modal
function SendMessageModal({ onClose, onSent }) {
  const { addToast } = useUiStore();
  const [form, setForm] = useState({
    receiver_id: '',
    subject: '',
    body: '',
    message_type: 'general',
    is_urgent: 'normal',
  });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch list of admins
  useEffect(() => {
    adminApi.getAdmins({ page: 1, size: 100 })
      .then(res => {
        const adminList = res.data?.items || res.data || [];
        setAdmins(adminList);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load admin list');
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.receiver_id || !form.subject.trim() || !form.body.trim()) {
      setError('Please fill all required fields');
      return;
    }

    setError('');
    setSaving(true);

    try {
      await adminApi.sendMessage(form);
      addToast('Message sent successfully', 'success');
      onSent?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="w-full max-w-md rounded-card bg-surface p-6 shadow-lg">
          {/* Shaped like the message it is about to show, so the panel does not
              jump size the moment the data lands. */}
          <SkeletonText lines={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-lg w-full max-w-md my-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-lg font-bold text-ink">New Message</h2>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {error && <div className="p-4 bg-danger-soft text-danger text-sm border-b border-danger/30">{error}</div>}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1 uppercase">Recipient</label>
            <select value={form.receiver_id} onChange={(e) => setForm({ ...form, receiver_id: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary">
              <option value="">Select recipient</option>
              {admins.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1 uppercase">Type</label>
              <select value={form.message_type} onChange={(e) => setForm({ ...form, message_type: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary">
                {Object.entries(MESSAGE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1 uppercase">Priority</label>
              <select value={form.is_urgent} onChange={(e) => setForm({ ...form, is_urgent: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary">
                {Object.entries(URGENCY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1 uppercase">Subject</label>
            <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={255} className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Message subject" />
            <p className="text-xs text-ink-subtle mt-1">{form.subject.length}/255</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1 uppercase">Message</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={5000} className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-none h-24" placeholder="Write your message..."></textarea>
            <p className="text-xs text-ink-subtle mt-1">{form.body.length}/5000</p>
          </div>

          <div className="flex gap-2 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-medium text-ink-muted hover:bg-surface-alt">Cancel</button>
            <LoadingButton type="submit" loading={saving} className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover">Send</LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// Message Detail Modal
function MessageDetailModal({ messageId, currentUserId, onClose, onReply }) {
  const { addToast } = useUiStore();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getMessage(messageId)
      .then(res => {
        setMessage(res.data);
        setLoading(false);
      })
      .catch(err => {
        addToast(getErrorMessage(err), 'error');
        setLoading(false);
      });
  }, [messageId, addToast]);

  if (loading) {
    return null;
  }

  if (!message) {
    return null;
  }

  const isReceiver = message.to?.id === currentUserId;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-surface rounded-lg shadow-lg w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start p-6 border-b border-border">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-ink">{message.subject}</h2>
            <div className="flex gap-2 mt-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${MESSAGE_TYPES[message.message_type]?.color}`}>{MESSAGE_TYPES[message.message_type]?.label}</span>
              {message.is_urgent !== 'normal' && <span className={`px-2 py-1 rounded text-xs font-medium ${URGENCY_TYPES[message.is_urgent]?.color}`}>{URGENCY_TYPES[message.is_urgent]?.label}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="p-6 border-b border-border bg-surface-alt">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-ink-subtle uppercase">From</p>
              <p className="font-medium text-ink">{message.from?.name}</p>
            </div>
            <div>
              <p className="text-xs text-ink-subtle uppercase">To</p>
              <p className="font-medium text-ink">{message.to?.name}</p>
            </div>
            <div>
              <p className="text-xs text-ink-subtle uppercase">Date</p>
              <p className="font-medium text-ink">{formatDateTime(message.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 max-h-64 overflow-y-auto">
          <p className="text-sm text-ink-muted whitespace-pre-wrap">{message.body}</p>
        </div>

        <div className="p-6 border-t border-border flex gap-2">
          {isReceiver && <button onClick={() => { onReply?.(message.from?.id); onClose(); }} className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover">Reply</button>}
          <button onClick={onClose} className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-medium text-ink-muted hover:bg-surface-alt">Close</button>
        </div>
      </div>
    </div>
  );
}

// Main Page
export default function AdminMessagesPage() {
  const { user: currentUser } = useAuthStore();
  const { addToast } = useUiStore();
  const [tab, setTab] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadMessages = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = tab === 'inbox' ? await adminApi.getInbox(false, page, 20) : await adminApi.getSentMessages(page, 20);
      setMessages(res.data?.messages || res.data?.items || []);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, page, currentUser, addToast]);

  const loadUnreadCount = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await adminApi.getUnreadCount();
      setUnreadCount(res.data?.unread_count || 0);
    } catch (err) {
      // Silently fail — unread count is non-critical
    }
  }, [currentUser]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  const TABS = [
    { id: 'inbox', label: unreadCount > 0 ? `Inbox (${unreadCount})` : 'Inbox' },
    { id: 'sent', label: 'Sent' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-ink">Messages</h1>
          <p className="text-sm text-ink-subtle mt-0.5">Send and receive messages with other admins</p>
        </div>
        <button onClick={() => setShowSendModal(true)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors">
          New Message
        </button>
      </div>

      <div className="flex gap-1 bg-surface-alt p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setPage(1); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              tab === t.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-subtle hover:text-ink-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-card border border-divider overflow-hidden">
        {loading ? (
          <div className="divide-y divide-divider">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="space-y-2 p-4">
                <Skeleton height={13} width={`${45 + ((i * 11) % 30)}%`} />
                <Skeleton height={11} width="85%" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            size="sm"
            icon="bell"
            title="No messages"
            description="Messages from other admins in your jurisdiction appear here."
          />
        ) : (
          <div className="divide-y divide-divider">
            {messages.map(msg => (
              <div key={msg.id} onClick={() => setSelectedMessage(msg.id)} className="p-4 hover:bg-surface-alt cursor-pointer transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm text-ink ${!msg.is_read && tab === 'inbox' ? 'font-semibold' : 'font-medium'}`}>
                      {tab === 'inbox' ? msg.from : msg.to}
                    </p>
                    {tab === 'inbox' && !msg.is_read && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>}
                  </div>
                  <p className="text-xs text-ink-subtle flex-shrink-0">{formatDate(tab === 'inbox' ? msg.received_at : msg.sent_at)}</p>
                </div>
                <p className="text-sm text-ink-muted mb-1">{msg.subject}</p>
                <p className="text-xs text-ink-subtle line-clamp-1">{msg.preview}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${MESSAGE_TYPES[msg.message_type]?.color}`}>{MESSAGE_TYPES[msg.message_type]?.label}</span>
                  {msg.is_urgent !== 'normal' && <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${URGENCY_TYPES[msg.is_urgent]?.color}`}>{URGENCY_TYPES[msg.is_urgent]?.label}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSendModal && <SendMessageModal onClose={() => setShowSendModal(false)} onSent={() => loadMessages()} />}
      {selectedMessage && <MessageDetailModal messageId={selectedMessage} currentUserId={currentUser?.id} onClose={() => setSelectedMessage(null)} onReply={() => setShowSendModal(true)} />}
    </div>
  );
}
