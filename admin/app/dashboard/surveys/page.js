'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';

const SPEED_LABELS = { 1: 'Slow', 2: 'Average', 3: 'Fast' };
const SPEED_COLORS = { 1: '#ef4444', 2: '#f59e0b', 3: '#22c55e' };

// SVG Icons
const IconLocation = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconDoc = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>;
const IconPerson = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconCalendar = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconCamera = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const IconCheckCircle = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconForm = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><line x1="6" y1="6" x2="18" y2="6"/><line x1="6" y1="10" x2="18" y2="10"/><line x1="6" y1="14" x2="10" y2="14"/></svg>;

// Issue Detail Modal
function IssueDetailModal({ issueId, onClose }) {
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Blocked task modals
  const [blockedIssueForUnblock, setBlockedIssueForUnblock] = useState(null);
  const [blockedIssueForRespond, setBlockedIssueForRespond] = useState(null);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [unblockNotes, setUnblockNotes] = useState('');
  const [respondMessage, setRespondMessage] = useState('');
  const [respondResources, setRespondResources] = useState('');
  const [respondCanProceed, setRespondCanProceed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!issueId) return;
    setLoading(true);
    setError('');
    adminApi.getIssues({ search: issueId })
      .then(({ data }) => {
        const issues = Array.isArray(data) ? data : (data.items || []);
        const found = issues.find(i => i.id === issueId || String(i.id).includes(issueId));
        if (found) setIssue(found);
        else setError('Issue not found');
      })
      .catch(err => setError(getErrorMessage(err, 'Failed to load issue')))
      .finally(() => setLoading(false));
  }, [issueId]);

  if (!issueId) return null;

  const getPriorityColor = (level) => {
    if (!level) return 'bg-gray-100 text-gray-700';
    return level === 'high' ? 'bg-red-100 text-red-700' :
           level === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
  };

  const getDaysOpen = (createdAt) => {
    if (!createdAt) return 0;
    return Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
  };

  const handleUnblock = async () => {
    if (!blockedIssueForUnblock || !unblockNotes.trim()) {
      setError('Please provide a reason for unblocking');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.unblockTask(blockedIssueForUnblock.id, unblockNotes.trim());
      setShowUnblockModal(false);
      setUnblockNotes('');
      setBlockedIssueForUnblock(null);
      setIssue({ ...issue, is_blocked: false });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to unblock task'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async () => {
    if (!blockedIssueForRespond || !respondMessage.trim()) {
      setError('Please provide a message');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.respondToBlock(
        blockedIssueForRespond.id,
        respondMessage.trim(),
        respondResources.trim(),
        respondCanProceed
      );
      setShowRespondModal(false);
      setRespondMessage('');
      setRespondResources('');
      setRespondCanProceed(false);
      setBlockedIssueForRespond(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send response'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Issue #{String(issueId).slice(0, 8)}</h2>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getPriorityColor(issue?.priority)}`}>
                {issue?.priority || 'Medium'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-400">
                {issue?.status || 'Unknown'}
              </span>
              {issue?.is_escalated && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-400">Escalated</span>}
              {issue?.is_sos && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500">SOS</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-2xl font-light hover:opacity-80 ml-4">×</button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>
          ) : issue ? (
            <>
              {/* Grid - Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Type</p>
                  <p className="text-sm font-bold text-gray-900">{issue.issue_type || issue.custom_issue_type_label || 'N/A'}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Days Open</p>
                  <p className="text-sm font-bold text-gray-900">{getDaysOpen(issue.created_at)} days</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Ward</p>
                  <p className="text-sm font-bold text-gray-900">{issue.ward || 'N/A'}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Citizen Rating</p>
                  <p className="text-sm font-bold text-yellow-600">
                    {issue.citizen_rating ? `${issue.citizen_rating}/5` : 'Not Rated'}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <IconLocation />
                  <p className="text-xs font-semibold text-gray-600 uppercase">Location</p>
                </div>
                <p className="text-sm text-gray-900 font-medium">{issue.address || 'No address provided'}</p>
                {issue.latitude && issue.longitude && (
                  <p className="text-xs text-gray-500 mt-1">Coordinates: {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}</p>
                )}
              </div>

              {/* Description */}
              {issue.description && (
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IconDoc />
                    <p className="text-xs font-semibold text-gray-600 uppercase">Description</p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{issue.description}</p>
                </div>
              )}

              {/* Reporter & Assignment */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <IconPerson />
                    <p className="text-xs font-semibold text-gray-600 uppercase">Reporter</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{issue.reporter?.name || 'Anonymous'}</p>
                    <p className="text-xs text-gray-600">{issue.reporter?.phone || issue.reporter_id?.slice(0, 8) || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-2">Reported: {new Date(issue.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <IconPerson />
                    <p className="text-xs font-semibold text-gray-600 uppercase">Assigned Worker</p>
                  </div>
                  {issue.assigned_worker_name ? (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">{issue.assigned_worker_name}</p>
                      <p className="text-xs text-gray-600">{issue.assigned_worker_id?.toString().slice(0, 8) || 'N/A'}</p>
                      {issue.updated_at && (
                        <p className="text-xs text-gray-500 mt-2">Last Updated: {new Date(issue.updated_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Not assigned yet</p>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <IconCalendar />
                  <p className="text-xs font-semibold text-gray-600 uppercase">Timeline</p>
                </div>
                <div className="space-y-2 text-xs text-gray-600">
                  <p><span className="text-gray-900 font-medium">Created:</span> {new Date(issue.created_at).toLocaleString()}</p>
                  {issue.updated_at && (
                    <p><span className="text-gray-900 font-medium">Updated:</span> {new Date(issue.updated_at).toLocaleString()}</p>
                  )}
                  {issue.resolved_at ? (
                    <p><span className="text-gray-900 font-medium">Resolved:</span> {new Date(issue.resolved_at).toLocaleString()}</p>
                  ) : null}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-purple-600">{(issue.before_photos?.length || 0) + (issue.after_photos?.length || 0)}</p>
                  <p className="text-xs text-gray-600 mt-1">Photos</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-orange-600">{issue.comment_count || 0}</p>
                  <p className="text-xs text-gray-600 mt-1">Comments</p>
                </div>
                <div className="bg-pink-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-pink-600">{issue.reassignment_count || 0}</p>
                  <p className="text-xs text-gray-600 mt-1">Reassignments</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-2xl font-bold text-indigo-600">{issue.is_escalated ? 'Yes' : 'No'}</p>
                  <p className="text-xs text-gray-600 mt-1">Escalated</p>
                </div>
              </div>

              {/* Photos Gallery */}
              {((issue.before_photos && issue.before_photos.length > 0) || (issue.after_photos && issue.after_photos.length > 0)) && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <IconCamera />
                    <p className="text-xs font-semibold text-gray-600 uppercase">
                      Photos ({(issue.before_photos?.length || 0) + (issue.after_photos?.length || 0)})
                    </p>
                  </div>
                  {issue.before_photos && issue.before_photos.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Before Photos ({issue.before_photos.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {issue.before_photos.map((photo, i) => (
                          <div key={`before-${i}`} className="rounded-lg overflow-hidden">
                            <img src={photo} alt={`Before photo ${i+1}`} className="w-full h-40 object-cover hover:scale-105 transition-transform cursor-pointer" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {issue.after_photos && issue.after_photos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">After Photos ({issue.after_photos.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {issue.after_photos.map((photo, i) => (
                          <div key={`after-${i}`} className="rounded-lg overflow-hidden">
                            <img src={photo} alt={`After photo ${i+1}`} className="w-full h-40 object-cover hover:scale-105 transition-transform cursor-pointer" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Notes */}
              {issue.resolution_notes && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <IconDoc />
                    <p className="text-xs font-semibold text-gray-600 uppercase">Resolution Notes</p>
                  </div>
                  <p className="text-sm text-gray-700">{issue.resolution_notes}</p>
                </div>
              )}

              {/* Blocked Status */}
              {issue.is_blocked && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="badge bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold inline-block">BLOCKED</p>
                    <div className="text-xs text-gray-600">
                      {issue.blocked_duration_hours && (
                        <span>Blocked: {issue.blocked_duration_hours.toFixed(1)}h</span>
                      )}
                    </div>
                  </div>
                  {issue.blocked_reason && (
                    <p className="text-sm text-red-900 mb-3">{issue.blocked_reason}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setBlockedIssueForRespond(issue); setShowRespondModal(true); }}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      📨 Respond
                    </button>
                    <button
                      onClick={() => { setBlockedIssueForUnblock(issue); setShowUnblockModal(true); }}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      🔓 Unblock
                    </button>
                    <a
                      href="/dashboard/blocked-tasks"
                      className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                    >
                      📋 All Blocked
                    </a>
                  </div>
                </div>
              )}

              {/* Escalation Info */}
              {issue.is_escalated && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Escalation</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-600">Level:</span> <span className="text-gray-900 font-medium">{issue.escalation_level}</span></p>
                    {issue.escalated_at && (
                      <p><span className="text-gray-600">Escalated:</span> <span className="text-gray-900 font-medium">{new Date(issue.escalated_at).toLocaleString()}</span></p>
                    )}
                    {issue.is_duplicate && (
                      <p><span className="text-gray-600">Duplicate Of:</span> <span className="text-gray-900 font-medium">#{issue.parent_issue_id?.toString().slice(0, 8)}</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {issue.ai_issue_type && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-3">AI Analysis</p>
                  <div className="space-y-2 text-sm">
                    {issue.ai_issue_type && <p><span className="text-gray-600">Type:</span> <span className="text-gray-900 font-medium">{issue.ai_issue_type}</span></p>}
                    {issue.ai_severity && <p><span className="text-gray-600">Severity:</span> <span className="text-gray-900 font-medium">{issue.ai_severity}</span></p>}
                    {issue.ai_confidence && <p><span className="text-gray-600">Confidence:</span> <span className="text-gray-900 font-medium">{(issue.ai_confidence * 100).toFixed(1)}%</span></p>}
                    {issue.ai_is_resolved !== null && <p><span className="text-gray-600">Resolved:</span> <span className="text-gray-900 font-medium">{issue.ai_is_resolved ? 'Yes' : 'No'}</span></p>}
                    {issue.ai_resolution_quality && <p><span className="text-gray-600">Quality:</span> <span className="text-gray-900 font-medium capitalize">{issue.ai_resolution_quality}</span></p>}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Unblock Modal */}
        {showUnblockModal && blockedIssueForUnblock && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-2">🔓 Unblock Task</h3>
              <div className="bg-gray-100 p-3 rounded mb-4 text-sm">
                <p><strong>Issue:</strong> {blockedIssueForUnblock.issue_type}</p>
                <p><strong>Reason:</strong> {blockedIssueForUnblock.blocked_reason || 'N/A'}</p>
              </div>
              <textarea
                value={unblockNotes}
                onChange={(e) => setUnblockNotes(e.target.value)}
                placeholder="Why are you unblocking this task?"
                className="w-full p-2 border rounded mb-4 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowUnblockModal(false); setUnblockNotes(''); }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnblock}
                  disabled={submitting || !unblockNotes.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                >
                  {submitting ? 'Unblocking...' : 'Unblock'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Respond Modal */}
        {showRespondModal && blockedIssueForRespond && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-2">📨 Respond to Block</h3>
              <div className="bg-gray-100 p-3 rounded mb-4 text-sm">
                <p><strong>Issue:</strong> {blockedIssueForRespond.issue_type}</p>
                <p><strong>Worker:</strong> {blockedIssueForRespond.assigned_worker_name || 'Unassigned'}</p>
              </div>
              <textarea
                value={respondMessage}
                onChange={(e) => setRespondMessage(e.target.value)}
                placeholder="Message to worker..."
                className="w-full p-2 border rounded mb-3 text-sm"
              />
              <input
                type="text"
                value={respondResources}
                onChange={(e) => setRespondResources(e.target.value)}
                placeholder="Resources provided (optional)"
                className="w-full p-2 border rounded mb-3 text-sm"
              />
              <label className="flex items-center gap-2 mb-4 text-sm">
                <input
                  type="checkbox"
                  checked={respondCanProceed}
                  onChange={(e) => setRespondCanProceed(e.target.checked)}
                />
                Worker can proceed
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowRespondModal(false); setRespondMessage(''); setRespondResources(''); setRespondCanProceed(false); }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRespond}
                  disabled={submitting || !respondMessage.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function exportCSV(surveys) {
  const header = ['Issue ID', 'Speed Rating', 'Fully Resolved', 'Would Report Again', 'Feedback', 'Date'];
  const rows = surveys.map((s) => [
    s.issue_id?.slice(0, 8) ?? '',
    SPEED_LABELS[s.speed_rating] ?? s.speed_rating,
    s.fully_resolved ? 'Yes' : 'No',
    s.would_report_again ? 'Yes' : 'No',
    `"${(s.feedback || '').replace(/"/g, '""')}"`,
    s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `surveys_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SurveysPage() {
  const [stats, setStats] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSpeed, setFilterSpeed] = useState('all');
  const [filterResolved, setFilterResolved] = useState('all');
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  useEffect(() => {
    setLoading(true);
    adminApi.getSurveyStats(days)
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!stats) return <div className="text-center py-12 text-gray-400">Failed to load survey data</div>;

  const pct = (n, total) => total > 0 ? Math.round((n / total) * 100) : 0;
  const total = stats.total_responses ?? 0;

  const allSurveys = stats.all_surveys ?? [];
  const filtered = allSurveys.filter((s) => {
    if (filterSpeed !== 'all' && String(s.speed_rating) !== filterSpeed) return false;
    if (filterResolved === 'yes' && !s.fully_resolved) return false;
    if (filterResolved === 'no' && s.fully_resolved) return false;
    if (search && !(s.feedback?.toLowerCase().includes(search.toLowerCase()) || s.issue_id?.includes(search))) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Issue Detail Modal */}
      {selectedIssueId && (
        <IssueDetailModal issueId={selectedIssueId} onClose={() => setSelectedIssueId(null)} />
      )}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold text-gray-900">Satisfaction Surveys</h1>
        <div className="flex gap-2 flex-wrap">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${days === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {d}d
            </button>
          ))}
          {allSurveys.length > 0 && (
            <button
              onClick={() => exportCSV(filtered.length < allSurveys.length ? filtered : allSurveys)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 flex items-center gap-1.5 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:13,height:13}}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Responses" value={total} />
        <StatCard
          label="Fully Resolved"
          value={`${pct(stats.fully_resolved_count ?? 0, total)}%`}
          sub={`${stats.fully_resolved_count ?? 0} of ${total}`}
          color="text-green-600"
        />
        <StatCard
          label="Avg Speed Rating"
          value={stats.avg_speed_rating != null ? stats.avg_speed_rating.toFixed(1) : 'N/A'}
          sub={SPEED_LABELS[Math.round(stats.avg_speed_rating)] || ''}
          color="text-blue-600"
        />
        <StatCard
          label="Would Report Again"
          value={`${pct(stats.would_report_again_count ?? 0, total)}%`}
          sub={`${stats.would_report_again_count ?? 0} yes`}
          color="text-purple-600"
        />
      </div>

      {/* Speed breakdown */}
      {stats.speed_breakdown && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Speed Rating Distribution</h2>
          <div className="flex gap-4">
            {Object.entries(stats.speed_breakdown).map(([rating, count]) => {
              const width = Math.max(pct(count, total || 1), 3);
              return (
                <div key={rating} className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-500">{SPEED_LABELS[rating] || `Rating ${rating}`}</span>
                    <span className="text-xs font-bold text-gray-700">{count}</span>
                  </div>
                  <div className="h-7 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg flex items-center justify-center text-white text-xs font-bold transition-all"
                      style={{ width: `${width}%`, backgroundColor: SPEED_COLORS[rating] || '#6b7280' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual Survey Table */}
      {allSurveys.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-bold text-gray-700">All Responses ({filtered.length})</h2>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Search feedback or issue ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterSpeed}
                onChange={(e) => setFilterSpeed(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Speeds</option>
                <option value="1">Slow</option>
                <option value="2">Average</option>
                <option value="3">Fast</option>
              </select>
              <select
                value={filterResolved}
                onChange={(e) => setFilterResolved(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All</option>
                <option value="yes">Fully Resolved</option>
                <option value="no">Not Resolved</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No surveys match the filters</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Issue</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Speed</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Resolved</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Report Again</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Feedback</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedIssueId(s.issue_id)}
                          className="font-mono text-blue-600 hover:underline cursor-pointer hover:text-blue-700 font-semibold"
                        >
                          #{s.issue_id?.slice(0, 8)}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-white text-xs font-semibold"
                          style={{ backgroundColor: SPEED_COLORS[s.speed_rating] || '#6b7280' }}
                        >
                          {SPEED_LABELS[s.speed_rating] || s.speed_rating}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.fully_resolved ? (
                          <span className="text-green-600 font-semibold flex items-center gap-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg> Yes</span>
                        ) : (
                          <span className="text-red-500 font-semibold flex items-center gap-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" /></svg> No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.would_report_again ? (
                          <span className="text-green-600 font-semibold flex items-center gap-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg> Yes</span>
                        ) : (
                          <span className="text-red-500 font-semibold flex items-center gap-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" /></svg> No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="text-gray-600 truncate block" title={s.feedback}>
                          {s.feedback || <span className="italic text-gray-400">No comment</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {total === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400 text-sm">
          No survey responses in the last {days} days
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
