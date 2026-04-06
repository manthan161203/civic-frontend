'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';

export default function LeaderboardPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [filterType, setFilterType] = useState('points');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError('');
    adminApi
      .getWorkerLeaderboard()
      .then(({ data }) => {
        console.log('Leaderboard API Response:', data);
        let filtered = Array.isArray(data) ? data : (data.items || []);
        console.log('Filtered workers:', filtered);
        
        if (filterType === 'issues') {
          filtered = filtered.sort((a, b) => (b.tasks_resolved || 0) - (a.tasks_resolved || 0));
        } else if (filterType === 'rating') {
          filtered = filtered.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
        } else {
          filtered = filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
        }

        setWorkers(filtered);
        setPage(1);
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load leaderboard')))
      .finally(() => setLoading(false));
  }, [period, filterType]);

  const displayWorkers = workers.slice((page - 1) * 10, page * 10);
  const totalPages = Math.ceil(workers.length / 10);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900">Worker Leaderboard</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Top performing workers by period and metric</p>
      </div>

      <div className="flex gap-2">
        {['weekly', 'monthly', 'alltime'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p === 'weekly' ? 'This Week' : p === 'monthly' ? 'This Month' : 'All Time'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 bg-white rounded-lg shadow-sm p-2 border border-gray-100">
        {[
          { value: 'points', label: 'Points', icon: 'star' },
          { value: 'issues', label: 'Issues Resolved', icon: 'check' },
          { value: 'rating', label: 'Rating', icon: 'trending' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterType(filter.value)}
            className={`flex-1 px-3 py-2 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
              filterType === filter.value
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {filter.icon === 'star' && (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
            {filter.icon === 'check' && (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            )}
            {filter.icon === 'trending' && (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 6l2.29 2.29-4.58 4.58-4-4L2 16.86 3.41 18.27 9.41 12.27l4 4 6.3-6.29L22 12v-6z" />
              </svg>
            )}
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : displayWorkers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500 font-medium">No workers found</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {displayWorkers.map((worker, idx) => {
              const rank = (page - 1) * 10 + idx + 1;
              const isTopThree = rank <= 3;
              const uniqueKey = worker.id || `worker-${idx}-${page}`;

              return (
                <div
                  key={uniqueKey}
                  className={`border rounded-lg p-4 ${
                    isTopThree ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className={`text-2xl font-bold ${rank <= 3 ? 'text-yellow-600' : 'text-gray-700'}`}>
                        {rank === 1 ? (
                          <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ) : rank === 2 ? (
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ) : rank === 3 ? (
                          <svg className="w-6 h-6 text-orange-700" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ) : (
                          rank
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">
                        {worker.name || `Worker ${worker.id.slice(0, 8)}`}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">{worker.phone}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                          {worker.tasks_resolved || 0} issues
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          {worker.avg_rating ? worker.avg_rating.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <div className={`text-2xl font-bold ${rank <= 3 ? 'text-yellow-600' : 'text-blue-600'}`}>
                        {filterType === 'issues'
                          ? worker.tasks_resolved || 0
                          : filterType === 'rating'
                          ? (worker.avg_rating || 0).toFixed(1)
                          : worker.score || 0}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {filterType === 'issues' ? 'resolved' : filterType === 'rating' ? 'rating' : 'points'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <p className="text-sm text-gray-600">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
