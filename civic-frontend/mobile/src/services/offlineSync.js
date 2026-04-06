/**
 * Mobile Offline Queue & Sync Manager
 * Stream 6: Queue operations while offline, sync when connection returns
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class OfflineQueue {
  constructor() {
    this.queue = [];
    this.isOnline = true;
    this.storageKey = '@civic_offline_queue';
  }

  /**
   * Initialize queue from persistent storage
   */
  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      this.queue = stored ? JSON.parse(stored) : [];
      console.log(`[OfflineQueue] Initialized with ${this.queue.length} pending operations`);
    } catch (err) {
      console.error('[OfflineQueue] Failed to initialize:', err);
    }
  }

  /**
   * Add operation to queue
   */
  async enqueue(operation) {
    const queueItem = {
      id: `${Date.now()}_${Math.random()}`,
      operation,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.queue.push(queueItem);
    await this._persistQueue();

    console.log(`[OfflineQueue] Enqueued: ${operation.type}`, queueItem.id);
    return queueItem.id;
  }

  /**
   * Persist queue to storage
   */
  async _persistQueue() {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (err) {
      console.error('[OfflineQueue] Failed to persist:', err);
    }
  }

  /**
   * Process queue - execute pending operations
   */
  async processQueue(apiCall) {
    if (!this.isOnline || this.queue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;
    const failedItems = [];

    for (const item of this.queue) {
      try {
        console.log(`[OfflineQueue] Processing: ${item.operation.type}`);

        await apiCall(item.operation);

        processed++;
      } catch (err) {
        item.retryCount++;

        if (item.retryCount < item.maxRetries) {
          failedItems.push(item);
          console.warn(
            `[OfflineQueue] Retry ${item.retryCount}/${item.maxRetries}: ${item.operation.type}`,
          );
        } else {
          failed++;
          console.error(
            `[OfflineQueue] Max retries exceeded for: ${item.operation.type}`,
          );
        }
      }
    }

    this.queue = failedItems;
    await this._persistQueue();

    return { processed, failed, remaining: this.queue.length };
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(isOnline) {
    this.isOnline = isOnline;
    console.log(`[OfflineQueue] Status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      queueSize: this.queue.length,
      operations: this.queue.map((item) => ({
        id: item.id,
        type: item.operation.type,
        retiries: item.retryCount,
      })),
    };
  }

  /**
   * Clear queue
   */
  async clear() {
    this.queue = [];
    await AsyncStorage.removeItem(this.storageKey);
    console.log('[OfflineQueue] Cleared');
  }
}

export const offlineQueue = new OfflineQueue();

/**
 * Geolocation Service
 * Stream 6: Track worker location for map and geofence features
 */
export class GeolocationService {
  static async getCurrentLocation() {
    try {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toISOString(),
            });
          },
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
      });
    } catch (err) {
      console.error('[Geolocation] Failed:', err);
      throw err;
    }
  }

  static async watchLocation(callback) {
    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => console.error('[Geolocation]', error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  static clearWatch(watchId) {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
  }
}

/**
 * Push Notification Handler
 * Stream 6: Handle push notifications for mobile app
 */
export class PushNotificationService {
  static async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('[PushNotifications] Permission error:', err);
      return false;
    }
  }

  static showNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/civic-logo.png',
        badge: '/civic-badge.png',
        ...options,
      });
    }
  }

  static async handleNotificationClick(notification, onAction) {
    if (notification.data && notification.data.actionUrl) {
      // Navigate to the URL or trigger action
      onAction?.(notification.data.actionUrl);
    }
  }
}

export default {
  offlineQueue,
  GeolocationService,
  PushNotificationService,
};
