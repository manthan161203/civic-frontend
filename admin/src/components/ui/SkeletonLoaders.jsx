'use client';

/**
 * The dashboard's own loading shape.
 *
 * `CardSkeleton`, `ListSkeleton` and `FormSkeleton` used to live here too. Their
 * only consumer was `/dashboard/loading-preview`, a dev gallery that was still
 * routed in production builds; both it and they are gone. Anything new should
 * use `Skeleton.jsx`, which is token-driven and honours `prefers-reduced-motion`
 * — these predate it and hardcode blue.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .shimmer {
          animation: shimmer 2s infinite;
          background: linear-gradient(
            to right,
            #ffffff 0%,
            #f0f4f8 50%,
            #ffffff 100%
          );
          background-size: 1000px 100%;
        }
      `}</style>

      {/* Header Skeleton */}
      <div className="space-y-2 mb-6">
        <div className="h-8 w-48 rounded-lg shimmer bg-blue-50" />
        <div className="h-4 w-80 rounded shimmer bg-gray-100" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-5 border border-blue-100 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-24 rounded shimmer bg-blue-100" />
                <div className="h-3 w-16 rounded shimmer bg-gray-100" />
              </div>
              <div className="w-12 h-12 rounded-lg shimmer bg-blue-50" />
            </div>
            <div className="h-8 w-20 rounded shimmer bg-blue-100" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-5 border border-blue-100 shadow-sm">
            <div className="h-5 w-40 rounded shimmer bg-blue-100 mb-6" />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-end gap-2">
                  <div className="flex-1 h-10 rounded shimmer bg-blue-50" />
                  <div className="w-10 h-3 rounded shimmer bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-lg p-5 border border-blue-100 shadow-sm">
        <div className="h-5 w-40 rounded shimmer bg-blue-100 mb-6" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-blue-50 last:border-b-0">
              <div className="w-10 h-10 rounded shimmer bg-blue-50" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded shimmer bg-blue-100" />
                <div className="h-3 w-48 rounded shimmer bg-gray-100" />
              </div>
              <div className="h-8 w-20 rounded shimmer bg-blue-50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
