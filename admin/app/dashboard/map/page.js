'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Map, useMap, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { adminApi } from '../../../src/api/index';

const TYPE_COLORS = {
  roads: '#ef4444',
  water: '#3b82f6',
  electricity: '#f59e0b',
  sanitation: '#10b981',
  parks: '#8b5cf6',
  garbage: '#f97316',
  other: '#6b7280',
};

const TYPE_LABELS = {
  roads: 'Roads',
  water: 'Water',
  electricity: 'Electricity',
  sanitation: 'Sanitation',
  parks: 'Parks',
  garbage: 'Garbage',
  other: 'Other',
};

// ── Issue markers layer ────────────────────────────────────────────────────────
function IssueMarkers({ points }) {
  const [selected, setSelected] = useState(null);

  return (
    <>
      {points.map((p, i) => {
        const color = TYPE_COLORS[p.issue_type] || TYPE_COLORS.other;
        const scale = p.weight === 3 ? 1.3 : p.weight === 2 ? 1.0 : 0.8;
        return (
          <AdvancedMarker
            key={`issue-${i}`}
            position={{ lat: p.lat, lng: p.lng }}
            onClick={() => setSelected(p)}
          >
            <div
              style={{
                width: 16 * scale,
                height: 16 * scale,
                borderRadius: '50%',
                backgroundColor: color,
                border: '2px solid #fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                cursor: 'pointer',
              }}
            />
          </AdvancedMarker>
        );
      })}
      {selected && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelected(null)}
        >
          <div className="text-xs">
            <strong>{TYPE_LABELS[selected.issue_type] || selected.issue_type}</strong>
            <br />
            Severity: {selected.weight === 3 ? 'High' : selected.weight === 2 ? 'Medium' : 'Low'}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ── Worker markers layer ───────────────────────────────────────────────────────
function WorkerMarkers({ workers }) {
  const [selected, setSelected] = useState(null);

  return (
    <>
      {workers.map((w, i) => (
        <AdvancedMarker
          key={`worker-${i}`}
          position={{ lat: w.latitude, lng: w.longitude }}
          onClick={() => setSelected(w)}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: w.is_online ? '#22c55e' : '#9ca3af',
              border: `2px solid ${w.is_online ? '#16a34a' : '#6b7280'}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              cursor: 'pointer',
            }}
          />
        </AdvancedMarker>
      ))}
      {selected && (
        <InfoWindow
          position={{ lat: selected.latitude, lng: selected.longitude }}
          onCloseClick={() => setSelected(null)}
        >
          <div className="text-xs">
            <strong>{selected.name}</strong>
            <br />
            {selected.ward || '—'} · {selected.department || '—'}
            <br />
            {selected.is_online ? '● Online' : '○ Offline'}
            {selected.location_updated_at && (
              <>
                <br />
                Updated:{' '}
                {new Date(selected.location_updated_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ── Auto-fit bounds helper ─────────────────────────────────────────────────────
function FitBounds({ positions }) {
  const map = useMap();
  const prevLen = useRef(0);

  useEffect(() => {
    if (!map || !positions.length) return;
    if (positions.length === prevLen.current) return;
    prevLen.current = positions.length;
    const bounds = new google.maps.LatLngBounds();
    positions.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, positions]);

  return null;
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MapPage() {
  const [view, setView] = useState('issues');
  const [typeFilter, setTypeFilter] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [issuePoints, setIssuePoints] = useState([]);
  const [workerPoints, setWorkerPoints] = useState([]);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = typeFilter ? { issue_type: typeFilter } : {};
      const { data } = await adminApi.getHeatmap(params);
      setIssuePoints((data || []).filter((p) => p.lat && p.lng));
    } catch {}
    setLoading(false);
  }, [typeFilter]);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getWorkerLocations({ online_only: onlineOnly });
      setWorkerPoints((data || []).filter((w) => w.latitude && w.longitude));
    } catch {}
    setLoading(false);
  }, [onlineOnly]);

  useEffect(() => {
    if (view === 'issues') fetchIssues();
    else fetchWorkers();
  }, [view, fetchIssues, fetchWorkers]);

  const handleRefresh = () => {
    if (view === 'issues') fetchIssues();
    else fetchWorkers();
  };

  const positions =
    view === 'issues'
      ? issuePoints.map((p) => ({ lat: p.lat, lng: p.lng }))
      : workerPoints.map((w) => ({ lat: w.latitude, lng: w.longitude }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', gap: '0.75rem' }}>
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-wrap gap-3 items-center flex-shrink-0">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setView('issues')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${view === 'issues' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Issue Heatmap
          </button>
          <button
            onClick={() => setView('workers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${view === 'workers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Worker Locations
          </button>
        </div>

        {view === 'issues' && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-400 bg-white"
          >
            <option value="">All issue types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        )}

        {view === 'workers' && (
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlineOnly}
              onChange={(e) => setOnlineOnly(e.target.checked)}
              className="rounded"
            />
            Online only
          </label>
        )}

        <div className="flex-1" />

        <span className="text-xs text-gray-400">
          {view === 'issues' ? `${issuePoints.length} active issues` : `${workerPoints.length} workers plotted`}
        </span>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-1.5 transition-colors"
        >
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            style={{ width: 12, height: 12 }}
            className={loading ? 'animate-spin' : ''}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }} className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <Map
          defaultCenter={{ lat: 22.3072, lng: 70.8022 }}
          defaultZoom={7}
          mapId="civic-admin-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          {view === 'issues' && <IssueMarkers points={issuePoints} />}
          {view === 'workers' && <WorkerMarkers workers={workerPoints} />}
          <FitBounds positions={positions} />
        </Map>

        {/* Legend */}
        <div
          style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10 }}
          className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 text-xs"
        >
          {view === 'issues' ? (
            <>
              <div className="font-bold text-gray-700 mb-2 uppercase tracking-wide" style={{ fontSize: 10 }}>Issue Types</div>
              <div className="space-y-1">
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[k] }} />
                    <span className="text-gray-600">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                <div className="font-semibold text-gray-500 mb-1" style={{ fontSize: 10 }}>SEVERITY (dot size)</div>
                {[['Large', 'High'], ['Medium', 'Medium'], ['Small', 'Low']].map(([s, l]) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-400 flex-shrink-0" style={{ width: s === 'Large' ? 14 : s === 'Medium' ? 10 : 7, height: s === 'Large' ? 14 : s === 'Medium' ? 10 : 7 }} />
                    <span className="text-gray-500">{l}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="font-bold text-gray-700 mb-2 uppercase tracking-wide" style={{ fontSize: 10 }}>Workers</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-gray-600">Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">Offline</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20 }} className="bg-white/30 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-lg px-4 py-3 text-sm text-gray-700 font-medium flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 16, height: 16 }} className="animate-spin text-blue-500">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              Loading map data…
            </div>
          </div>
        )}

        {/* No data notice */}
        {!loading && positions.length === 0 && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
            <div className="bg-white rounded-xl shadow-lg px-4 py-2.5 text-sm text-gray-500 font-medium">
              No {view === 'issues' ? 'active issues' : 'workers'} to display
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
