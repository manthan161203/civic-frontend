'use client';
/**
 * Bulk Geofence Notifications Dashboard
 * Interactive map-based interface for sending location-based push notifications
 */

import { useState } from 'react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { adminApi } from '../../../src/api/index';
import { useUiStore } from '../../../src/store/uiStore';
import { logger } from '../../../src/lib/logger';

const COMPONENT_NAME = 'BulkNotificationsPage';

// ── Confirmation Modal ─────────────────────────────────────────────────────────
function ConfirmModal({ formData, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Confirm Notification</h2>

        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Title</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{formData.title}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Message</p>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{formData.body}</p>
            </div>
            <div className="border-t border-blue-100 pt-3">
              <p className="text-xs text-gray-600 uppercase font-semibold">Coverage Area</p>
              <p className="text-sm text-gray-700 mt-1">{formData.radius_km} km radius centered at {formData.latitude.toFixed(4)}°N, {formData.longitude.toFixed(4)}°E</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> This notification will be sent to all citizens with active FCM tokens in the selected area.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending…' : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BulkNotificationsPage() {
  const { addToast } = useUiStore();
  const [mapCenter, setMapCenter] = useState({ lat: 22.2587, lng: 71.1924 });
  const [formData, setFormData] = useState({
    latitude: 22.2587,
    longitude: 71.1924,
    radius_km: 2,
    title: '',
    body: '',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (field, value) => {
    if (field === 'latitude' || field === 'longitude' || field === 'radius_km') {
      setFormData((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleMapClick = (event) => {
    try {
      // Handle Google Maps click event - coordinates are in event.detail.latLng
      const latLng = event.detail?.latLng || event.latLng;
      if (latLng) {
        const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
        const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
        setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        setMapCenter({ lat, lng });
        logger.debug(COMPONENT_NAME, `Location set: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (err) {
      logger.error(COMPONENT_NAME, 'Error handling map click', err);
    }
  };

  const handleSendNotification = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      if (!formData.title.trim() || !formData.body.trim()) {
        setError('Please enter title and message');
        setLoading(false);
        return;
      }

      if (formData.radius_km <= 0) {
        setError('Radius must be greater than 0');
        setLoading(false);
        return;
      }

      const response = await adminApi.sendGeofenceNotification(
        formData.latitude,
        formData.longitude,
        formData.radius_km,
        formData.title,
        formData.body
      );

      setResult(response.data);
      addToast(`Notification sent to ${response.data.citizens_notified} citizens!`, 'success');
      logger.info(COMPONENT_NAME, `Notification sent to ${response.data.citizens_notified} citizens`);

      setFormData((prev) => ({
        ...prev,
        title: '',
        body: '',
      }));
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to send notification';
      setError(errorMsg);
      addToast(errorMsg, 'error');
      logger.error(COMPONENT_NAME, errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      latitude: 22.2587,
      longitude: 71.1924,
      radius_km: 2,
      title: '',
      body: '',
    });
    setResult(null);
    setError(null);
    setMapCenter({ lat: 22.2587, lng: 71.1924 });
  };

  const radiusMeters = Math.round(formData.radius_km * 1000);
  const isValid = formData.title.trim() && formData.body.trim() && formData.radius_km > 0;

  const handleConfirmSend = async () => {
    await handleSendNotification();
    setShowConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Confirmation Modal */}
      {showConfirm && (
        <ConfirmModal
          formData={formData}
          onConfirm={handleConfirmSend}
          onCancel={() => setShowConfirm(false)}
          loading={loading}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Location Notifications</h1>
        <p className="text-sm text-gray-600 mt-1">Send push notifications to all citizens within a selected area</p>
      </div>

      {/* Success State */}
      {result && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-600">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-green-900 mb-2">Notification Sent Successfully!</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">{result.citizens_notified}</div>
                  <div className="text-xs text-gray-600">Citizens Notified</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600">{result.citizens_failed || 0}</div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm text-gray-700 font-medium">{formData.radius_km} km radius</div>
                  <div className="text-xs text-gray-600">Coverage</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-700 bg-white rounded-lg p-3">
                <strong>Center:</strong> {formData.latitude.toFixed(4)}°N, {formData.longitude.toFixed(4)}°E
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 rounded-xl p-5 border border-red-200">
          <div className="flex items-start gap-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-blue-600">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Select Location on Map
              </h2>
              <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="currentColor"><path d="M4 8.5C4 5.46 6.46 3 9.5 3S15 5.46 15 8.5c0 3.78-3.4 7.68-5.5 10.02C7.4 16.18 4 12.28 4 8.5zM9.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>
                Click on the map to select the center point for notifications
              </p>
            </div>

            <Map
              mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID}
              defaultCenter={{ lat: mapCenter.lat, lng: mapCenter.lng }}
              defaultZoom={13}
              onClick={handleMapClick}
              gestureHandling="greedy"
              disableDefaultUI={false}
              style={{ width: '100%', height: '400px' }}
            >
              {/* Center Marker */}
              <AdvancedMarker position={{ lat: formData.latitude, lng: formData.longitude }}>
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse opacity-75" style={{ width: 24, height: 24 }} />
                    <div className="w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-lg" />
                  </div>
                </div>
              </AdvancedMarker>
            </Map>

            {/* Geofence Info + Manual Input */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1 block">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1 block">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Helper text */}
              <div className="text-xs text-gray-600 bg-white rounded px-3 py-2 border border-gray-200">
                <span className="inline-flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>
                  <strong>Tip:</strong> Right-click on Google Maps, select a location, and copy the coordinates shown
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="space-y-5">
          {/* Radius Control */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-purple-600">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 12L12 7" />
              </svg>
              Coverage Radius
            </h3>

            <div className="space-y-3">
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={formData.radius_km}
                onChange={(e) => handleChange('radius_km', e.target.value)}
                className="w-full h-2 bg-purple-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">{formData.radius_km}</div>
                  <div className="text-xs text-gray-600 mt-1">Kilometers</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">{radiusMeters}</div>
                  <div className="text-xs text-gray-600 mt-1">Meters</div>
                </div>
              </div>

              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={formData.radius_km}
                onChange={(e) => handleChange('radius_km', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4">
            <div className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2">Quick Radius</div>
            <div className="grid grid-cols-2 gap-2">
              {[0.5, 1, 2, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => handleChange('radius_km', r)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    formData.radius_km === r
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-white text-amber-700 border border-amber-200 hover:border-amber-400'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Message Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 text-lg mb-5 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-blue-600">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Message Content
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notification Title
                <span className="text-xs font-normal text-gray-500 ml-1">({formData.title.length}/60)</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Water Maintenance Alert"
                maxLength={60}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message Body
                <span className="text-xs font-normal text-gray-500 ml-1">({formData.body.length}/200)</span>
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => handleChange('body', e.target.value)}
                placeholder="e.g., Water pipe repair tomorrow. Expect low pressure from 8 AM to 4 PM."
                maxLength={200}
                rows={5}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors"
              />
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Live Preview</div>
            
            {/* Android-style notification */}
            <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-4 shadow-2xl">
              {/* Notification card */}
              <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                {/* Notification header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <span className="font-semibold text-sm">Civic App</span>
                  </div>
                </div>

                {/* Notification content */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {formData.title || 'Notification Title'}
                    </div>
                    <div className="text-xs text-gray-700 mt-2 leading-relaxed">
                      {formData.body || 'Your message will appear here...'}
                    </div>
                  </div>

                  {/* Coverage badge */}
                  <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-red-500 flex-shrink-0">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="text-xs text-gray-600">
                      Sent to citizens within <strong>{formData.radius_km} km</strong>
                    </span>
                  </div>

                  {/* Location coords */}
                  <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    Center: {formData.latitude.toFixed(4)}°N, {formData.longitude.toFixed(4)}°E
                  </div>
                </div>

                {/* Action buttons */}
                <div className="bg-gray-50 px-4 py-3 flex gap-2 border-t border-gray-100">
                  <button className="text-xs font-semibold text-gray-600 py-1 px-3 rounded hover:bg-gray-200 transition-colors">
                    Dismiss
                  </button>
                  <button className="text-xs font-semibold text-blue-600 py-1 px-3 rounded hover:bg-blue-50 transition-colors">
                    View
                  </button>
                </div>
              </div>

              {/* Info text */}
              <div className="mt-3 text-xs text-gray-300 text-center">
                This is how the notification appears to citizens
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading || !isValid}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Send Notification
        </button>

        <button
          onClick={clearForm}
          disabled={loading}
          className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Information Box */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
        <div className="flex gap-3">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <div className="text-sm text-green-900 space-y-2">
            <div className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-green-700" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg><strong>How it works:</strong></div>
            <ul className="list-disc list-inside text-xs ml-2 space-y-1">
              <li>Click on the map to set the notification center point</li>
              <li>Adjust the radius to define the geofence area</li>
              <li>Compose your message and preview how it will appear</li>
              <li>Send to all citizens with FCM tokens in the selected area</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}



