'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';
import { useUiStore } from '../../../src/store/uiStore';
import LoadingButton from '../../../src/components/ui/LoadingButton';

const APPROVAL_STATUSES = {
  pending: 'bg-warning-soft text-warning',
  approved: 'bg-success-soft text-success',
  rejected: 'bg-danger-soft text-danger',
};

function ApprovalModal({ customType, onClose, onApproved }) {
  const [action, setAction] = useState(''); // 'approve' or 'reject'
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!action) {
      setError('Please select an action');
      return;
    }

    if (action === 'reject' && !reason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (action === 'approve') {
        await adminApi.approveCustomIssueType(customType.id);
        useUiStore.getState().addToast('Custom issue type approved!', 'success');
      } else if (action === 'reject') {
        // Note: Backend doesn't have reject endpoint yet, so we just skip approval
        // In future, add DELETE /admin/custom-issue-types/{id} endpoint
        console.log('Reject reason:', reason);
        throw new Error('Reject functionality not yet implemented on backend');
      }
      onApproved();
      onClose();
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to process');
      setError(errorMsg);
      useUiStore.getState().addToast(errorMsg, 'error');
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!customType) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-ink mb-2">{customType.label}</h3>
        <p className="text-sm text-ink-muted mb-4">Category: <span className="font-medium">{customType.slug}</span></p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-surface-alt p-3 rounded-lg border border-border">
            <p className="text-xs font-semibold text-ink-muted mb-2 uppercase">Suggested by</p>
            {customType.suggested_by ? (
              <p className="text-sm text-ink-muted">User: {customType.suggested_by.slice(0, 8).toUpperCase()}...</p>
            ) : (
              <p className="text-sm text-ink-subtle italic">System</p>
            )}
            <p className="text-xs text-ink-subtle mt-1">Usage: {customType.usage_count} times</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-3 uppercase">Decision</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-surface-alt border border-border">
                <input
                  type="radio"
                  name="action"
                  value="approve"
                  checked={action === 'approve'}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-semibold text-success">Approve</p>
                  <p className="text-xs text-success">Add to standard issue types</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-surface-alt border border-border">
                <input
                  type="radio"
                  name="action"
                  value="reject"
                  checked={action === 'reject'}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-semibold text-danger">Reject</p>
                  <p className="text-xs text-danger">Decline this suggestion</p>
                </div>
              </label>
            </div>
          </div>

          {action === 'reject' && (
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-2 uppercase">Reason (Required)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this type not suitable?..."
                maxLength={500}
                rows={3}
                className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-none"
              />
              <p className="text-xs text-ink-subtle mt-1">{reason.length}/500</p>
            </div>
          )}

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
              loadingText="Processing..."
            >
              Submit
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomIssueTypesPage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedType, setSelectedType] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getCustomIssueTypes({ status: filterStatus });
      const responseData = response.data || response;
      
      // Handle different response structures
      let customTypes = [];
      if (Array.isArray(responseData)) {
        customTypes = responseData;
      } else if (responseData.items && Array.isArray(responseData.items)) {
        customTypes = responseData.items;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        customTypes = responseData.data;
      }
      
      // Map is_approved to status for consistent display
      customTypes = customTypes.map(t => ({
        ...t,
        status: t.is_approved ? 'approved' : 'pending'
      }));
      
      setTypes(customTypes);
      console.log(`Loaded ${customTypes.length} custom types with status: ${filterStatus}`, customTypes);
    } catch (err) {
      console.error('Failed to load custom types:', err);
      setTypes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, [filterStatus]);

  const handleSelectType = (type) => {
    setSelectedType(type);
    setShowModal(true);
  };

  const handleTypeApproved = () => {
    loadTypes();
  };

  return (
    <div className="space-y-4">
      {showModal && selectedType && (
        <ApprovalModal
          customType={selectedType}
          onClose={() => setShowModal(false)}
          onApproved={handleTypeApproved}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 bg-surface rounded-card p-4">
        {['pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
              filterStatus === status
                ? 'bg-primary text-white'
                : 'bg-surface-alt text-ink-muted hover:bg-border'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface rounded-card p-4 animate-pulse">
              <div className="h-5 w-48 bg-border rounded mb-2" />
              <div className="h-4 w-full bg-surface-alt rounded" />
            </div>
          ))}
        </div>
      ) : types.length === 0 ? (
        <div className="bg-surface rounded-card border border-divider p-12 text-center">
          <p className="text-ink-subtle font-medium">No {filterStatus} suggestions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {types.map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelectType(type)}
              className="bg-surface rounded-card border border-divider p-4 hover:shadow-md transition text-left w-full"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-bold text-ink">{type.label}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${APPROVAL_STATUSES[type.status] || 'bg-surface-alt'}`}>
                      {type.status}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mb-2">Category: {type.slug}</p>
                  <p className="text-xs text-ink-subtle flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S15.33 8 14.5 8 13 8.67 13 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S8.33 8 7.5 8 6 8.67 6 9.5 6.67 11 7.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                    </svg>
                    Suggested {type.usage_count} times
                  </p>
                </div>
                {filterStatus === 'pending' && (
                  <div className="text-primary font-semibold text-sm">Review →</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
