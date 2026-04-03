'use client';
import { useEffect, useState } from 'react';
import { publicApi } from '../../../src/api/index';

const MEDAL = ['🥇', '🥈', '🥉'];

function ScoreBar({ value, max = 100, color }) {
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden" style={{ width: 80 }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }} />
    </div>
  );
}

export default function LeaderboardPage() {
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    publicApi.getLeaderboard({ limit: 50, days })
      .then(({ data }) => setWards(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ward Health Leaderboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Rankings based on resolution rate, speed, and citizen ratings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Period:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : wards.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-semibold">No ward data available</p>
          <p className="text-sm mt-1">Needs at least 3 issues per ward in the selected period</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4">
            {wards.slice(0, 3).map((w, i) => {
              const color = i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#cd7f32';
              return (
                <div key={w.ward} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                  <span className="text-3xl">{MEDAL[i]}</span>
                  <h3 className="font-bold text-gray-900 mt-2 text-sm truncate">{w.ward}</h3>
                  <div className="text-3xl font-black mt-1" style={{ color }}>{w.score}</div>
                  <p className="text-xs text-gray-500 mt-1">{w.total_issues} issues · {w.resolution_rate}% resolved</p>
                </div>
              );
            })}
          </div>

          {/* Full Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Ward</th>
                  <th className="px-4 py-3 text-center font-semibold">Score</th>
                  <th className="px-4 py-3 text-center font-semibold">Issues</th>
                  <th className="px-4 py-3 text-center font-semibold">Resolution %</th>
                  <th className="px-4 py-3 text-center font-semibold">Avg Speed</th>
                  <th className="px-4 py-3 text-center font-semibold">Speed Score</th>
                  <th className="px-4 py-3 text-center font-semibold">Avg Rating</th>
                  <th className="px-4 py-3 text-center font-semibold">Rating Score</th>
                </tr>
              </thead>
              <tbody>
                {wards.map((w) => {
                  const scoreColor = w.score >= 75 ? '#059669' : w.score >= 50 ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={w.ward} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-bold text-gray-400">{w.rank}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{w.ward}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block font-bold px-2.5 py-0.5 rounded-full text-xs" style={{
                          backgroundColor: scoreColor + '15', color: scoreColor,
                        }}>{w.score}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{w.total_issues}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-gray-700 font-medium">{w.resolution_rate}%</span>
                          <ScoreBar value={w.resolution_rate} color="#3b82f6" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{w.avg_resolve_hours}h</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-gray-700 font-medium">{w.speed_score}</span>
                          <ScoreBar value={w.speed_score} color="#10b981" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {'⭐'.repeat(Math.round(w.avg_rating))} {w.avg_rating}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-gray-700 font-medium">{w.rating_score}</span>
                          <ScoreBar value={w.rating_score} color="#f59e0b" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
