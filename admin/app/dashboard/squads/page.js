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
        <h1 className="text-xl font-bold text-gray-900">Multi-Worker Squads</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Assign multiple workers to complex issues that require team coordination
        </p>
      </div>

      {/* Create Squad */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Create Squad</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Issue ID</label>
            <input
              type="text"
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
              placeholder="e.g. 2a904bc9-30fd-4999-..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Lead Worker ID</label>
            <input
              type="text"
              value={leadWorkerId}
              onChange={(e) => setLeadWorkerId(e.target.value)}
              placeholder="Primary worker UUID"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assistant Worker IDs (comma-separated)</label>
            <input
              type="text"
              value={assistantIds}
              onChange={(e) => setAssistantIds(e.target.value)}
              placeholder="worker-uuid-1, worker-uuid-2"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions for the squad..."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Squad'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}
        {result && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            Squad created! ID: <span className="font-mono">{result.id}</span>
          </div>
        )}
      </div>

      {/* Lookup Squad */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Lookup Squad by Issue</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="Issue ID"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          <button
            onClick={handleLookup}
            className="px-5 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-900 transition-colors"
          >
            Search
          </button>
        </div>

        {lookupError && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{lookupError}</div>
        )}
        {squad && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                squad.status === 'active' ? 'bg-green-100 text-green-700' :
                squad.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>{squad.status}</span>
              <span className="text-xs text-gray-400">Created {new Date(squad.created_at).toLocaleString()}</span>
            </div>
            {squad.lead_worker && (
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Lead Worker</p>
                <p className="text-sm text-gray-800">
                  {squad.lead_worker.name} — <span className="text-gray-500">{squad.lead_worker.phone}</span>
                </p>
              </div>
            )}
            {squad.assistants?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Assistants ({squad.assistants.length})</p>
                <div className="space-y-1">
                  {squad.assistants.map((a) => (
                    <p key={a.id} className="text-sm text-gray-700">
                      {a.name} — <span className="text-gray-500">{a.phone}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
            {squad.notes && (
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Notes</p>
                <p className="text-sm text-gray-700">{squad.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
