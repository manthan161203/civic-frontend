'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { locationsApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';
import { useUiStore } from '../../../src/store/uiStore';
import { useAuthStore } from '../../../src/store/authStore';
import LoadingButton from '../../../src/components/ui/LoadingButton';

// ── Ward Map Picker (Google Maps) ────────────────────────────────────────────
// Defined outside LocationsPage so React never unmounts it during re-renders.

function DraggableMarker({ position, onDragEnd }) {
  return (
    <AdvancedMarker position={position} draggable onDragEnd={onDragEnd} />
  );
}

function ClickHandler({ onSetLat, onSetLon, onManualSet }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', (e) => {
      onSetLat(e.latLng.lat());
      onSetLon(e.latLng.lng());
      onManualSet?.();
    });
    return () => listener.remove();
  }, [map, onSetLat, onSetLon, onManualSet]);
  return null;
}

function PanToCoords({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (!map || lat == null || lon == null) return;
    map.panTo({ lat, lng: lon });
    if (map.getZoom() < 12) map.setZoom(14);
  }, [map, lat, lon]);
  return null;
}

function WardMapPicker({ lat, lon, onSetLat, onSetLon, onManualSet, fallbackCenter }) {
  const hasCoords = lat != null && lon != null;
  const defaultC = hasCoords ? { lat, lng: lon } : (fallbackCenter || { lat: 22.2587, lng: 71.1924 });
  const defaultZ = hasCoords ? 14 : fallbackCenter ? 11 : 8;
  const handleDragEnd = useCallback((e) => {
    onSetLat(e.latLng.lat());
    onSetLon(e.latLng.lng());
    onManualSet?.();
  }, [onSetLat, onSetLon, onManualSet]);

  return (
    <div style={{ height: '220px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <Map
        defaultCenter={defaultC}
        defaultZoom={defaultZ}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        style={{ width: '100%', height: '100%' }}
      >
        {hasCoords && (
          <DraggableMarker position={{ lat, lng: lon }} onDragEnd={handleDragEnd} />
        )}
        <ClickHandler onSetLat={onSetLat} onSetLon={onSetLon} onManualSet={onManualSet} />
        <PanToCoords lat={lat} lon={lon} />
      </Map>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LocationsPage() {
  const { user } = useAuthStore();
  const { addToast } = useUiStore();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [adding, setAdding] = useState(null); // { type, parentId, parentName, grandparentName }
  const [editing, setEditing] = useState(null); // { type, id, currentName, currentWardNumber, talukaName, districtName }
  const [newName, setNewName] = useState('');
  const [newWardNumber, setNewWardNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [wardLat, setWardLat] = useState(null);
  const [wardLon, setWardLon] = useState(null);
  const [geoStatus, setGeoStatus] = useState(null); // null | 'fetching' | 'success' | 'failed'
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const geocodingRef = useRef(false);

  useEffect(() => {
    locationsApi.getTree()
      .then(({ data }) => setTree(data.districts || data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const reloadTree = async () => {
    try {
      const { data } = await locationsApi.getTree();
      setTree(data.districts || data);
    } catch (err) {
      console.error('Failed to reload location tree:', err);
      alert('Failed to reload locations. Please refresh the page.');
    }
  };

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const resetWardCoords = () => {
    geocodingRef.current = false;
    setWardLat(null);
    setWardLon(null);
    setGeoStatus(null);
  };

  const openAdd = (type, parentId, parentName, grandparentName = null, parentLat = null, parentLon = null) => {
    setAdding({ type, parentId, parentName, grandparentName, parentLat, parentLon });
    setNewName('');
    setNewWardNumber('');
    setSuggestions([]);
    setShowSuggestions(false);
    resetWardCoords();
  };

  const openEdit = (
    type, id, currentName,
    currentWardNumber = null,
    centroid_lat = null, centroid_lon = null,
    talukaName = null, districtName = null,
  ) => {
    setEditing({ type, id, currentName, currentWardNumber, talukaName, districtName });
    setNewName(currentName);
    setNewWardNumber(currentWardNumber || '');
    setSuggestions([]);
    setShowSuggestions(false);
    setWardLat(centroid_lat);
    setWardLon(centroid_lon);
    setGeoStatus(centroid_lat != null ? 'success' : null);
  };

  // Gujarat bounding box — hard geographic filter so Photon returns only local results
  // even for short prefixes like "Kut" (Kutch) that would otherwise return non-India places.
  const GUJARAT_BBOX = '68.1,20.1,74.5,24.7'; // min_lon,min_lat,max_lon,max_lat

  // Photon (Komoot) fetch helper — Elasticsearch-backed, designed for prefix autocomplete
  // Pass bbox to get Gujarat-scoped results; omit to use lat/lon soft bias (geocoding only)
  const photonFetch = async (q, biasLat, biasLon, limit = 10, bbox = null) => {
    const params = new URLSearchParams({ q, limit, lang: 'en' });
    if (bbox) {
      params.set('bbox', bbox);
    } else {
      params.set('lat', biasLat);
      params.set('lon', biasLon);
    }
    const res = await fetch(`https://photon.komoot.io/api/?${params}`);
    const geoJson = await res.json();
    return (geoJson.features || []).filter(
      (f) => f.properties?.country === 'India'
    );
  };

  const geocodeLocation = async () => {
    if (geocodingRef.current) return;
    const type = adding?.type || editing?.type;
    const name = newName.trim();
    if (!name || !type) return;
    geocodingRef.current = true;
    setGeoStatus('fetching');
    try {
      // Bias toward parent location if available, else Gujarat center
      const biasLat = adding?.parentLat ?? editing?.centroid_lat ?? 22.2587;
      const biasLon = adding?.parentLon ?? editing?.centroid_lon ?? 72.1;
      const features = await photonFetch(name, biasLat, biasLon, 5);
      const match = features.find(
        (f) => (f.properties.name || '').toLowerCase().startsWith(name.toLowerCase())
      ) || features[0];
      if (match) {
        const [lon, lat] = match.geometry.coordinates;
        setWardLat(lat);
        setWardLon(lon);
        setGeoStatus('success');
      } else {
        setGeoStatus('failed');
      }
    } catch {
      setGeoStatus('failed');
    } finally {
      geocodingRef.current = false;
    }
  };

  // Debounced auto-geocode when name changes (only when no coords yet)
  useEffect(() => {
    if (!adding && !editing) return;
    if (geoStatus === 'fetching' || geoStatus === 'success') return;
    if (newName.trim().length < 2) return;
    const t = setTimeout(geocodeLocation, 800);
    return () => clearTimeout(t);
  }, [newName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced suggestions (DB first + Photon prefix autocomplete with location bias)
  useEffect(() => {
    const ctx = adding || editing;
    if (!ctx || newName.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const type = ctx.type;
    const districtId = adding ? (type === 'taluka' ? adding.parentId : null) : null;
    const talukaId = adding ? (type === 'ward' ? adding.parentId : null) : null;
    // Bias to parent location so nearby results are ranked first
    const biasLat = adding?.parentLat ?? 22.3072;
    const biasLon = adding?.parentLon ?? 72.1;
    let cancelled = false;
    const t = setTimeout(async () => {
      // Fire DB and Photon in parallel — use Gujarat bbox so Photon returns local
      // results even for short prefixes like "Kut" (Kutch)
      const [dbRes, photonFeatures] = await Promise.all([
        locationsApi.suggest(newName.trim(), type, districtId, talukaId)
          .then(({ data }) => data || []).catch(() => []),
        photonFetch(newName.trim(), biasLat, biasLon, 12, GUJARAT_BBOX).catch(() => []),
      ]);
      if (cancelled) return;
      const seen = new Set(dbRes.map((r) => r.name.toLowerCase()));
      const photonResults = [];
      for (const f of photonFeatures) {
        const p = f.properties;
        const rname = (p.name || '').trim();
        if (!rname) continue;
        // Enforce prefix match against what the user actually typed
        if (!rname.toLowerCase().startsWith(newName.trim().toLowerCase())) continue;
        const key = rname.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const [lon, lat] = f.geometry.coordinates;
        const pathParts = [p.city, p.county, p.state].filter((x) => x && x !== rname);
        photonResults.push({
          id: `ph-${p.osm_id}`,
          name: rname,
          path: pathParts.slice(0, 3).join(', '),
          centroid_lat: lat,
          centroid_lon: lon,
        });
      }
      const merged = [...dbRes, ...photonResults];
      setSuggestions(merged);
      setShowSuggestions(merged.length > 0);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [newName, adding, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (adding.type === 'ward' && !newWardNumber) return;
    setSaving(true);
    try {
      if (adding.type === 'district') {
        await locationsApi.createDistrict(newName.trim(), wardLat, wardLon);
      } else if (adding.type === 'taluka') {
        await locationsApi.createTaluka(adding.parentId, newName.trim(), wardLat, wardLon);
      } else if (adding.type === 'ward') {
        await locationsApi.createWard(adding.parentId, newName.trim(), parseInt(newWardNumber), wardLat, wardLon);
      }
      // Reload tree BEFORE closing modal to ensure state sync
      await reloadTree();
      setAdding(null);
      resetWardCoords();
      addToast(`${adding.type.charAt(0).toUpperCase() + adding.type.slice(1)} created successfully!`, 'success');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to create');
      addToast(errorMsg, 'error');
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (editing.type === 'ward' && !newWardNumber) return;
    setSaving(true);
    try {
      if (editing.type === 'district') {
        await locationsApi.updateDistrict(editing.id, newName.trim(), null, wardLat, wardLon);
      } else if (editing.type === 'taluka') {
        await locationsApi.updateTaluka(editing.id, newName.trim(), wardLat, wardLon);
      } else if (editing.type === 'ward') {
        await locationsApi.updateWard(editing.id, newName.trim(), parseInt(newWardNumber), wardLat, wardLon);
      }
      // Reload tree BEFORE closing modal to ensure state sync
      await reloadTree();
      setEditing(null);
      resetWardCoords();
      addToast(`${editing.type.charAt(0).toUpperCase() + editing.type.slice(1)} updated successfully!`, 'success');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to update');
      addToast(errorMsg, 'error');
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const handleDelete = async (type, id) => {
    if (!confirm(`Delete this ${type}? This will also delete all child records.`)) return;
    try {
      if (type === 'district') await locationsApi.deleteDistrict(id);
      else if (type === 'taluka') await locationsApi.deleteTaluka(id);
      else if (type === 'ward') await locationsApi.deleteWard(id);
      await reloadTree();
      addToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`, 'success');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to delete');
      addToast(errorMsg, 'error');
    }
  };

  // ── Geocode status banner (called as function, not as JSX component) ────────
  const GeoStatusBanner = () => {
    const locType = adding?.type || editing?.type || 'location';
    if (geoStatus === 'fetching') return (
      <div className="text-xs text-blue-600 flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        Fetching location…
      </div>
    );
    if (geoStatus === 'success') return (
      <div className="flex items-center justify-between">
        <span className="text-xs text-green-600 font-medium">Location fetched — adjust on map if needed</span>
        <button
          type="button"
          onClick={() => { setWardLat(null); setWardLon(null); geocodeLocation(); }}
          className="text-xs text-gray-400 underline hover:text-gray-600"
        >
          Re-fetch
        </button>
      </div>
    );
    if (geoStatus === 'failed') return (
      <div className="flex items-center justify-between">
        <span className="text-xs text-amber-600">Location not found — click the map to place the pin</span>
        <button
          type="button"
          onClick={geocodeLocation}
          className="text-xs text-blue-500 underline hover:text-blue-700"
        >
          Try again
        </button>
      </div>
    );
    return <div className="text-xs text-gray-400">Enter {locType} name above to auto-fetch location</div>;
  };

  // ── Ward location section (inlined in both modals) ─────────────────────────
  const parentMapCenter = adding?.parentLat != null
    ? { lat: adding.parentLat, lng: adding.parentLon }
    : null;
  const wardLocationSection = (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-600">Location on Map</label>
        {wardLat != null && wardLon != null && (
          <span className="text-xs text-gray-400 font-mono">
            {wardLat.toFixed(5)}, {wardLon.toFixed(5)}
          </span>
        )}
      </div>
      {GeoStatusBanner()}
      <WardMapPicker lat={wardLat} lon={wardLon} onSetLat={setWardLat} onSetLon={setWardLon} onManualSet={() => setGeoStatus('success')} fallbackCenter={parentMapCenter} />
      <p className="text-xs text-gray-400">Click map to place pin · Drag pin to adjust</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Manage District → Taluka → Ward hierarchy</p>
        {user?.role === 'admin' && (
          <button
            onClick={() => openAdd('district', null, null)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
          >
            + Add District
          </button>
        )}
      </div>

      {/* ── Add Modal ── */}
      {adding && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Add {adding.type.charAt(0).toUpperCase() + adding.type.slice(1)}
            </h2>
            {adding.parentName && (
              <p className="text-sm text-gray-500 mb-4">Under: <strong>{adding.parentName}</strong></p>
            )}
            <form onSubmit={handleAdd} className="space-y-3">
              {adding.type === 'district' && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">State</label>
                  <input
                    disabled
                    value="Gujarat"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              )}
              <div className="relative">
                <input
                  autoFocus
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder={`${adding.type} name`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {suggestions.map((s) => (
                      <li
                        key={s.id}
                        onMouseDown={() => {
                          setNewName(s.name);
                          if (s.centroid_lat != null) { setWardLat(s.centroid_lat); setWardLon(s.centroid_lon); setGeoStatus('success'); }
                          setShowSuggestions(false);
                        }}
                        className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                      >
                        <span className="font-medium text-gray-800">{s.name}</span>
                        {s.path && <span className="text-gray-400 text-xs ml-2">{s.path}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {adding.type === 'ward' && (
                <input
                  type="number"
                  required
                  min="1"
                  value={newWardNumber}
                  onChange={(e) => setNewWardNumber(e.target.value)}
                  placeholder="Ward number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              )}
              {wardLocationSection}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setAdding(null); resetWardCoords(); }}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={saving}
                  variant="primary"
                  className="flex-1"
                  loadingText="Saving..."
                >
                  Add
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Edit {editing.type.charAt(0).toUpperCase() + editing.type.slice(1)}
            </h2>
            <form onSubmit={handleEdit} className="space-y-3">
              <div className="relative">
                <input
                  autoFocus
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder={`${editing.type} name`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {suggestions.map((s) => (
                      <li
                        key={s.id}
                        onMouseDown={() => {
                          setNewName(s.name);
                          if (s.centroid_lat != null) { setWardLat(s.centroid_lat); setWardLon(s.centroid_lon); setGeoStatus('success'); }
                          setShowSuggestions(false);
                        }}
                        className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                      >
                        <span className="font-medium text-gray-800">{s.name}</span>
                        {s.path && <span className="text-gray-400 text-xs ml-2">{s.path}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {editing.type === 'ward' && (
                <input
                  type="number"
                  required
                  min="1"
                  value={newWardNumber}
                  onChange={(e) => setNewWardNumber(e.target.value)}
                  placeholder="Ward number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
              )}
              {wardLocationSection}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setEditing(null); resetWardCoords(); }}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={saving}
                  variant="primary"
                  className="flex-1"
                  loadingText="Updating..."
                >
                  Update
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tree ── */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : tree.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-16 text-gray-400">
          No locations yet. Add a district to start.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-50">
          {tree
            .filter((district) =>
              user?.role === 'admin' ? true : district.id === user?.district_id
            )
            .map((district) => (
            <div key={district.id}>
              {/* District */}
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
                <button onClick={() => toggle(`d-${district.id}`)} className="text-gray-400 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform" style={{ transform: expanded[`d-${district.id}`] ? 'rotate(90deg)' : 'rotate(0deg)' }} viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                </button>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${district.centroid_lat != null ? 'bg-green-400' : 'bg-gray-300'}`} />
                <span className="font-semibold text-gray-900 flex-1">{district.name}</span>
                <span className="text-xs text-gray-400">{district.talukas?.length || 0} talukas</span>
                {district.centroid_lat != null && (
                  <span className="text-xs text-green-600 font-mono opacity-0 group-hover:opacity-100">
                    {district.centroid_lat.toFixed(4)}, {district.centroid_lon.toFixed(4)}
                  </span>
                )}
                {(user?.role === 'admin' || user?.role === 'district_admin') && (
                  <button onClick={() => openAdd('taluka', district.id, district.name, null, district.centroid_lat, district.centroid_lon)} className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs font-semibold rounded-md border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors">+ Taluka</button>
                )}
                {user?.role === 'admin' && (
                  <>
                    <button onClick={() => openEdit('district', district.id, district.name, null, district.centroid_lat, district.centroid_lon)} className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs font-semibold rounded-md border bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 transition-colors">Edit</button>
                    <button onClick={() => handleDelete('district', district.id)} className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs font-semibold rounded-md border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors">Delete</button>
                  </>
                )}
              </div>

              {/* Talukas */}
              {expanded[`d-${district.id}`] && district.talukas
                ?.filter((taluka) => {
                  if (user?.role === 'taluka_admin' || user?.role === 'ward_admin') return taluka.id === user?.taluka_id;
                  return true;
                })
                .map((taluka) => (
                <div key={taluka.id}>
                  <div className="flex items-center gap-3 px-8 py-2.5 hover:bg-gray-50 group">
                    <button onClick={() => toggle(`t-${taluka.id}`)} className="text-gray-400 hover:text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform" style={{ transform: expanded[`t-${taluka.id}`] ? 'rotate(90deg)' : 'rotate(0deg)' }} viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                    </button>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${taluka.centroid_lat != null ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <span className="text-gray-800 flex-1">{taluka.name}</span>
                    <span className="text-xs text-gray-400">{taluka.wards?.length || 0} wards</span>
                    {taluka.centroid_lat != null && (
                      <span className="text-xs text-green-600 font-mono opacity-0 group-hover:opacity-100">
                        {taluka.centroid_lat.toFixed(4)}, {taluka.centroid_lon.toFixed(4)}
                      </span>
                    )}
                    {(user?.role === 'admin' || user?.role === 'district_admin' || user?.role === 'taluka_admin') && (
                      <button onClick={() => openAdd('ward', taluka.id, taluka.name, district.name, taluka.centroid_lat, taluka.centroid_lon)} className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs font-semibold rounded-md border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors">+ Ward</button>
                    )}
                    {(user?.role === 'admin' || user?.role === 'district_admin') && (
                      <>
                        <button onClick={() => openEdit('taluka', taluka.id, taluka.name, null, taluka.centroid_lat, taluka.centroid_lon, null, district.name)} className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs font-semibold rounded-md border bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 transition-colors">Edit</button>
                        <button onClick={() => handleDelete('taluka', taluka.id)} className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs font-semibold rounded-md border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors">Delete</button>
                      </>
                    )}
                  </div>

                  {/* Wards */}
                  {expanded[`t-${taluka.id}`] && taluka.wards?.map((ward) => (
                    <div key={ward.id} className="flex items-center gap-3 px-16 py-2 hover:bg-gray-50 group">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${ward.centroid_lat != null ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700 flex-1">{ward.name}</span>
                      {ward.centroid_lat != null ? (
                        <span className="text-xs text-green-600 font-mono opacity-0 group-hover:opacity-100">
                          {ward.centroid_lat.toFixed(4)}, {ward.centroid_lon.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 opacity-0 group-hover:opacity-100">no coords</span>
                      )}
                      <button
                        onClick={() => openEdit('ward', ward.id, ward.name, ward.ward_number, ward.centroid_lat, ward.centroid_lon, taluka.name, district.name)}
                        className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs font-semibold rounded-md border bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDelete('ward', ward.id)} className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs font-semibold rounded-md border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition-colors">Delete</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
