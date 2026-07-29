'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';

export default function SLADashboardPage() {
  const [slaData, setSLAData] = useState(null);
  const [issueDetails, setIssueDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.getSLADashboard();
      setSLAData(data);

      // Combine escalated and at_risk issues
      let issues = [
        ...(data.escalated_issues || []).map(i => ({ ...i, sla_status: 'breached' })),
        ...(data.at_risk_issues || []).map(i => ({ ...i, sla_status: 'warning' }))
      ];
      
      if (filterStatus === 'breached') {
        issues = issues.filter((i) => i.sla_status === 'breached');
      } else if (filterStatus === 'warning') {
        issues = issues.filter((i) => i.sla_status === 'warning');
      }
      setIssueDetails(issues);
      setPage(1);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load SLA metrics'));
      console.error('SLA Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface rounded-lg shadow-sm p-4 animate-pulse">
            <div className="h-20 bg-border rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!slaData) {
    return (
      <div className="bg-surface rounded-lg shadow-sm border border-divider p-12 text-center">
        <p className="text-ink-subtle font-medium">No SLA data available</p>
      </div>
    );
  }

  const breachedCount = slaData?.escalated_count || 0;
  const warningCount = slaData?.at_risk_count || 0;
  const ontrackCount = (slaData?.escalated_count || 0) + (slaData?.at_risk_count || 0) > 0 ? 0 : slaData?.total_open || 0;
  const paginatedIssues = issueDetails.slice((page - 1) * 10, page * 10);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
          </svg>
          <h1 className="text-2xl font-bold text-ink">SLA Metrics Dashboard</h1>
        </div>
        <p className="text-sm text-ink-subtle mt-1">Monitor service level agreement compliance</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface rounded-card border border-divider p-4">
          <p className="text-xs font-semibold text-ink-muted uppercase">On Track</p>
          <p className="text-2xl font-bold text-success mt-2">{ontrackCount}</p>
        </div>
        <div className="bg-surface rounded-card border border-divider p-4">
          <p className="text-xs font-semibold text-ink-muted uppercase">Warning</p>
          <p className="text-2xl font-bold text-warning mt-2">{warningCount}</p>
        </div>
        <div className="bg-surface rounded-card border border-divider p-4">
          <p className="text-xs font-semibold text-ink-muted uppercase">Breached</p>
          <p className="text-2xl font-bold text-danger mt-2">{breachedCount}</p>
        </div>
      </div>

      <div>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filterStatus === 'all'
                ? 'bg-primary text-white'
                : 'bg-surface-alt text-ink-muted hover:bg-border'
            }`}
          >
            All ({issueDetails.length})
          </button>
          <button
            onClick={() => setFilterStatus('breached')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filterStatus === 'breached'
                ? 'bg-danger text-white'
                : 'bg-surface-alt text-ink-muted hover:bg-border'
            }`}
          >
            Breached ({breachedCount})
          </button>
          <button
            onClick={() => setFilterStatus('warning')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filterStatus === 'warning'
                ? 'bg-warning text-white'
                : 'bg-surface-alt text-ink-muted hover:bg-border'
            }`}
          >
            Warning ({warningCount})
          </button>
        </div>

        {paginatedIssues.length === 0 ? (
          <div className="bg-surface rounded-lg shadow-sm border border-divider p-8 text-center">
            <p className="text-ink-subtle font-medium">No issues found</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`rounded-lg border p-4 ${
                    issue.sla_status === 'breached'
                      ? 'bg-danger-soft border-danger/30'
                      : issue.sla_status === 'warning'
                      ? 'bg-warning-soft border-warning/30'
                      : 'bg-success-soft border-success/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-ink">Issue #{issue.id_short}</h3>
                      <p className="text-sm text-ink-muted mt-1">{issue.ward || 'Unknown Ward'}</p>
                      <div className="flex gap-4 mt-2 text-xs text-ink-muted">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
                          </svg>
                          SLA: {issue.sla_hours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
                          </svg>
                          Remaining: {issue.hours_remaining}h
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                      issue.sla_status === 'breached' ? 'bg-danger-soft text-danger' :
                      issue.sla_status === 'warning' ? 'bg-warning-soft text-warning' :
                      'bg-success-soft text-success'
                    }`}>
                      {issue.sla_status === 'breached' ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                          </svg>
                          Breached
                        </>
                      ) : issue.sla_status === 'warning' ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M7.5 3H6.3C5.79 3 5.3 3.25 5 3.65L1.35 9.35C.96 9.98.96 10.99 1.35 11.62L5 17.35C5.3 17.75 5.8 18 6.3 18h1.2c.55 0 1-.45 1-1v-13c0-.55-.45-1-1-1zm13.48 9.35L17.98 3.65C17.68 3.25 17.19 3 16.7 3H15.5c-.55 0-1 .45-1 1v13c0 .55.45 1 1 1h1.2c.49 0 .98-.25 1.28-.65l3.15-5.62c.39-.63.39-1.64 0-2.27zM10.5 9c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                          Warning
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                          On Track
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {issueDetails.length > 10 && (
              <div className="flex items-center justify-between bg-surface rounded-lg shadow-sm border border-divider p-4 mt-4">
                <p className="text-sm text-ink-muted">
                  Page {page} of {Math.ceil(issueDetails.length / 10)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-border-strong rounded-lg text-sm font-semibold text-ink-muted disabled:opacity-50 hover:bg-surface-alt"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(Math.ceil(issueDetails.length / 10), p + 1))}
                    disabled={page === Math.ceil(issueDetails.length / 10)}
                    className="px-3 py-1.5 border border-border-strong rounded-lg text-sm font-semibold text-ink-muted disabled:opacity-50 hover:bg-surface-alt"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger/30 rounded-lg p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
    </div>
  );
}
