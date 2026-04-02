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

const STATUS_COLORS = {
  open: '#ef4444',
  in_progress: '#f59e0b',
  resolved: '#10b981',
  escalated: '#7c3aed',
};

// ── Issue markers layer ────────────────────────────────────────────────────────
function IssueMarkers({ points }) {
  const [selected, setSelected] = useState(null);

  return (
    <>
      {points.map((p, i) => {
        const color = TYPE_COLORS[p.issue_type] || TYPE_COLORS.other;
        const size = p.weight === 3 ? 20 : p.weight === 2 ? 15 : 11;
        return (
          <AdvancedMarker
            key={`issue-${i}`}
            position={{ lat: p.lat, lng: p.lng }}
            onClick={() => setSelected(selected?.id === p.id ? null : p)}
            zIndex={p.weight === 3 ? 3 : p.weight === 2 ? 2 : 1}
          >
            <div style={{
              width: size, height: size, borderRadius: '50%',
              backgroundColor: color,
              border: '2.5px solid #fff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              cursor: 'pointer',
              transition: 'transform 0.15s',
            }} />
          </AdvancedMarker>
        );
      })}
      {selected && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelected(null)}
          pixelOffset={[0, -12]}
        >
          <div style={{ minWidth: 180, maxWidth: 220, padding: '2px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                backgroundColor: TYPE_COLORS[selected.issue_type] || TYPE_COLORS.other,
              }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
                {TYPE_LABELS[selected.issue_type] || selected.issue_type}
              </span>
            </div>
            {selected.description && (
              <p style={{ fontSize: 12, color: '#374151', marginBottom: 4, lineHeight: 1.4 }}>
                {selected.description.slice(0, 100)}{selected.description.length > 100 ? '…' : ''}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', fontSize: 11 }}>
              <span style={{
                padding: '1px 7px', borderRadius: 99,
                backgroundColor: STATUS_COLORS[selected.status] || '#6b7280',
                color: '#fff', fontWeight: 600, textTransform: 'capitalize',
              }}>
                {(selected.status || 'open').replace('_', ' ')}
              </span>
              <span style={{ color: '#6b7280', alignSelf: 'center' }}>
                Severity: {selected.weight === 3 ? '🔴 High' : selected.weight === 2 ? '🟡 Medium' : '🟢 Low'}
              </span>
            </div>
            {selected.ward_name && (
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>📍 {selected.ward_name}</p>
            )}
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
      {workers.map((w, i) => {
        const initials = (w.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
        return (
          <AdvancedMarker
            key={w.id != null ? `worker-${w.id}` : `worker-idx-${i}`}
            position={{ lat: w.latitude, lng: w.longitude }}
            onClick={() => setSelected(selected?.id === w.id ? null : w)}
            zIndex={w.is_online ? 2 : 1}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              backgroundColor: w.is_online ? '#16a34a' : '#9ca3af',
              border: `3px solid ${w.is_online ? '#bbf7d0' : '#e5e7eb'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
              cursor: 'pointer',
              position: 'relative',
            }}>
              {initials}
              {w.is_online && (
                <span style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 9, height: 9, borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  border: '2px solid #fff',
                }} />
              )}
            </div>
          </AdvancedMarker>
        );
      })}
      {selected && (
        <InfoWindow
          position={{ lat: selected.latitude, lng: selected.longitude }}
          onCloseClick={() => setSelected(null)}
          pixelOffset={[0, -18]}
        >
          <div style={{ minWidth: 180, padding: '2px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                backgroundColor: selected.is_online ? '#16a34a' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {(selected.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: selected.is_online ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
                  {selected.is_online ? '● Online' : '○ Offline'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selected.phone && <span>📞 {selected.phone}</span>}
              {selected.department && <span>🏢 {selected.department}</span>}
              {selected.ward && <span>📍 {selected.ward}</span>}
              {selected.location_updated_at && (
                <span>🕒 Updated {new Date(selected.location_updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ── Pan to user location ───────────────────────────────────────────────────────
function PanToUser({ trigger }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }); map.setZoom(13); },
      () => {},
      { timeout: 8000, maximumAge: 30000 },
    );
  }, [map, trigger]);
  return null;
}

// ── Fit bounds on first load only ─────────────────────────────────────────────
function FitBoundsOnce({ positions, viewKey }) {
  const map = useMap();
  const fittedKey = useRef(null);

  useEffect(() => {
    if (!map || !positions.length) return;
    if (fittedKey.current === viewKey) return; // don't refit when filter changes
    fittedKey.current = viewKey;
    const bounds = new google.maps.LatLngBounds();
    positions.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [map, positions, viewKey]);

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
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = typeFilter ? { issue_type: typeFilter } : {};
      const { data } = await adminApi.getHeatmap(params);
      setIssuePoints((data || []).filter((p) => p.lat && p.lng));
      setLastRefreshed(new Date());
    } catch {}
    setLoading(false);
  }, [typeFilter]);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getWorkerLocations({ online_only: onlineOnly });
      setWorkerPoints((data || []).filter((w) => w.latitude && w.longitude));
      setLastRefreshed(new Date());
    } catch {}
    setLoading(false);
  }, [onlineOnly]);

  useEffect(() => {
    if (view === 'issues') fetchIssues();
    else fetchWorkers();
  }, [view, fetchIssues, fetchWorkers]);

  // Auto-refresh every 30s for workers
  useEffect(() => {
    clearInterval(autoRefreshRef.current);
    if (autoRefresh && view === 'workers') {
      autoRefreshRef.current = setInterval(fetchWorkers, 30000);
    }
    return () => clearInterval(autoRefreshRef.current);
  }, [autoRefresh, view, fetchWorkers]);

  const handleRefresh = () => {
    if (view === 'issues') fetchIssues();
    else fetchWorkers();
  };

  const positions =
    view === 'issues'
      ? issuePoints.map((p) => ({ lat: p.lat, lng: p.lng }))
      : workerPoints.map((w) => ({ lat: w.latitude, lng: w.longitude }));

  const onlineCount = workerPoints.filter((w) => w.is_online).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', gap: '0.75rem' }}>
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-wrap gap-3 items-center flex-shrink-0">
        {/* Tab switcher */}
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

        {/* Issue filter */}
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

        {/* Worker filters */}
        {view === 'workers' && (
          <>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} className="rounded" />
              Online only
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded accent-green-600" />
              <span className={autoRefresh ? 'text-green-600 font-semibold' : ''}>
                {autoRefresh ? '● Live (30s)' : 'Auto-refresh'}
              </span>
            </label>
          </>
        )}

        <div className="flex-1" />

        {/* Stats badge */}
        <div className="text-xs text-gray-500 flex items-center gap-2">
          {view === 'issues' ? (
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
              {issuePoints.length} issues
            </span>
          ) : (
            <>
              <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-semibold">
                {onlineCount} online
              </span>
              <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-semibold">
                {workerPoints.length - onlineCount} offline
              </span>
            </>
          )}
        </div>

        {/* Last refreshed */}
        {lastRefreshed && (
          <span className="text-xs text-gray-400 hidden sm:block">
            Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-1.5 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 12, height: 12 }} className={loading ? 'animate-spin' : ''}>
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
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
          <FitBoundsOnce positions={positions} viewKey={view} />
          <PanToUser trigger={locateTrigger} />
        </Map>

        {/* Floating My Location button */}
        <button
          onClick={() => setLocateTrigger((n) => n + 1)}
          title="Go to my location"
          style={{ position: 'absolute', bottom: 120, right: 12, zIndex: 10 }}
          className="w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth={2.5} style={{ width: 18, height: 18 }}>
            <circle cx="12" cy="12" r="3" fill="#1a56db" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10 }}
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
                <div className="font-semibold text-gray-500 mb-1" style={{ fontSize: 10 }}>SIZE = SEVERITY</div>
                {[['20px', 'High'], ['15px', 'Medium'], ['11px', 'Low']].map(([sz, l]) => (
                  <div key={l} className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-400 flex-shrink-0" style={{ width: sz, height: sz }} />
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
                  <span className="w-5 h-5 rounded-full bg-green-600 flex-shrink-0 border-2 border-green-200" />
                  <span className="text-gray-600">Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-400 flex-shrink-0 border-2 border-gray-200" />
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
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
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
