'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';

const SPEED_LABELS = { 1: 'Slow', 2: 'Average', 3: 'Fast' };
const SPEED_COLORS = { 1: '#ef4444', 2: '#f59e0b', 3: '#22c55e' };

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
                        <a
                          href={`/dashboard/issues?search=${s.issue_id?.slice(0, 8)}`}
                          className="font-mono text-blue-600 hover:underline"
                        >
                          #{s.issue_id?.slice(0, 8)}
                        </a>
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
                          <span className="text-green-600 font-semibold">✓ Yes</span>
                        ) : (
                          <span className="text-red-500 font-semibold">✗ No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.would_report_again ? (
                          <span className="text-green-600 font-semibold">✓ Yes</span>
                        ) : (
                          <span className="text-red-500 font-semibold">✗ No</span>
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
