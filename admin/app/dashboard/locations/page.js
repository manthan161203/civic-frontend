'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { locationsApi } from '../../../src/api/index';
import { useAuthStore } from '../../../src/store/authStore';

// ── Ward Map Picker (Google Maps) ────────────────────────────────────────────
// Defined outside LocationsPage so React never unmounts it during re-renders.

function DraggableMarker({ position, onDragEnd }) {
  return (
    <AdvancedMarker position={position} draggable onDragEnd={onDragEnd} />
  );
}

function ClickHandler({ onSetLat, onSetLon }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', (e) => {
      onSetLat(e.latLng.lat());
      onSetLon(e.latLng.lng());
    });
    return () => listener.remove();
  }, [map, onSetLat, onSetLon]);
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

function WardMapPicker({ lat, lon, onSetLat, onSetLon }) {
  const hasCoords = lat != null && lon != null;
  const handleDragEnd = useCallback((e) => {
    onSetLat(e.latLng.lat());
    onSetLon(e.latLng.lng());
  }, [onSetLat, onSetLon]);

  return (
    <div style={{ height: '220px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <Map
        defaultCenter={hasCoords ? { lat, lng: lon } : { lat: 22.3072, lng: 70.8022 }}
        defaultZoom={hasCoords ? 14 : 8}
        mapId="civic-ward-picker"
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        style={{ width: '100%', height: '100%' }}
      >
        {hasCoords && (
          <DraggableMarker position={{ lat, lng: lon }} onDragEnd={handleDragEnd} />
        )}
        <ClickHandler onSetLat={onSetLat} onSetLon={onSetLon} />
        <PanToCoords lat={lat} lon={lon} />
      </Map>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LocationsPage() {
  const { user } = useAuthStore();
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

  useEffect(() => {
    locationsApi.getTree()
      .then(({ data }) => setTree(data.districts || data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const reloadTree = async () => {
    const { data } = await locationsApi.getTree();
    setTree(data.districts || data);
  };

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const resetWardCoords = () => {
    setWardLat(null);
    setWardLon(null);
    setGeoStatus(null);
  };

  const openAdd = (type, parentId, parentName, grandparentName = null) => {
    setAdding({ type, parentId, parentName, grandparentName });
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

  const geocodeLocation = async () => {
    const type = adding?.type || editing?.type;
    const name = newName.trim();
    if (!name || !type) return;
    setGeoStatus('fetching');
    try {
      let query;
      if (type === 'district') {
        query = `${name}, Gujarat, India`;
      } else if (type === 'taluka') {
        const districtName = adding?.parentName || editing?.districtName || '';
        query = `${name}, ${districtName}, Gujarat, India`;
      } else {
        const talukaName = adding?.parentName || editing?.talukaName || '';
        const districtName = adding?.grandparentName || editing?.districtName || '';
        query = `${name}, ${talukaName}, ${districtName}, Gujarat, India`;
      }
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        setWardLat(parseFloat(data[0].lat));
        setWardLon(parseFloat(data[0].lon));
        setGeoStatus('success');
      } else {
        setGeoStatus('failed');
      }
    } catch {
      setGeoStatus('failed');
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

  // Debounced suggestions from DB
  useEffect(() => {
    const ctx = adding || editing;
    if (!ctx || newName.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const type = ctx.type;
    const districtId = adding ? (type === 'taluka' ? adding.parentId : null) : null;
    const talukaId = adding ? (type === 'ward' ? adding.parentId : null) : null;
    const t = setTimeout(() => {
      locationsApi.suggest(newName.trim(), type, districtId, talukaId)
        .then(({ data }) => { setSuggestions(data || []); setShowSuggestions((data || []).length > 0); })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
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
      setAdding(null);
      resetWardCoords();
      await reloadTree();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create');
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
      setEditing(null);
      resetWardCoords();
      await reloadTree();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update');
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
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete');
    }
  };

  // ── Geocode status banner ──────────────────────────────────────────────────
  const GeoStatusBanner = () => {
    if (geoStatus === 'fetching') return (
      <div className="text-xs text-blue-600 flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        Fetching location…
      </div>
    );
    if (geoStatus === 'success') return (
      <div className="flex items-center justify-between">
        <span className="text-xs text-green-600 font-medium">Location auto-fetched — adjust on map if needed</span>
        <button
          type="button"
          onClick={() => { setGeoStatus('failed'); setWardLat(null); setWardLon(null); }}
          className="text-xs text-gray-400 underline hover:text-gray-600"
        >
          Re-fetch
        </button>
      </div>
    );
    if (geoStatus === 'failed') {
      return (
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
    }
    return <div className="text-xs text-gray-400">Enter ward name above to auto-fetch location</div>;
  };

  // ── Ward location section (inlined in both modals) ─────────────────────────
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
      <GeoStatusBanner />
      <WardMapPicker lat={wardLat} lon={wardLon} onSetLat={setWardLat} onSetLon={setWardLon} />
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
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Add'}
                </button>
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
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Updating…' : 'Update'}
                </button>
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
                  {expanded[`d-${district.id}`] ? '▾' : '▸'}
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
                  <button onClick={() => openAdd('taluka', district.id, district.name)} className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs font-semibold rounded-md border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors">+ Taluka</button>
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
                      {expanded[`t-${taluka.id}`] ? '▾' : '▸'}
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
                      <button onClick={() => openAdd('ward', taluka.id, taluka.name, district.name)} className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs font-semibold rounded-md border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors">+ Ward</button>
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
