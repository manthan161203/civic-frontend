'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    adminApi.getAnalytics({ days })
      .then(({ data: d }) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  // daily_counts is a Dict<date_str, count> — convert to array for Recharts
  const daily = data?.daily_counts
    ? Object.entries(data.daily_counts).map(([date, count]) => ({ date, count }))
    : [];
  const byType = data?.by_type
    ? Object.entries(data.by_type).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    : [];
  const byStatus = data?.by_status
    ? Object.entries(data.by_status).map(([name, value]) => ({ name, value }))
    : [];
  const byPriority = data?.by_priority
    ? Object.entries(data.by_priority).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      {/* Time Range */}
      <div className="flex gap-2">
        {[7, 14, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${days === d ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {d}d
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Loading analytics…</div>
      ) : (
        <>
          {/* Daily Trend */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-4">Daily Issue Volume — Last {days} days</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Issues" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Type */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">By Issue Type</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* By Status */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">By Status</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Priority */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">By Priority</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byPriority}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {byPriority.map((entry, i) => {
                      const c = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', critical: '#7c3aed' };
                      return <Cell key={i} fill={c[entry.name] || '#3b82f6'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Wards */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">Top Wards by Issue Count</h2>
              {data?.top_wards?.length > 0 ? (
                <div className="space-y-3">
                  {data.top_wards.slice(0, 8).map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4 font-bold">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 capitalize">{w.ward}</span>
                          <span className="text-gray-400">{w.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(w.count / data.top_wards[0].count) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-300 text-sm mt-8">No ward data</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
