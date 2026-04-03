'use client';
/**
 * SLA & Auto-Escalation Monitor Dashboard
 * Real-time monitoring for SLA compliance and escalation events
 * Features:
 * - KPI cards for escalated/at-risk issues and compliance rate
 * - Compliance breakdown by priority
 * - Escalated and at-risk issues tables
 * - Detail modal for individual issue SLA metrics
 */
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { logger } from '../../../src/lib/logger';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PRIORITY_COLORS = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#10b981',
};

const SLA_THRESHOLDS = {
  urgent: 24,
  high: 48,
  medium: 72,
  low: 168,
};

const COMPONENT_NAME = 'SLADashboard';

export default function SLADashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueDetail, setIssueDetail] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Initialize component with auto-refresh interval
   */
  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Fetch SLA dashboard data from API
   */
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.debug(COMPONENT_NAME, 'Fetching SLA dashboard data');
      
      const res = await adminApi.get('/issues/sla/dashboard');
      
      if (!res.data) {
        throw new Error('No SLA dashboard data returned');
      }
      
      setDashboard(res.data);
      logger.info(COMPONENT_NAME, `Dashboard loaded: ${res.data.escalated_count} escalated, ${res.data.at_risk_count} at-risk`);
    } catch (error) {
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to load SLA dashboard';
      logger.error(COMPONENT_NAME, 'Error fetching SLA dashboard', error);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch detailed SLA metrics for specific issue
   */
  const fetchIssueDetail = async (issueId) => {
    try {
      logger.debug(COMPONENT_NAME, `Fetching SLA details for issue ${issueId}`);
      
      if (!issueId) throw new Error('Issue ID is required');
      
      const res = await adminApi.get(`/issues/sla/${issueId}`);
      
      if (!res.data) throw new Error('No issue detail data returned');
      
      setIssueDetail(res.data);
      setSelectedIssue(issueId);
      logger.info(COMPONENT_NAME, `Issue detail loaded for ${issueId}`);
    } catch (error) {
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to load issue details';
      logger.error(COMPONENT_NAME, 'Error fetching issue detail', error);
      alert(`Error: ${errorMsg}`);
    }
  };

  /**
   * Close detail modal
   */
  const closeDetailModal = () => {
    setSelectedIssue(null);
    setIssueDetail(null);
    logger.debug(COMPONENT_NAME, 'Closed issue detail modal');
  };

  // Loading state
  if (loading || !dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <p className="text-gray-400">Loading SLA dashboard…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <h2 className="text-lg font-bold text-red-700 mb-2">Error Loading SLA Dashboard</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchDashboard} className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700">
          Try Again
        </button>
      </div>
    );
  }

  // Prepare compliance chart data
  const complianceData = Object.entries(dashboard.compliance_by_priority).map(([priority, data]) => ({
    priority: priority.charAt(0).toUpperCase() + priority.slice(1),
    compliant: data.compliant,
    violated: data.violated,
    rate: data.compliance_rate,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">SLA & Auto-Escalation Monitor</h1>
        <button onClick={fetchDashboard} className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          🔄 Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-50 rounded-xl p-5 border border-red-200">
          <div className="text-sm text-red-700 font-semibold mb-2">ESCALATED ISSUES</div>
          <div className="text-4xl font-bold text-red-600">{dashboard.escalated_count}</div>
          <p className="text-xs text-red-600 mt-2">Issues that violated SLA thresholds</p>
        </div>

        <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200">
          <div className="text-sm text-yellow-700 font-semibold mb-2">AT RISK (Less than 2h)</div>
          <div className="text-4xl font-bold text-yellow-600">{dashboard.at_risk_count}</div>
          <p className="text-xs text-yellow-600 mt-2">Issues approaching SLA breach</p>
        </div>

        <div className="bg-green-50 rounded-xl p-5 border border-green-200">
          <div className="text-sm text-green-700 font-semibold mb-2">OVERALL COMPLIANCE</div>
          <div className="text-4xl font-bold text-green-600">
            {Object.values(dashboard.compliance_by_priority).length > 0
              ? Math.round(Object.values(dashboard.compliance_by_priority).reduce((sum, p) => sum + p.compliance_rate, 0) / Object.values(dashboard.compliance_by_priority).length)
              : 100}
            %
          </div>
          <p className="text-xs text-green-600 mt-2">Across all priority levels</p>
        </div>
      </div>

      {/* Compliance by Priority */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4">SLA Compliance by Priority</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={complianceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => value} />
            <Bar dataKey="compliant" name="Compliant" fill="#10b981" />
            <Bar dataKey="violated" name="Violated" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SLA Thresholds Legend */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">SLA Thresholds by Priority</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(SLA_THRESHOLDS).map(([priority, hours]) => (
            <div key={priority} className="p-3 rounded-lg border" style={{ borderColor: PRIORITY_COLORS[priority], backgroundColor: `${PRIORITY_COLORS[priority]}10` }}>
              <div className="text-xs font-semibold" style={{ color: PRIORITY_COLORS[priority] }}>
                {priority.toUpperCase()}
              </div>
              <div className="text-lg font-bold" style={{ color: PRIORITY_COLORS[priority] }}>
                {hours}h
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Escalated Issues Table */}
      {dashboard.escalated_count > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">🔴 Escalated Issues ({dashboard.escalated_count})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">ID</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Type</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Priority</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Ward</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Created</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Escalated At</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.escalated_issues.map((issue) => (
                  <tr key={issue.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs text-gray-500">{issue.id_short}</td>
                    <td className="py-2 px-3 capitalize text-gray-700">{issue.issue_type}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold text-white" style={{ backgroundColor: PRIORITY_COLORS[issue.priority] }}>
                        {issue.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 capitalize text-gray-700">{issue.status}</td>
                    <td className="py-2 px-3 text-gray-600">{issue.ward || '-'}</td>
                    <td className="py-2 px-3 text-xs text-gray-500">{new Date(issue.created_at).toLocaleDateString()}</td>
                    <td className="py-2 px-3 text-xs text-gray-500">{new Date(issue.escalated_at).toLocaleDateString()}</td>
                    <td className="py-2 px-3">
                      <button onClick={() => fetchIssueDetail(issue.id)} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* At-Risk Issues Table */}
      {dashboard.at_risk_count > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">⚠️  Issues At Risk ({dashboard.at_risk_count})</h2>
          <p className="text-xs text-gray-500 mb-4">Approaching SLA breach window (less than 2 hours remaining)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">ID</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Type</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Priority</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Ward</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Hours Left</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.at_risk_issues.map((issue) => (
                  <tr key={issue.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs text-gray-500">{issue.id_short}</td>
                    <td className="py-2 px-3 capitalize text-gray-700">{issue.issue_type}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold text-white" style={{ backgroundColor: PRIORITY_COLORS[issue.priority] }}>
                        {issue.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 capitalize text-gray-700">{issue.status}</td>
                    <td className="py-2 px-3 text-gray-600">{issue.ward || '-'}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">{issue.hours_remaining.toFixed(1)}h</span>
                    </td>
                    <td className="py-2 px-3">
                      <button onClick={() => fetchIssueDetail(issue.id)} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issue Detail Modal */}
      {selectedIssue && issueDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-800">Issue SLA Details</h3>
              <button onClick={closeDetailModal} className="text-gray-400 hover:text-gray-600 text-2xl">
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500 font-semibold">Issue ID</div>
                  <div className="text-sm text-gray-700 font-mono">{issueDetail.issue_id}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-semibold">Priority</div>
                  <span className="inline-block px-2 py-1 rounded text-xs font-semibold text-white mt-1" style={{ backgroundColor: PRIORITY_COLORS[issueDetail.priority] }}>
                    {issueDetail.priority.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500 font-semibold">Status</div>
                  <div className="text-sm text-gray-700 capitalize">{issueDetail.status}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-semibold">SLA Threshold</div>
                  <div className="text-sm text-gray-700">{issueDetail.sla_hours} hours</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500 font-semibold">Time Elapsed</div>
                  <div className="text-sm text-gray-700">{issueDetail.time_elapsed_hours}h</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-semibold">Time Remaining</div>
                  <div className={`text-sm font-semibold ${issueDetail.sla_breach ? 'text-red-600' : 'text-green-600'}`}>{issueDetail.time_remaining_hours}h</div>
                </div>
              </div>

              {issueDetail.sla_breach && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-xs text-red-700 font-semibold mb-1">🔴 SLA BREACHED</div>
                  <div className="text-sm text-red-600">{issueDetail.escalation_reason}</div>
                </div>
              )}

              {issueDetail.is_escalated && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-xs text-yellow-700 font-semibold mb-1">⚠️  ESCALATED</div>
                  <div className="text-sm text-yellow-600">Escalated at: {new Date(issueDetail.escalated_at).toLocaleString()}</div>
                </div>
              )}

              <div className="pt-4 flex gap-2">
                <button onClick={() => window.open('/dashboard/issues', '_blank')} className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">
                  View Issue
                </button>
                <button onClick={closeDetailModal} className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-300">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
