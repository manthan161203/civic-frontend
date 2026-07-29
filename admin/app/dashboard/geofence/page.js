'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '../../../src/api/index';
import { getErrorMessage } from '../../../src/lib/apiError';
import { useUiStore } from '../../../src/store/uiStore';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const ZONE_COLORS = {
  active: 'bg-success-soft border-success/30',
  inactive: 'bg-surface-alt border-border',
  alert: 'bg-danger-soft border-danger/30',
};

export default function GeofenceAdminPage() {
  const confirm = useConfirm();
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
  const [total, setTotal] = useState(0);

  const PAGE_SIZE = 5;

  /*
   * `GET /admin/geofences` is already paginated, so this only fetches the
   * current page and trusts `total` for the page count.
   *
   * It previously fetched 5 rows and then sliced those same 5 rows again
   * client-side, gating the pager on `zones.length > 5` — never true. The
   * effect also had an empty dependency array, so changing the page did not
   * refetch. Between the two, the list was permanently stuck on page 1 with no
   * visible controls.
   */
  const loadZones = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.getGeofences(page, PAGE_SIZE);
      setZones(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load geofences'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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

      // Go back to the first page and refetch, rather than splicing a
      // locally-built row into a server-paginated list.
      if (page === 1) {
        await loadZones();
      } else {
        setPage(1);
      }
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
    // A zone deletion is irreversible and now also removes it from the
    // jurisdiction scoping added in the backend pass, so it says what it does.
    const ok = await confirm({
      title: 'Delete this geofence?',
      description: 'Any alert history stays, but the zone itself cannot be recovered.',
      tone: 'danger',
      confirmLabel: 'Delete zone',
    });
    if (!ok) return;
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <h1 className="text-2xl font-bold text-ink">Geofence Management</h1>
          </div>
          <p className="text-sm text-ink-subtle mt-1">Create and manage worker location zones</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover transition"
        >
          + Add Zone
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold text-ink mb-4">Create Geofence Zone</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink-muted mb-2">Zone Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., City Center"
                  className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-muted mb-2">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="19.0176"
                    className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-muted mb-2">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="72.8479"
                    className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-muted mb-2">Radius (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.radius_km}
                  onChange={(e) => setFormData({ ...formData, radius_km: e.target.value })}
                  placeholder="0.5"
                  className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  required
                />
              </div>

              {error && <p className="text-sm text-danger bg-danger-soft px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-border-strong rounded-lg text-sm font-semibold text-ink-muted hover:bg-surface-alt transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover transition disabled:opacity-50"
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
            <div key={i} className="bg-surface rounded-lg shadow-sm p-4 animate-pulse">
              <div className="h-16 bg-border rounded" />
            </div>
          ))}
        </div>
      ) : zones.length === 0 ? (
        <div className="bg-surface rounded-lg shadow-sm border border-divider p-12 text-center">
          <p className="text-ink-subtle font-medium">No geofence zones created yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {zones.map((zone) => (
              <div key={zone.id} className={`border rounded-lg p-4 ${ZONE_COLORS.active}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-ink">{zone.name}</h3>
                    <p className="text-xs text-ink-muted mt-1">
                      <div className="flex items-center gap-1 text-xs text-ink-muted">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)} • {zone.radius_km}km radius
                      </div>
                    </p>
                  </div>
                  {/* "N workers" / "N alerts today" used to render here from
                      hardcoded zeroes — there is no endpoint behind either
                      figure. Showing the creator is at least true. */}
                  <div className="text-right">
                    {zone.created_by_name && (
                      <p className="text-xs text-ink-subtle">by {zone.created_by_name}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border-strong">
                  {/* "View Workers" and "Alerts" were inert — no handler, no
                      endpoint. Removed rather than left as decoration. */}
                  <button
                    onClick={() => handleDelete(zone.id)}
                    className="flex-1 px-3 py-1.5 bg-danger-soft border border-danger/30 rounded text-xs font-semibold text-danger hover:bg-danger-soft"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between bg-surface rounded-lg shadow-sm border border-divider p-4">
              <p className="text-sm text-ink-muted">
                Page {page} of {totalPages} · {total} zone{total === 1 ? '' : 's'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-border-strong rounded-lg text-sm font-semibold text-ink-muted disabled:opacity-50 hover:bg-surface-alt"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-border-strong rounded-lg text-sm font-semibold text-ink-muted disabled:opacity-50 hover:bg-surface-alt"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="bg-danger-soft border border-danger/30 rounded-lg p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
    </div>
  );
}
