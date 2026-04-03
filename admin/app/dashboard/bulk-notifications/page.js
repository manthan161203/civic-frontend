'use client';
/**
 * Bulk Geofence Notifications Dashboard
 * ====================================
 * Allows admins to:
 * - Draw a circle on the map to define a geofence
 * - Send push notifications to all citizens in that area
 * - Monitor delivery status and success rates
 * 
 * Use case: 'Water pipe repair tomorrow, expect low pressure'
 */

import { useState } from 'react';
import { adminApi } from '../../../src/api/index';
import { logger } from '../../../src/lib/logger';

const COMPONENT_NAME = 'BulkNotificationsPage';

export default function BulkNotificationsPage() {
  const [formData, setFormData] = useState({
    latitude: 19.0760,
    longitude: 72.8777,
    radius_km: 2,
    title: '',
    body: '',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Handle form field changes
   */
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field.includes('_') ? parseFloat(value) : value,
    }));
    logger.debug(COMPONENT_NAME, `Form field updated: ${field} = ${value}`);
  };

  /**
   * Send geofence notification to all citizens in radius
   */
  const handleSendNotification = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      // Validate inputs
      if (!formData.title.trim() || !formData.body.trim()) {
        setError('Please fill in title and message');
        logger.warn(COMPONENT_NAME, 'Form validation failed: empty title or body');
        return;
      }

      if (formData.radius_km <= 0) {
        setError('Radius must be greater than 0');
        logger.warn(COMPONENT_NAME, 'Invalid radius: ' + formData.radius_km);
        return;
      }

      logger.info(
        COMPONENT_NAME,
        'Sending geofence notification',
        formData
      );

      const response = await adminApi.post('/admin/notifications/geofence', null, {
        params: {
          latitude: formData.latitude,
          longitude: formData.longitude,
          radius_km: formData.radius_km,
          title: formData.title,
          body: formData.body,
        },
      });

      setResult(response.data);
      logger.info(
        COMPONENT_NAME,
        'Notification sent successfully',
        { citiesNotified: response.data.citizens_notified }
      );

      // Reset form
      setFormData((prev) => ({
        ...prev,
        title: '',
        body: '',
      }));
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to send notification';
      setError(errorMsg);
      logger.error(COMPONENT_NAME, 'Error sending notification', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Use current map center for geofence (placeholder - would integrate with real map)
   */
  const handleUseMapCenter = () => {
    logger.info(COMPONENT_NAME, 'Would use current map center as geofence center');
    // In production, integrate with MapView to get center coordinates
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bulk Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Send push notifications to citizens in a specific area</p>
        </div>
      </div>

      {/* Success Message */}
      {result && (
        <div className="bg-green-50 rounded-xl p-5 border border-green-200">
          <div className="flex items-start gap-3">
            <div className="text-green-600 text-2xl">✓</div>
            <div className="flex-1">
              <h3 className="font-bold text-green-700 mb-1">Notification Sent!</h3>
              <p className="text-sm text-green-600">
                {result.citizens_notified} {result.citizens_notified === 1 ? 'citizen' : 'citizens'} notified
                {result.citizens_failed > 0 && `, ${result.citizens_failed} failures`}
              </p>
              <div className="text-xs text-green-600 mt-2">
                <strong>Area:</strong> Center ({result.geofence.center.latitude}, {result.geofence.center.longitude}) 
                <br /> (radius: {result.geofence.radius_km}km)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 rounded-xl p-5 border border-red-200">
          <div className="flex items-start gap-3">
            <div className="text-red-600 text-2xl">✕</div>
            <div className="flex-1">
              <h3 className="font-bold text-red-700 mb-1">Error</h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Send Notification to Area</h2>

        {/* Geofence Settings */}
        <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700">Geofence Location</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Latitude</label>
              <input
                type="number"
                step="0.001"
                value={formData.latitude}
                onChange={(e) => handleChange('latitude', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="19.0760"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Longitude</label>
              <input
                type="number"
                step="0.001"
                value={formData.longitude}
                onChange={(e) => handleChange('longitude', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="72.8777"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Radius (km)</label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={formData.radius_km}
                onChange={(e) => handleChange('radius_km', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2"
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            📍 Current location (Mumbai): 19.0760°N, 72.8777°E. In production, integrate with map drag/click to set center.
          </div>
        </div>

        {/* Message Content */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Message</h3>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., 'Water Maintenance Alert'"
              maxLength={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">{formData.title.length}/60 characters</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">Message</label>
            <textarea
              value={formData.body}
              onChange={(e) => handleChange('body', e.target.value)}
              placeholder="e.g., 'Water pipe repair tomorrow, expect low pressure from 8 AM to 4 PM.'"
              maxLength={200}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">{formData.body.length}/200 characters</p>
          </div>
        </div>
      </div>

      {/* Preview Card */}
      <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">Message Preview</h3>
        <div className="bg-white rounded-lg p-4 space-y-1">
          <p className="font-semibold text-gray-800 truncate">{formData.title || '(Title)'}</p>
          <p className="text-sm text-gray-600 line-clamp-2">{formData.body || '(Message body)'}</p>
          <p className="text-xs text-gray-500 mt-3">
            Will be sent to all citizens within {formData.radius_km}km of ({formData.latitude}, {formData.longitude})
          </p>
        </div>
      </div>

      {/* Send Button */}
      <div className="flex gap-3">
        <button
          onClick={handleSendNotification}
          disabled={loading || !formData.title.trim() || !formData.body.trim()}
          className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '📤 Sending…' : '📤 Send Notification'}
        </button>

        <button
          onClick={() => {
            setFormData({
              latitude: 19.0760,
              longitude: 72.8777,
              radius_km: 2,
              title: '',
              body: '',
            });
            setResult(null);
            setError(null);
          }}
          className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Information Box */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <p className="text-xs text-amber-700">
          <strong>Note:</strong> This sends push notifications to all citizens with registered FCM tokens within the specified radius. 
          Make sure to test with a small radius first. Notifications are delivered via Firebase Cloud Messaging.
        </p>
      </div>
    </div>
  );
}
