/**
 * Offline Sync Manager for Worker Tasks
 * ======================================
 * Allows workers to:
 * - Mark tasks as In Progress or Resolved offline
 * - Upload photos offline to local storage
 * - Auto-sync all changes when network connection returns
 * 
 * Uses AsyncStorage for offline data + SQLite for photo storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { logger } from './logger';
import { syncApi } from '../api/sync';

const OFFLINE_QUEUE_KEY = 'offline_task_queue';
const OFFLINE_PHOTOS_KEY = 'offline_photos';
const COMPONENT_NAME = 'OfflineSyncManager';

/**
 * Queue structure for offline operations:
 * {
 *   id: string (unique),
 *   type: 'status_update' | 'photo_upload' | 'task_resolution',
 *   taskId: uuid,
 *   data: object (operation-specific data),
 *   timestamp: ISO string,
 *   retries: number (count of failed attempts)
 * }
 */

export const OfflineSync = {
  /**
   * Check network connectivity status
   * @returns {Promise<boolean>} True if device has internet connection
   */
  isOnline: async () => {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected && state.isInternetReachable;
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Failed to check network status', error);
      return false;
    }
  },

  /**
   * Queue an offline operation (will sync when online)
   * @param {string} type - Operation type (status_update, photo_upload, task_resolution)
   * @param {string} taskId - Task ID
   * @param {object} data - Operation data
   * @returns {Promise<string>} Queue entry ID
   */
  queueOperation: async (type, taskId, data) => {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = queueJson ? JSON.parse(queueJson) : [];

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        taskId,
        data,
        timestamp: new Date().toISOString(),
        retries: 0,
      };

      queue.push(entry);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

      logger.info(COMPONENT_NAME, `Queued operation: ${type} for task ${taskId}`);
      return entry.id;
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Failed to queue operation', error);
      throw error;
    }
  },

  /**
   * Store photo locally for later upload
   * @param {string} taskId - Task ID
   * @param {string} photoUri - Local file URI
   * @param {string} photoType - 'before' or 'after'
   * @returns {Promise<string>} Photo ID for reference
   */
  storePhotoOffline: async (taskId, photoUri, photoType) => {
    try {
      const photosJson = await AsyncStorage.getItem(OFFLINE_PHOTOS_KEY);
      const photos = photosJson ? JSON.parse(photosJson) : [];

      const photoId = `${taskId}-${photoType}-${Date.now()}`;
      photos.push({
        id: photoId,
        taskId,
        type: photoType,
        uri: photoUri,
        timestamp: new Date().toISOString(),
        synced: false,
      });

      await AsyncStorage.setItem(OFFLINE_PHOTOS_KEY, JSON.stringify(photos));
      logger.info(COMPONENT_NAME, `Stored ${photoType} photo offline for task ${taskId}`);
      return photoId;
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Failed to store photo offline', error);
      throw error;
    }
  },

  /**
   * Get all queued operations
   * @returns {Promise<Array>} List of pending operations
   */
  getQueuedOperations: async () => {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Failed to retrieve queue', error);
      return [];
    }
  },

  /**
   * Get all offline photos pending upload
   * @returns {Promise<Array>} List of offline photos
   */
  getOfflinePhotos: async () => {
    try {
      const photosJson = await AsyncStorage.getItem(OFFLINE_PHOTOS_KEY);
      return photosJson ? JSON.parse(photosJson) : [];
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Failed to retrieve offline photos', error);
      return [];
    }
  },

  /**
   * Remove operation from queue after successful sync
   * @param {string} operationId - Operation ID to remove
   */
  removeQueuedOperation: async (operationId) => {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = queueJson ? JSON.parse(queueJson) : [];
      const filtered = queue.filter((op) => op.id !== operationId);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
      logger.info(COMPONENT_NAME, `Operation ${operationId} removed from queue`);
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Failed to remove operation from queue', error);
    }
  },

  /**
   * Mark photo as synced on server
   * @param {string} photoId - Photo ID
   */
  markPhotoSynced: async (photoId) => {
    try {
      const photosJson = await AsyncStorage.getItem(OFFLINE_PHOTOS_KEY);
      const photos = photosJson ? JSON.parse(photosJson) : [];
      const updated = photos.map((p) =>
        p.id === photoId ? { ...p, synced: true } : p
      );
      await AsyncStorage.setItem(OFFLINE_PHOTOS_KEY, JSON.stringify(updated));
      logger.info(COMPONENT_NAME, `Photo ${photoId} marked as synced`);
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Failed to mark photo as synced', error);
    }
  },

  /**
   * Clear all offline data (use after successful sync)
   */
  clearOfflineData: async () => {
    try {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      await AsyncStorage.removeItem(OFFLINE_PHOTOS_KEY);
      logger.info(COMPONENT_NAME, 'All offline data cleared');
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Failed to clear offline data', error);
    }
  },

  /**
   * Sync all queued operations to the server via POST /sync.
   * Maps local queue entries to the backend SyncAction format and processes results.
   * Successfully synced operations are removed from the queue.
   * @returns {Promise<{synced: number, failed: number}>}
   */
  syncToServer: async () => {
    try {
      const online = await OfflineSync.isOnline();
      if (!online) {
        logger.info(COMPONENT_NAME, 'Skipping sync — device is offline');
        return { synced: 0, failed: 0 };
      }

      const operations = await OfflineSync.getQueuedOperations();
      if (operations.length === 0) {
        return { synced: 0, failed: 0 };
      }

      // Map local queue format → backend SyncAction format
      const TYPE_TO_ACTION = {
        status_update: 'start_task',
        task_resolution: 'accept_task',
      };
      const actions = operations.map((op) => ({
        action: TYPE_TO_ACTION[op.type] || op.type,
        issue_id: op.taskId || null,
        payload: op.data || {},
        timestamp: op.timestamp,
        client_id: op.id,
      }));

      const { data } = await syncApi.syncOfflineActions(actions);
      let synced = 0;
      let failed = 0;

      for (const result of data.results || []) {
        if (result.success) {
          await OfflineSync.removeQueuedOperation(result.client_id);
          synced++;
        } else {
          logger.warn(COMPONENT_NAME, `Sync failed for ${result.client_id}: ${result.error}`);
          failed++;
        }
      }

      logger.info(COMPONENT_NAME, `Sync complete: ${synced} synced, ${failed} failed`);
      return { synced, failed };
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Sync to server failed', error);
      return { synced: 0, failed: 0 };
    }
  },

  /**
   * Get offline queue statistics
   * @returns {Promise<object>} Queue stats (pending count, photo count, oldest operation)
   */
  getQueueStats: async () => {
    try {
      const operations = await OfflineSync.getQueuedOperations();
      const photos = await OfflineSync.getOfflinePhotos();
      const unSyncedPhotos = photos.filter((p) => !p.synced);

      return {
        pendingOperations: operations.length,
        unSyncedPhotos: unSyncedPhotos.length,
        totalPhotos: photos.length,
        oldestOperation: operations.length > 0 ? operations[0].timestamp : null,
      };
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Failed to get queue stats', error);
      return { pendingOperations: 0, unSyncedPhotos: 0, totalPhotos: 0 };
    }
  },
};
