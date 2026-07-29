'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';
import LoadingButton from '../../../src/components/ui/LoadingButton';

const SEVERITY_COLORS = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const QUALITY_COLORS = {
  good: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  poor: 'bg-red-100 text-red-700',
};

function IssueDetailModal({ issueId, onClose }) {
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getIssueDetail(issueId)
      .then(({ data }) => setIssue(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [issueId]);

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );

  if (!issue) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Issue #{issue.id}</h3>
            <p className="text-sm text-gray-500 mt-1">{issue.address}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {/* AI Predictions */}
        {(issue.ai_issue_type || issue.ai_confidence) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="text-xs font-bold text-blue-900 uppercase mb-3 flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" /></svg> AI Analysis</h4>
            <div className="space-y-2">
              {issue.ai_issue_type && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Predicted Type:</span>
                  <span className="text-sm font-semibold text-blue-700">{issue.ai_issue_type}</span>
                </div>
              )}
              {issue.ai_severity && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Severity:</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${SEVERITY_COLORS[issue.ai_severity] || ''}`}>
                    {issue.ai_severity}
                  </span>
                </div>
              )}
              {issue.ai_confidence && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Confidence:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-300 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          issue.ai_confidence > 0.8 ? 'bg-green-500' :
                          issue.ai_confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${issue.ai_confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-10">{(issue.ai_confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}
              {issue.ai_suggested_description && (
                <div>
                  <span className="text-sm text-gray-700 block mb-1">AI Description:</span>
                  <p className="text-sm text-gray-600 bg-white p-2 rounded border border-blue-100">{issue.ai_suggested_description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resolution Verification */}
        {issue.ai_is_resolved !== undefined && (
          <div className={`border rounded-lg p-4 mb-4 ${
            issue.ai_resolution_quality === 'poor'
              ? 'bg-red-50 border-red-200'
              : issue.ai_resolution_quality === 'partial'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-green-50 border-green-200'
          }`}>
            <h4 className="text-xs font-bold uppercase mb-3 flex items-center gap-2" style={{
              color: issue.ai_resolution_quality === 'poor' ? '#991b1b' :
                     issue.ai_resolution_quality === 'partial' ? '#b45309' : '#166534'
            }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg> Resolution Verification
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Status:</span>
                <span className="text-sm font-semibold">
                  {issue.ai_is_resolved ? (<span className="flex items-center gap-1"><svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg> Resolved</span>) : (<span className="flex items-center gap-1"><svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" /></svg> Not Resolved</span>)}
                </span>
              </div>
              {issue.ai_resolution_quality && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Quality:</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${QUALITY_COLORS[issue.ai_resolution_quality]}`}>
                    {issue.ai_resolution_quality}
                  </span>
                </div>
              )}
              {issue.ai_resolution_notes && (
                <div>
                  <span className="text-sm text-gray-700 block mb-1">Notes:</span>
                  <p className="text-sm text-gray-600 bg-white p-2 rounded border">{issue.ai_resolution_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Original Issue Data */}
        <div className="space-y-3 text-sm">
          <div>
            <span className="font-semibold text-gray-700">Reporter:</span>
            <p className="text-gray-600">{issue.reporter?.name || 'Anonymous'}</p>
          </div>
          {issue.description && (
            <div>
              <span className="font-semibold text-gray-700">Description:</span>
              <p className="text-gray-600">{issue.description}</p>
            </div>
          )}
          {issue.status && (
            <div>
              <span className="font-semibold text-gray-700">Status:</span>
              <p className="text-gray-600 capitalize">{issue.status}</p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function AIInsightsPage() {
  const [stats, setStats] = useState({
    total_issues: 0,
    low_confidence: 0,
    poor_resolutions: 0,
    avg_confidence: 0,
  });
  const [issues, setIssues] = useState([]);
  const [activeTab, setActiveTab] = useState('low-confidence'); // 'low-confidence' | 'poor-quality'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [page, setPage] = useState(1);
  // True when the scan hit the server cap, so the figures below are a sample
  // rather than a total and the UI has to say so.
  const [truncated, setTruncated] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      /*
       * This screen has no backend endpoint — there is no `/admin/ai-insights`,
       * so the confidence figures are derived here from the issue list.
       *
       * It used to ask for `{ limit: 1000, skip: 0 }`. `GET /admin/issues` takes
       * `page`/`size` and ignores anything else, so the request silently
       * returned page 1 at the default size of 20 and every "total" on this
       * screen was computed from 20 rows. The numbers looked plausible and were
       * wrong by whatever factor the real dataset happened to be.
       *
       * `size` is capped at 200 server-side, so we page until we run out or hit
       * a ceiling, and label the result honestly when we stop early.
       */
      const PAGE_SIZE = 200;
      const MAX_PAGES = 10; // 2,000 issues — enough to be useful, bounded.

      const collected = [];
      let pageNo = 1;
      let total = 0;

      for (; pageNo <= MAX_PAGES; pageNo += 1) {
        const { data } = await adminApi.getIssues({ page: pageNo, size: PAGE_SIZE });
        const batch = data?.items ?? [];
        total = data?.total ?? total;
        collected.push(...batch);
        if (batch.length < PAGE_SIZE) break;
      }

      const withAI = collected.filter((i) => i.ai_confidence || i.ai_resolution_quality);
      const lowConf = withAI.filter((i) => i.ai_confidence && i.ai_confidence < 0.7);
      const poorRes = withAI.filter((i) => i.ai_resolution_quality === 'poor');
      const avgConf = withAI.length
        ? withAI.reduce((sum, i) => sum + (i.ai_confidence || 0), 0) / withAI.length
        : 0;

      setTruncated(total > collected.length);
      setStats({
        total_issues: withAI.length,
        low_confidence: lowConf.length,
        poor_resolutions: poorRes.length,
        avg_confidence: avgConf,
        scanned: collected.length,
        total_available: total,
      });

      setIssues(activeTab === 'low-confidence' ? lowConf : poorRes);
      setPage(1);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load AI insights.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const displayIssues = issues.slice((page - 1) * 10, page * 10);

  return (
    <div className="space-y-6">
      {selectedIssue && (
        <IssueDetailModal
          issueId={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" /></svg>
          <h1 className="text-2xl font-bold text-gray-900">AI Insights Dashboard</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Monitor AI-driven issue analysis and resolution verification</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* These figures are computed in the browser from the issue list — there
          is no AI-insights endpoint. Say so when the scan did not reach the end
          of the data, rather than presenting a sample as a total. */}
      {truncated && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-800">
            Showing the {stats.scanned?.toLocaleString()} most recent of{' '}
            {stats.total_available?.toLocaleString()} issues. These figures are a sample,
            not a total — a server-side AI insights endpoint is needed for accurate
            aggregates.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase">Issues with AI</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total_issues}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase">Low Confidence</p>
          <p className="text-2xl font-bold text-orange-600 mt-2">{stats.low_confidence}</p>
          <p className="text-xs text-gray-500 mt-1">(&lt; 70%)</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase">Poor Resolution</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{stats.poor_resolutions}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase">Avg Confidence</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{(stats.avg_confidence * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-xl shadow-sm p-2 border border-gray-100">
        <button
          onClick={() => setActiveTab('low-confidence')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'low-confidence'
              ? 'bg-orange-100 text-orange-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Low Confidence Issues ({stats.low_confidence})
        </button>
        <button
          onClick={() => setActiveTab('poor-quality')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'poor-quality'
              ? 'bg-red-100 text-red-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Poor Resolution Quality ({stats.poor_resolutions})
        </button>
      </div>

      {/* Issue List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
              <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-full bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : displayIssues.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500 font-medium">
            {activeTab === 'low-confidence'
              ? 'No low confidence predictions'
              : 'No poor resolution detections'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayIssues.map((issue) => (
              <button
                key={issue.id}
                onClick={() => setSelectedIssue(issue.id)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition text-left w-full"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">Issue #{issue.id}</h3>
                      {activeTab === 'low-confidence' && issue.ai_confidence && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
                          {(issue.ai_confidence * 100).toFixed(0)}% confidence
                        </span>
                      )}
                      {activeTab === 'poor-quality' && issue.ai_resolution_quality && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${QUALITY_COLORS[issue.ai_resolution_quality]}`}>
                          {issue.ai_resolution_quality} quality
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{issue.address || 'Unknown location'}</p>
                  </div>
                  <div className="text-right">
                    {activeTab === 'low-confidence' && issue.ai_issue_type && (
                      <p className="text-xs text-gray-500">Predicted: <span className="font-semibold text-blue-700">{issue.ai_issue_type}</span></p>
                    )}
                  </div>
                </div>
                {issue.ai_suggested_description && (
                  <p className="text-xs text-gray-500 italic">"{issue.ai_suggested_description}"</p>
                )}
              </button>
            ))}
          </div>

          {/* Pagination */}
          {issues.length > 10 && (
            <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm text-gray-600">
                Page {page} of {Math.ceil(issues.length / 10)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(issues.length / 10), p + 1))}
                  disabled={page === Math.ceil(issues.length / 10)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
