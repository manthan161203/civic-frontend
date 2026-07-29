'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';
import { useUiStore } from '../../../src/store/uiStore';

export default function SquadsPage() {
  const [issueId, setIssueId] = useState('');
  const [leadWorkerId, setLeadWorkerId] = useState('');
  const [assistantIds, setAssistantIds] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Lookup state
  const [lookupId, setLookupId] = useState('');
  const [squad, setSquad] = useState(null);
  const [lookupError, setLookupError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { data } = await adminApi.createSquad({
        issue_id: issueId.trim(),
        lead_worker_id: leadWorkerId.trim(),
        assistant_ids: assistantIds.trim(),
        ...(notes.trim() && { notes: notes.trim() }),
      });
      setResult(data);
      useUiStore.getState().addToast('Squad created successfully!', 'success');
      setIssueId('');
      setLeadWorkerId('');
      setAssistantIds('');
      setNotes('');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to create squad');
      setError(errorMsg);
      useUiStore.getState().addToast(errorMsg, 'error');
    }
    setLoading(false);
  };

  const handleLookup = async () => {
    if (!lookupId.trim()) return;
    setLookupError('');
    setSquad(null);
    try {
      const { data } = await adminApi.getSquad(lookupId.trim());
      setSquad(data);
    } catch (err) {
      setLookupError(err.response?.data?.detail || 'Squad not found');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-ink">Multi-Worker Squads</h1>
        <p className="text-sm text-ink-subtle mt-0.5">
          Assign multiple workers to complex issues that require team coordination
        </p>
      </div>

      {/* Create Squad */}
      <div className="bg-surface rounded-xl border border-divider shadow-sm p-6">
        <h2 className="font-semibold text-ink mb-4">Create Squad</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Issue ID</label>
            <input
              type="text"
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
              placeholder="e.g. 2a904bc9-30fd-4999-..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Lead Worker ID</label>
            <input
              type="text"
              value={leadWorkerId}
              onChange={(e) => setLeadWorkerId(e.target.value)}
              placeholder="Primary worker UUID"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Assistant Worker IDs (comma-separated)</label>
            <input
              type="text"
              value={assistantIds}
              onChange={(e) => setAssistantIds(e.target.value)}
              placeholder="worker-uuid-1, worker-uuid-2"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions for the squad..."
              rows={2}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Squad'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-danger-soft text-danger rounded-lg text-sm">{error}</div>
        )}
        {result && (
          <div className="mt-4 p-3 bg-success-soft text-success rounded-lg text-sm">
            Squad created! ID: <span className="font-mono">{result.id}</span>
          </div>
        )}
      </div>

      {/* Lookup Squad */}
      <div className="bg-surface rounded-xl border border-divider shadow-sm p-6">
        <h2 className="font-semibold text-ink mb-4">Lookup Squad by Issue</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="Issue ID"
            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={handleLookup}
            className="px-5 py-2 bg-chrome text-white text-sm font-semibold rounded-lg hover:bg-chrome-hover transition-colors"
          >
            Search
          </button>
        </div>

        {lookupError && (
          <div className="mt-4 p-3 bg-danger-soft text-danger rounded-lg text-sm">{lookupError}</div>
        )}
        {squad && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                squad.status === 'active' ? 'bg-success-soft text-success' :
                squad.status === 'completed' ? 'bg-primary-soft text-primary-strong' :
                'bg-surface-alt text-ink-muted'
              }`}>{squad.status}</span>
              <span className="text-xs text-ink-subtle">Created {new Date(squad.created_at).toLocaleString()}</span>
            </div>
            {squad.lead_worker && (
              <div>
                <p className="text-xs text-ink-subtle font-semibold mb-1">Lead Worker</p>
                <p className="text-sm text-ink">
                  {squad.lead_worker.name} — <span className="text-ink-subtle">{squad.lead_worker.phone}</span>
                </p>
              </div>
            )}
            {squad.assistants?.length > 0 && (
              <div>
                <p className="text-xs text-ink-subtle font-semibold mb-1">Assistants ({squad.assistants.length})</p>
                <div className="space-y-1">
                  {squad.assistants.map((a) => (
                    <p key={a.id} className="text-sm text-ink-muted">
                      {a.name} — <span className="text-ink-subtle">{a.phone}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
            {squad.notes && (
              <div>
                <p className="text-xs text-ink-subtle font-semibold mb-1">Notes</p>
                <p className="text-sm text-ink-muted">{squad.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
