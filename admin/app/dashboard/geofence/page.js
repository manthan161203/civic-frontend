'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';
import { useUiStore } from '../../../src/store/uiStore';

const ZONE_COLORS = {
  active: 'bg-green-50 border-green-200',
  inactive: 'bg-gray-50 border-gray-200',
  alert: 'bg-red-50 border-red-200',
};

export default function GeofenceAdminPage() {
  const { addToast } = useUiStore();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_km: '0.5',
  });
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);

  const loadZones = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.getGeofences(page, 5); // 5 items per page for display
      setZones(response.data.items.map(item => ({
        id: item.id,
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        radius_km: item.radius_km,
        created_by_name: item.created_by_name,
        created_at: item.created_at,
        active_workers: 0, // This would be fetched from a separate endpoint in a real app
        alerts_today: 0,   // This would be fetched from a separate endpoint in a real app
      })));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load geofences'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Validate inputs
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      const radius = parseFloat(formData.radius_km);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }

      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }

      if (isNaN(radius) || radius <= 0) {
        throw new Error('Radius must be greater than 0 km');
      }

      if (!formData.name || !formData.name.trim()) {
        throw new Error('Zone name is required');
      }

      const response = await adminApi.createGeofence({
        name: formData.name.trim(),
        latitude: lat,
        longitude: lng,
        radius_km: radius,
      });

      const newZone = {
        id: response.data.id,
        name: response.data.name,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        radius_km: response.data.radius_km,
        created_by_name: response.data.created_by_name,
        created_at: response.data.created_at,
        active_workers: 0,
        alerts_today: 0,
      };

      setZones([newZone, ...zones]);
      setFormData({ name: '', latitude: '', longitude: '', radius_km: '0.5' });
      setShowForm(false);
      addToast('Geofence created successfully!', 'success');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to create geofence');
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this geofence?')) return;
    try {
      await adminApi.deleteGeofence(id);
      setZones(zones.filter((z) => z.id !== id));
      addToast('Geofence deleted successfully!', 'success');
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to delete geofence');
      setError(errorMsg);
      addToast(errorMsg, 'error');
    }
  };

  const displayZones = zones.slice((page - 1) * 5, page * 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900">Geofence Management</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">Create and manage worker location zones</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          + Add Zone
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create Geofence Zone</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Zone Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., City Center"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="19.0176"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="72.8479"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Radius (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.radius_km}
                  onChange={(e) => setFormData({ ...formData, radius_km: e.target.value })}
                  placeholder="0.5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  required
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zones List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
              <div className="h-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : displayZones.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500 font-medium">No geofence zones created yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayZones.map((zone) => (
              <div key={zone.id} className={`border rounded-lg p-4 ${ZONE_COLORS.active}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{zone.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)} • {zone.radius_km}km radius
                      </div>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-700">{zone.active_workers} workers</p>
                    <p className="text-xs text-gray-500">{zone.alerts_today} alerts today</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-300">
                  <button className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    View Workers
                  </button>
                  <button className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    Alerts
                  </button>
                  <button
                    onClick={() => handleDelete(zone.id)}
                    className="flex-1 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {zones.length > 5 && (
            <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <p className="text-sm text-gray-600">Page {page} of {Math.ceil(zones.length / 5)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(zones.length / 5), p + 1))}
                  disabled={page === Math.ceil(zones.length / 5)}
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
