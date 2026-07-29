'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';
import { useUiStore } from '../../../src/store/uiStore';
import { formatDate } from '../../../src/lib/dateUtils';
import LoadingButton from '../../../src/components/ui/LoadingButton';

const STATUS_COLORS = {
  open: 'bg-danger-soft text-danger',
  under_review: 'bg-warning-soft text-warning',
  accepted: 'bg-success-soft text-success',
  rejected: 'bg-surface-alt text-ink-muted',
};

const STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under Review',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

// ── Detail Modal ───────────────────────────────────────────────────────────────
function DisputeDetailModal({ dispute, onClose, onResolved }) {
  const { addToast } = useUiStore();
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!outcome) {
      setError('Please select an outcome');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await adminApi.resolveDispute(dispute.id, outcome, notes);
      addToast('Dispute resolved successfully!', 'success');
      onResolved();
      onClose();
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to resolve dispute');
      setError(errorMsg);
      addToast(errorMsg, 'error');
      console.error('Error resolving dispute:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!dispute) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Dispute Details</h2>
              <p className="text-white/75">ID: {String(dispute.id).slice(0, 8)}</p>
            </div>
            <button
              onClick={onClose}
              className="text-2xl font-light hover:opacity-80 transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" /></svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-ink-muted">Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${STATUS_COLORS[dispute.status] || 'bg-surface-alt'}`}>
              {STATUS_LABELS[dispute.status] || dispute.status}
            </span>
            <span className="text-xs text-ink-subtle ml-auto">Filed {formatDate(dispute.created_at, 'en-IN')}</span>
          </div>

          {/* Issue Context */}
          <div className="bg-primary-soft p-4 rounded-xl border border-primary/20">
            <p className="text-xs text-ink-subtle mb-1 uppercase font-semibold">Related Issue</p>
            <p className="text-sm text-primary-strong font-semibold">Issue ID: {String(dispute.issue_id).slice(0, 12)}...</p>
          </div>

          {/* Dispute Reason */}
          <div>
            <p className="text-xs font-semibold text-ink-muted mb-2 uppercase">Dispute Reason</p>
            <div className="bg-surface-alt p-4 rounded-lg border border-border">
              <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">{dispute.reason}</p>
            </div>
          </div>

          {/* Photos */}
          {dispute.photos && dispute.photos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-muted mb-3 uppercase">Supporting Photos ({dispute.photos.length})</p>
              <div className="grid grid-cols-2 gap-3">
                {dispute.photos.map((photo, idx) => (
                  <a
                    key={idx}
                    href={photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden border border-border hover:shadow-md transition"
                  >
                    <img
                      src={photo}
                      alt={`Dispute photo ${idx + 1}`}
                      className="w-full h-40 object-cover hover:scale-105 transition"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Admin Notes */}
          {dispute.admin_notes && (
            <div>
              <p className="text-xs font-semibold text-ink-muted mb-2 uppercase">Previous Admin Notes</p>
              <div className="bg-surface-alt p-3 rounded-lg border border-border">
                <p className="text-sm text-ink-muted">{dispute.admin_notes}</p>
              </div>
            </div>
          )}

          {/* Decision Form (only if not resolved) */}
          {dispute.status !== 'accepted' && dispute.status !== 'rejected' && (
            <form onSubmit={handleSubmit} className="space-y-4 bg-primary-soft p-4 rounded-xl border border-primary/20">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-3 uppercase">Resolution Decision</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-primary-soft transition">
                    <input
                      type="radio"
                      name="outcome"
                      value="accepted"
                      checked={outcome === 'accepted'}
                      onChange={(e) => setOutcome(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-semibold text-success">Accept Dispute</p>
                      <p className="text-xs text-success">Issue will remain open for reassignment</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-primary-soft transition">
                    <input
                      type="radio"
                      name="outcome"
                      value="rejected"
                      checked={outcome === 'rejected'}
                      onChange={(e) => setOutcome(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-semibold text-ink-muted">Reject Dispute</p>
                      <p className="text-xs text-ink-muted">Issue resolution will be confirmed as valid</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-2 uppercase">Admin Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Explain your decision to the citizen..."
                  maxLength={2000}
                  rows={4}
                  className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                />
                <p className="text-xs text-ink-subtle mt-1">{notes.length}/2000</p>
              </div>

              {error && <p className="text-sm text-danger bg-danger-soft px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-border-strong rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt transition"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={isSubmitting}
                  variant="primary"
                  className="flex-1"
                  loadingText="Submitting..."
                >
                  Submit Decision
                </LoadingButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('open');
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0 });

  const loadDisputes = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await adminApi.getDisputes({
        status: filterStatus || undefined,
        page,
        size: pagination.size,
      });
      
      // Debug logging
      console.log('Disputes API Response:', data);
      
      // Handle response structure
      let disputesList = [];
      let totalCount = 0;
      
      if (Array.isArray(data)) {
        disputesList = data;
        totalCount = data.length;
      } else if (data && typeof data === 'object') {
        disputesList = data.items || [];
        totalCount = data.total || 0;
      }
      
      setDisputes(disputesList);
      if (totalCount !== undefined) {
        setPagination((p) => ({ ...p, page, total: totalCount }));
      }
    } catch (err) {
      console.error('Failed to load disputes:', err);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes(1);
  }, [filterStatus]);

  const handleSelectDispute = (dispute) => {
    setSelectedDispute(dispute);
    setShowDetails(true);
  };

  const handleDisputeResolved = () => {
    loadDisputes(pagination.page);
  };

  const totalPages = Math.ceil(pagination.total / pagination.size);

  return (
    <div className="space-y-4">
      {showDetails && selectedDispute && (
        <DisputeDetailModal
          dispute={selectedDispute}
          onClose={() => setShowDetails(false)}
          onResolved={handleDisputeResolved}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 bg-surface rounded-card p-4">
        {['open', 'under_review', 'accepted', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status === filterStatus ? '' : status)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
              filterStatus === status
                ? 'bg-primary text-white'
                : 'bg-surface-alt text-ink-muted hover:bg-border'
            }`}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
        <button
          onClick={() => setFilterStatus('')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ml-auto ${
            filterStatus === ''
              ? 'bg-primary text-white'
              : 'bg-surface-alt text-ink-muted hover:bg-border'
          }`}
        >
          All
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface rounded-card border border-divider p-4 animate-pulse">
              <div className="h-5 w-48 bg-border rounded mb-3" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-surface-alt rounded" />
                <div className="h-4 w-3/4 bg-surface-alt rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-surface rounded-card border border-divider p-12 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-12 h-12 text-ink-subtle mx-auto mb-3"
          >
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-1-5h2v2h-2v-2zm0-8h2v6h-2V7z" />
          </svg>
          <p className="text-ink-subtle font-medium">No disputes found</p>
          <p className="text-sm text-ink-subtle mt-1">All disputes have been resolved or there are no pending disputes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => (
            <button
              key={dispute.id}
              onClick={() => handleSelectDispute(dispute)}
              className="bg-surface rounded-card border border-divider p-4 hover:shadow-md hover:border-border transition text-left w-full"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[dispute.status]}`}>
                      {STATUS_LABELS[dispute.status]}
                    </span>
                    <span className="text-xs text-ink-subtle">ID: {String(dispute.id).slice(0, 8)}</span>
                  </div>
                  <p className="text-sm font-semibold text-ink line-clamp-2">
                    {dispute.reason.length > 100 ? dispute.reason.substring(0, 100) + '...' : dispute.reason}
                  </p>
                  <p className="text-xs text-ink-subtle mt-2">
                    Issue: {String(dispute.issue_id).slice(0, 12)}... • {formatDate(dispute.created_at, 'en-IN')}
                  </p>
                  {dispute.photos && dispute.photos.length > 0 && (
                    <p className="text-xs text-primary font-medium mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg> {dispute.photos.length} photo{dispute.photos.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="w-5 h-5 text-ink-subtle"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => loadDisputes(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-surface-alt disabled:opacity-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-ink-muted">
            Page {pagination.page} of {totalPages}
          </span>
          <button
            onClick={() => loadDisputes(pagination.page + 1)}
            disabled={pagination.page === totalPages}
            className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-surface-alt disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
