'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
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

export default function MapPage() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);

  const [view, setView] = useState('issues');
  const [typeFilter, setTypeFilter] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ issues: 0, workers: 0 });
  const [mapReady, setMapReady] = useState(false);

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  };

  const fetchIssues = useCallback(async () => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    setLoading(true);
    clearMarkers();
    try {
      const params = typeFilter ? { issue_type: typeFilter } : {};
      const { data } = await adminApi.getHeatmap(params);
      const points = (data || []).filter((p) => p.lat && p.lng);
      setCounts((c) => ({ ...c, issues: points.length }));

      const RADIUS = { 3: 14, 2: 10, 1: 7 };
      points.forEach((p) => {
        const color = TYPE_COLORS[p.issue_type] || TYPE_COLORS.other;
        const m = L.circleMarker([p.lat, p.lng], {
          radius: RADIUS[p.weight] || 8,
          fillColor: color,
          color: '#fff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.8,
        });
        const typeLabel = TYPE_LABELS[p.issue_type] || p.issue_type || 'Issue';
        const sev = p.weight === 3 ? 'High' : p.weight === 2 ? 'Medium' : 'Low';
        m.bindTooltip(`<strong>${typeLabel}</strong><br/>Severity: ${sev}`, { direction: 'top' });
        m.addTo(map);
        markersRef.current.push(m);
      });

      if (points.length > 0) {
        try {
          const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } catch {}
      }
    } catch {}
    setLoading(false);
  }, [typeFilter]);

  const fetchWorkers = useCallback(async () => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    setLoading(true);
    clearMarkers();
    try {
      const { data } = await adminApi.getWorkerLocations({ online_only: onlineOnly });
      const workers = (data || []).filter((w) => w.latitude && w.longitude);
      setCounts((c) => ({ ...c, workers: workers.length }));

      workers.forEach((w) => {
        const color = w.is_online ? '#22c55e' : '#9ca3af';
        const border = w.is_online ? '#16a34a' : '#6b7280';
        const m = L.circleMarker([w.latitude, w.longitude], {
          radius: 10,
          fillColor: color,
          color: border,
          weight: 2,
          fillOpacity: 0.9,
        });
        const updated = w.location_updated_at
          ? new Date(w.location_updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : '—';
        m.bindTooltip(
          `<strong>${w.name}</strong><br/>${w.ward || '—'} · ${w.department || '—'}<br/>${w.is_online ? '● Online' : '○ Offline'}<br/>Updated: ${updated}`,
          { direction: 'top' }
        );
        m.addTo(map);
        markersRef.current.push(m);
      });

      if (workers.length > 0) {
        try {
          const bounds = L.latLngBounds(workers.map((w) => [w.latitude, w.longitude]));
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } catch {}
      }
    } catch {}
    setLoading(false);
  }, [onlineOnly]);

  // Initialize Leaflet map once
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return;

    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((L) => {
      if (mapRef.current || !containerRef.current) return;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      leafletRef.current = L;
      setMapReady(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        leafletRef.current = null;
      }
    };
  }, []);

  // Reload when map is ready or filters change
  useEffect(() => {
    if (!mapReady) return;
    if (view === 'issues') fetchIssues();
    else fetchWorkers();
  }, [mapReady, view, fetchIssues, fetchWorkers]);

  const handleRefresh = () => {
    if (view === 'issues') fetchIssues();
    else fetchWorkers();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', gap: '0.75rem' }}>
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-wrap gap-3 items-center flex-shrink-0">
        {/* Toggle */}
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

        {/* Filters */}
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
          {view === 'issues' ? `${counts.issues} active issues` : `${counts.workers} workers plotted`}
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
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Legend */}
        <div
          style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1000 }}
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
          <div style={{ position: 'absolute', inset: 0, zIndex: 999 }} className="bg-white/30 flex items-center justify-center">
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
        {!loading && ((view === 'issues' && counts.issues === 0) || (view === 'workers' && counts.workers === 0)) && mapReady && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 999 }}>
            <div className="bg-white rounded-xl shadow-lg px-4 py-2.5 text-sm text-gray-500 font-medium">
              No {view === 'issues' ? 'active issues' : 'workers'} to display
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
