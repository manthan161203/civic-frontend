'use client';
import { useEffect, useState, useCallback } from 'react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { adminApi } from '../../src/api/index';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const TYPE_COLORS = {
  roads: '#ef4444', water: '#3b82f6', electricity: '#f59e0b',
  sanitation: '#10b981', parks: '#8b5cf6', garbage: '#f97316', other: '#6b7280',
};

const STAT_ICONS = {
  open: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:22,height:22}}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={3} strokeLinecap="round" />
    </svg>
  ),
  inProgress: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:22,height:22}}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
  resolved: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:22,height:22}}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  total: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:22,height:22}}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  workers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:22,height:22}}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  time: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:22,height:22}}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

function StatCard({ label, value, sub, colorClass, icon }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-black text-gray-900 leading-tight">{value ?? '—'}</div>
        <div className="text-sm font-semibold text-gray-700 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function DashboardMap({ points }) {
  if (!points || points.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3">Issue Heatmap</h2>
        <div className="h-[280px] flex items-center justify-center text-gray-300 text-sm">No issue locations to display</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-sm font-bold text-gray-700 mb-3">Issue Heatmap</h2>
      <div className="rounded-xl overflow-hidden border border-gray-100" style={{ height: 320 }}>
        <Map
          defaultCenter={{ lat: 22.2587, lng: 71.1924 }}
          defaultZoom={7}
          mapId="civic-dashboard-mini"
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          style={{ width: '100%', height: '100%' }}
        >
          {points.map((p, i) => {
            const color = TYPE_COLORS[p.issue_type] || TYPE_COLORS.other;
            const scale = p.weight === 3 ? 1.3 : p.weight === 2 ? 1.0 : 0.8;
            return (
              <AdvancedMarker key={`hp-${i}`} position={{ lat: p.lat, lng: p.lng }}>
                <div
                  style={{
                    width: 12 * scale, height: 12 * scale, borderRadius: '50%',
                    backgroundColor: color, border: '1.5px solid #fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                  }}
                />
              </AdvancedMarker>
            );
          })}
        </Map>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [heatmapPoints, setHeatmapPoints] = useState([]);

  useEffect(() => {
    Promise.all([adminApi.getDashboard(), adminApi.getAnalytics({ days: 7 })])
      .then(([s, a]) => { setStats(s.data); setAnalytics(a.data); })
      .catch(() => {})
      .finally(() => setLoading(false));

    adminApi.getHeatmap()
      .then(({ data }) => setHeatmapPoints((data || []).filter((p) => p.lat && p.lng)))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-7 w-16 bg-gray-100 rounded" />
                  <div className="h-4 w-28 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const dailyData = analytics?.daily_counts
    ? Object.entries(analytics.daily_counts).map(([date, count]) => ({ date, count }))
    : [];
  const typeData = analytics?.by_type
    ? Object.entries(analytics.by_type).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    : [];
  const statusData = analytics?.by_status
    ? Object.entries(analytics.by_status).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Open Issues" value={stats?.total_open} sub="Awaiting assignment"
          colorClass="bg-red-50 text-red-500" icon={STAT_ICONS.open} />
        <StatCard label="In Progress" value={stats?.total_in_progress} sub="Workers assigned"
          colorClass="bg-blue-50 text-blue-500" icon={STAT_ICONS.inProgress} />
        <StatCard label="Resolved Today" value={stats?.total_resolved_today} sub="Closed today"
          colorClass="bg-green-50 text-green-600" icon={STAT_ICONS.resolved} />
        <StatCard label="Total Issues" value={stats?.total_issues} sub="All time"
          colorClass="bg-purple-50 text-purple-500" icon={STAT_ICONS.total} />
        <StatCard label="Workers Online" value={stats?.total_workers_online} sub="Currently active"
          colorClass="bg-emerald-50 text-emerald-600" icon={STAT_ICONS.workers} />
        <StatCard
          label="Avg Resolution"
          value={stats?.avg_resolution_hours != null ? `${stats.avg_resolution_hours.toFixed(1)}h` : '—'}
          sub="Average time to resolve"
          colorClass="bg-yellow-50 text-yellow-600"
          icon={STAT_ICONS.time}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Issues — Last 7 Days</h2>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">No trend data</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Issues by Type</h2>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Status Pie + Top Wards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Issues by Status</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} innerRadius={35} paddingAngle={3} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={true}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-300 text-sm">No data</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Top Wards by Issue Count</h2>
          {analytics?.top_wards?.length > 0 ? (
            <div className="space-y-2.5">
              {analytics.top_wards.slice(0, 6).map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4 font-bold">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{w.ward}</span>
                      <span className="text-gray-500 font-semibold">{w.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(w.count / analytics.top_wards[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">No ward data</div>
          )}
        </div>
      </div>

      {/* Issue Heatmap */}
      <DashboardMap points={heatmapPoints} />
    </div>
  );
}
