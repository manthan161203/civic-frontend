'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Map, useMap, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { adminApi } from '../../../src/api/index';
import { logger } from '../../../src/lib/logger';
import { getErrorMessage } from '../../../src/api/errors';
import { useUiStore } from '../../../src/store/uiStore';
import Spinner from '@/components/ui/Spinner';
import SvgIcon from '@/components/ui/SvgIcon';

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
        // SOS issues: flashing red star
        if (p.is_sos) {
          return (
            <AdvancedMarker
              key={`sos-${i}`}
              position={{ lat: p.lat, lng: p.lng }}
              onClick={() => setSelected(selected?.id === p.id ? null : p)}
              zIndex={10}
            >
              <div style={{
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}>
                <svg viewBox="0 0 24 24" fill="#ff0000" stroke="#fff" strokeWidth={1} style={{ width: 24, height: 24 }}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <style>{`
                @keyframes pulse {
                  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(255, 0, 0, 0.8)); }
                  50% { transform: scale(1.2); filter: drop-shadow(0 0 8px rgba(255, 0, 0, 1)); }
                }
              `}</style>
            </AdvancedMarker>
          );
        }

        // Regular issues: colored circles
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {selected.is_sos ? (
                  <svg viewBox="0 0 24 24" fill="#ff0000" style={{ width: 12, height: 12, flexShrink: 0 }}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ) : (
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: TYPE_COLORS[selected.issue_type] || TYPE_COLORS.other,
                  }} />
                )}
                <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
                  {TYPE_LABELS[selected.issue_type] || selected.issue_type}
                </span>
              </div>
              {selected.is_sos && (
                <span style={{
                  padding: '1px 6px', borderRadius: 4, backgroundColor: '#ff0000', color: '#fff',
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase'
                }}>
                  SOS
                </span>
              )}
            </div>
            {selected.description && (
              <p style={{ fontSize: 12, color: '#374151', marginBottom: 4, lineHeight: 1.4 }}>
                {selected.description.slice(0, 100)}{selected.description.length > 100 ? '…' : ''}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', fontSize: 11, marginBottom: 4 }}>
              <span style={{
                padding: '1px 7px', borderRadius: 99,
                backgroundColor: STATUS_COLORS[selected.status] || '#6b7280',
                color: '#fff', fontWeight: 600, textTransform: 'capitalize',
              }}>
                {(selected.status || 'open').replace('_', ' ')}
              </span>
              <span style={{ color: '#6b7280', alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>Severity:</span>
                {selected.weight === 3 ? (
                  <svg viewBox="0 0 24 24" fill="#ef4444" style={{ width: 12, height: 12 }}><circle cx="12" cy="12" r="10" /></svg>
                ) : selected.weight === 2 ? (
                  <svg viewBox="0 0 24 24" fill="#f59e0b" style={{ width: 12, height: 12 }}><circle cx="12" cy="12" r="10" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="#10b981" style={{ width: 12, height: 12 }}><circle cx="12" cy="12" r="10" /></svg>
                )}
                <span>{selected.weight === 3 ? 'High' : selected.weight === 2 ? 'Medium' : 'Low'}</span>
              </span>
            </div>
            {selected.address && (
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2, display: 'flex', alignItems: 'start', gap: 4 }}>
                <svg viewBox="0 0 24 24" fill="#6b7280" style={{ width: 12, height: 12, marginTop: 1, flexShrink: 0 }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                </svg>
                <span>{selected.address}</span>
              </p>
            )}
            {selected.ward_name && (
              <p style={{ fontSize: 11, color: '#9ca3af' }}>
                Ward: <strong style={{ color: '#6b7280' }}>{selected.ward_name}</strong>
              </p>
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
                <div style={{ fontSize: 11, color: selected.is_online ? '#16a34a' : '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 8, height: 8 }}>
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  {selected.is_online ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selected.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg viewBox="0 0 24 24" fill="#6b7280" style={{ width: 12, height: 12 }}><path d="M17.92 7.02C17.45 6.18 16.51 5.55 15.43 5.55c-1.08 0-2.02.63-2.49 1.47C12.25 5.82 11.01 5 9.5 5C7.57 5 6 6.57 6 8.5c0 5.08 5.25 9.5 9.5 9.5s9.5-4.42 9.5-9.5c0-1.25-.25-2.45-.58-3.48zM9.5 17c-4 0-7.5-3-7.5-7.5C2 8.04 4.5 5.5 8 5.5c1.5 0 2.8.5 3.8 1.3-.5.6-.8 1.4-.8 2.2 0 2.2 1.8 4 4 4s4-1.8 4-4c0-.8-.3-1.6-.8-2.2 1 1 1.8 2.3 1.8 3.9 0 4.5-3.5 7.5-7.5 7.5z" /></svg>
                  {selected.phone}
                </span>
              )}
              {selected.department && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg viewBox="0 0 24 24" fill="#6b7280" style={{ width: 12, height: 12 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" /></svg>
                  {selected.department}
                </span>
              )}
              {selected.ward && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg viewBox="0 0 24 24" fill="#6b7280" style={{ width: 12, height: 12 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" /></svg>
                  {selected.ward}
                </span>
              )}
              {selected.location_updated_at && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg viewBox="0 0 24 24" fill="#6b7280" style={{ width: 12, height: 12 }}><path d="M11.99 5V1h2v4h4v2h-4v4h-2V7h-4V5h4zm-7 8.5c0-2.64 2.05-4.78 4.65-4.99V7c-3.87.22-7 3.68-7 7.5s3.13 7.28 7 7.5v-1.51c-2.6-.21-4.65-2.35-4.65-4.99zm7 4.99v1.51c3.87-.22 7-3.63 7-7.5s-3.13-7.28-7-7.5V5c2.6.21 4.65 2.35 4.65 4.99 0 2.64-2.05 4.78-4.65 4.99z" /></svg>
                  Updated {new Date(selected.location_updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
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
  const addToast = useUiStore((state) => state.addToast);
  const [view, setView] = useState('issues');
  const [typeFilter, setTypeFilter] = useState('');
  const [sosOnly, setSosOnly] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [issuePoints, setIssuePoints] = useState([]);
  const [workerPoints, setWorkerPoints] = useState([]);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef(null);

  // Time Machine state
  const [tmSnapshots, setTmSnapshots] = useState([]);
  const [tmIndex, setTmIndex] = useState(0);
  const [tmStartDate, setTmStartDate] = useState('');
  const [tmEndDate, setTmEndDate] = useState('');
  const [tmPlaying, setTmPlaying] = useState(false);
  const tmIntervalRef = useRef(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = typeFilter ? { issue_type: typeFilter } : {};
      const { data } = await adminApi.getHeatmap(params);
      let points = (data || []).filter((p) => p.lat && p.lng);
      if (sosOnly) {
        points = points.filter((p) => p.is_sos);
      }
      setIssuePoints(points);
      setLastRefreshed(new Date());
    } catch (err) {
      // Was `catch {}` — a failed heatmap fetch left the previous points on the
      // map with a stale "last refreshed" time and no indication anything
      // had gone wrong.
      logger.error('Map', 'Heatmap fetch failed', err);
      addToast(getErrorMessage(err, 'Could not refresh the heatmap'), 'error');
    }
    setLoading(false);
  }, [typeFilter, sosOnly, addToast]);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getWorkerLocations({ online_only: onlineOnly });
      setWorkerPoints((data || []).filter((w) => w.latitude && w.longitude));
      setLastRefreshed(new Date());
    } catch (err) {
      logger.error('Map', 'Worker locations fetch failed', err);
      addToast(getErrorMessage(err, 'Could not refresh worker locations'), 'error');
    }
    setLoading(false);
  }, [onlineOnly, addToast]);

  useEffect(() => {
    if (view === 'issues') fetchIssues();
    else if (view === 'workers') fetchWorkers();
  }, [view, fetchIssues, fetchWorkers]);

  // Time Machine fetch
  const fetchTimeMachine = useCallback(async () => {
    if (!tmStartDate || !tmEndDate) return;
    setLoading(true);
    try {
      const { data } = await adminApi.getHeatmapTimeMachine({
        start_date: tmStartDate,
        end_date: tmEndDate,
        interval_days: 1,
        ...(typeFilter && { issue_type: typeFilter }),
      });
      setTmSnapshots(data || []);
      setTmIndex(0);
      setLastRefreshed(new Date());
    } catch (e) {
      /*
       * Was `catch {}`, and this one was genuinely misleading: the previous
       * date range's snapshots stayed on the map with the *new* dates showing
       * in the controls above them. The map looked like it had answered the
       * question it was asked.
       */
      logger.error('Map', 'Time-machine snapshots failed to load', e);
      setTmSnapshots([]);
      addToast(getErrorMessage(e, 'Could not load history for that date range.'), 'error');
    }
    setLoading(false);
  }, [tmStartDate, tmEndDate, typeFilter, addToast]);

  useEffect(() => {
    if (view === 'timemachine') fetchTimeMachine();
  }, [view, fetchTimeMachine]);

  // Time Machine playback
  useEffect(() => {
    clearInterval(tmIntervalRef.current);
    if (tmPlaying && tmSnapshots.length > 1) {
      tmIntervalRef.current = setInterval(() => {
        setTmIndex((i) => {
          if (i >= tmSnapshots.length - 1) {
            setTmPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 800);
    }
    return () => clearInterval(tmIntervalRef.current);
  }, [tmPlaying, tmSnapshots.length]);

  // Set default time machine dates (last 14 days)
  useEffect(() => {
    if (!tmStartDate) {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 14);
      setTmStartDate(start.toISOString().split('T')[0]);
      setTmEndDate(end.toISOString().split('T')[0]);
    }
  }, [tmStartDate]);

  const tmCurrentPoints = tmSnapshots[tmIndex]?.points || [];

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
      : view === 'workers'
      ? workerPoints.map((w) => ({ lat: w.latitude, lng: w.longitude }))
      : tmCurrentPoints.map((p) => ({ lat: p.lat, lng: p.lng }));

  const onlineCount = workerPoints.filter((w) => w.is_online).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', gap: '0.75rem' }}>
      {/* Controls */}
      <div className="bg-surface rounded-card border border-divider p-3 flex flex-wrap gap-3 items-center flex-shrink-0">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-surface-alt p-1 rounded-lg">
          <button
            onClick={() => setView('issues')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${view === 'issues' ? 'bg-surface text-ink shadow-sm' : 'text-ink-subtle hover:text-ink-muted'}`}
          >
            Issue Heatmap
          </button>
          <button
            onClick={() => setView('workers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${view === 'workers' ? 'bg-surface text-ink shadow-sm' : 'text-ink-subtle hover:text-ink-muted'}`}
          >
            Worker Locations
          </button>
          <button
            onClick={() => setView('timemachine')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${view === 'timemachine' ? 'bg-surface text-ink shadow-sm' : 'text-ink-subtle hover:text-ink-muted'}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
            Time Machine
          </button>
        </div>

        {/* Issue filter */}
        {view === 'issues' && (
          <>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary bg-surface"
            >
              <option value="">All issue types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-danger cursor-pointer select-none font-semibold">
              <input type="checkbox" checked={sosOnly} onChange={(e) => setSosOnly(e.target.checked)} className="rounded accent-[var(--color-danger)]" />
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
                <path d="M12 2L1 21h22L12 2zm1 16h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
              SOS Only
            </label>
          </>
        )}

        {/* Worker filters */}
        {view === 'workers' && (
          <>
            <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer select-none">
              <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} className="rounded" />
              Online only
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer select-none">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded accent-[var(--color-success)]" />
              <span className={autoRefresh ? 'text-success font-semibold flex items-center gap-2' : ''}>
                {autoRefresh && (
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 8, height: 8 }}>
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
                {autoRefresh ? 'Live (30s)' : 'Auto-refresh'}
              </span>
            </label>
          </>
        )}

        {/* Time Machine controls */}
        {view === 'timemachine' && (
          <>
            <input type="date" value={tmStartDate} onChange={(e) => setTmStartDate(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary bg-surface" />
            <span className="text-xs text-ink-subtle">to</span>
            <input type="date" value={tmEndDate} onChange={(e) => setTmEndDate(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary bg-surface" />
            <button onClick={fetchTimeMachine}
              className="px-3 py-1.5 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent transition-colors">
              Load
            </button>
            {tmSnapshots.length > 1 && (
              <>
                <button onClick={() => setTmPlaying(!tmPlaying)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tmPlaying ? 'bg-danger text-white hover:bg-danger' : 'bg-success text-white hover:bg-success'}`}>
                  <span className="inline-flex items-center gap-1.5">
                    {tmPlaying
                      ? <><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>Pause</>
                      : <><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Play</>}
                  </span>
                </button>
                <input type="range" min={0} max={tmSnapshots.length - 1} value={tmIndex}
                  onChange={(e) => { setTmPlaying(false); setTmIndex(Number(e.target.value)); }}
                  className="w-32 accent-[var(--color-accent)]" />
                <span className="text-xs font-mono text-accent bg-accent-soft px-2 py-1 rounded">
                  {tmSnapshots[tmIndex]?.date || '—'} ({tmSnapshots[tmIndex]?.active_count ?? 0})
                </span>
              </>
            )}
          </>
        )}

        <div className="flex-1" />

        {/* Stats badge */}
        <div className="text-xs text-ink-subtle flex items-center gap-2">
          {view === 'issues' ? (
            <span className="bg-primary-soft text-primary-strong px-2.5 py-1 rounded-full font-semibold">
              {issuePoints.length} issues
            </span>
          ) : view === 'workers' ? (
            <>
              <span className="bg-success-soft text-success px-2.5 py-1 rounded-full font-semibold">
                {onlineCount} online
              </span>
              <span className="bg-surface-alt text-ink-subtle px-2.5 py-1 rounded-full font-semibold">
                {workerPoints.length - onlineCount} offline
              </span>
            </>
          ) : tmSnapshots.length > 0 ? (
            <span className="bg-accent-soft text-accent px-2.5 py-1 rounded-full font-semibold">
              {tmSnapshots.length} snapshots
            </span>
          ) : null}
        </div>

        {/* Last refreshed */}
        {lastRefreshed && (
          <span className="text-xs text-ink-subtle hidden sm:block">
            Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-60 flex items-center gap-1.5 transition-colors"
        >
          {loading ? (
            <Spinner size="sm" label={null} className="!w-3 !h-3" />
          ) : (
            <SvgIcon name="chevronDown" size={12} className="rotate-90" />
          )}
          Refresh
        </button>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }} className="rounded-xl overflow-hidden shadow-sm border border-divider">
        <Map
          defaultCenter={{ lat: 22.2587, lng: 71.1924 }}
          defaultZoom={7}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          {view === 'issues' && <IssueMarkers points={issuePoints} />}
          {view === 'workers' && <WorkerMarkers workers={workerPoints} />}
          {view === 'timemachine' && <IssueMarkers points={tmCurrentPoints} />}
          <FitBoundsOnce positions={positions} viewKey={view} />
          <PanToUser trigger={locateTrigger} />
        </Map>

        {/* Floating My Location button */}
        <button
          onClick={() => setLocateTrigger((n) => n + 1)}
          title="Go to my location"
          style={{ position: 'absolute', bottom: 120, right: 12, zIndex: 10 }}
          className="w-10 h-10 bg-surface rounded-full shadow-lg border border-border flex items-center justify-center hover:bg-surface-alt transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth={2.5} style={{ width: 18, height: 18 }}>
            <circle cx="12" cy="12" r="3" fill="#1a56db" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10 }}
          className="bg-surface/95 backdrop-blur-sm rounded-xl shadow-lg p-3 text-xs"
        >
          {view === 'issues' ? (
            <>
              <div className="font-bold text-ink-muted mb-2 uppercase tracking-wide" style={{ fontSize: 10 }}>Issue Types</div>
              <div className="space-y-1">
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[k] }} />
                    <span className="text-ink-muted">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-divider space-y-1">
                <div className="font-semibold text-ink-subtle mb-1" style={{ fontSize: 10 }}>SIZE = SEVERITY</div>
                {[['20px', 'High'], ['15px', 'Medium'], ['11px', 'Low']].map(([sz, l]) => (
                  <div key={l} className="flex items-center gap-2">
                    <span className="rounded-full bg-ink-subtle flex-shrink-0" style={{ width: sz, height: sz }} />
                    <span className="text-ink-subtle">{l}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="font-bold text-ink-muted mb-2 uppercase tracking-wide" style={{ fontSize: 10 }}>Workers</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-success flex-shrink-0 border-2 border-success/30" />
                  <span className="text-ink-muted">Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-ink-subtle flex-shrink-0 border-2 border-border" />
                  <span className="text-ink-muted">Offline</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20 }} className="bg-surface/30 flex items-center justify-center">
            <div className="bg-surface rounded-xl shadow-lg px-4 py-3 text-sm text-ink-muted font-medium flex items-center gap-2">
              <Spinner size="sm" label={null} className="text-primary" />
              Loading map data…
            </div>
          </div>
        )}

        {/* No data notice */}
        {!loading && positions.length === 0 && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
            <div className="bg-surface rounded-xl shadow-lg px-4 py-2.5 text-sm text-ink-subtle font-medium">
              No {view === 'issues' ? 'active issues' : view === 'workers' ? 'workers' : 'data for selected range'} to display
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
