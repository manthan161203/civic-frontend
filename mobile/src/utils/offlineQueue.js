import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const OFFLINE_QUEUE_KEY = 'offline_action_queue';

/**
 * Offline action queue system for mobile app
 * Stores actions locally when offline and syncs when back online
 */

export class OfflineQueue {
  /**
   * Add an action to the offline queue
   * @param {string} action - Action type (update_task, add_note, capture_photo, etc.)
   * @param {object} payload - Action payload
   * @param {string} clientId - Unique client ID for deduplication
   * @returns {Promise<string>} Queue ID for tracking
   */
  static async addAction(action, payload, clientId = null) {
    try {
      const queueId = uuidv4();
      const queuedAt = new Date().toISOString();
      
      const item = {
        id: queueId,
        action,
        payload,
        clientId: clientId || `${action}-${queueId}`,
        queuedAt,
        retries: 0,
        maxRetries: 3,
        lastError: null,
      };

      const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = existing ? JSON.parse(existing) : [];
      queue.push(item);

      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      return queueId;
    } catch (error) {
      console.error('Failed to add offline action:', error);
      throw error;
    }
  }

  /**
   * Get all queued actions
   * @returns {Promise<array>} Array of queued actions
   */
  static async getQueue() {
    try {
      const queue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Failed to get offline queue:', error);
      return [];
    }
  }

  /**
   * Remove an action from the queue after successful sync
   * @param {string} queueId - ID of the queued action
   */
  static async removeAction(queueId) {
    try {
      const queue = await this.getQueue();
      const filtered = queue.filter((item) => item.id !== queueId);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove action from queue:', error);
    }
  }

  /**
   * Update action with error and retry count
   * @param {string} queueId - ID of the queued action
   * @param {string} error - Error message
   */
  static async updateActionError(queueId, error) {
    try {
      const queue = await this.getQueue();
      const index = queue.findIndex((item) => item.id === queueId);
      if (index !== -1) {
        queue[index].retries += 1;
        queue[index].lastError = error;
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Failed to update action error:', error);
    }
  }

  /**
   * Clear the entire queue (e.g., on logout)
   */
  static async clearQueue() {
    try {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
    }
  }

  /**
   * Get queue statistics for UI display
   * @returns {Promise<object>} Queue stats
   */
  static async getStats() {
    try {
      const queue = await this.getQueue();
      return {
        total: queue.length,
        pending: queue.filter((item) => item.retries === 0).length,
        retrying: queue.filter((item) => item.retries > 0 && item.retries < item.maxRetries).length,
        failed: queue.filter((item) => item.retries >= item.maxRetries).length,
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return { total: 0, pending: 0, retrying: 0, failed: 0 };
    }
  }
}

/**
 * Sync manager for processing offline queue
 * Handles retries, conflicts, and deduplication
 */
export class SyncManager {
  /**
   * Sync all pending actions with the backend
   * @param {function} apiCall - Function to make API calls
   * @param {function} onProgress - Callback for progress updates
   * @returns {Promise<object>} Sync results
   */
  static async syncQueue(apiCall, onProgress = null) {
    try {
      const queue = await OfflineQueue.getQueue();
      if (queue.length === 0) {
        return { success: true, synced: 0, failed: 0, deferred: 0 };
      }

      let synced = 0;
      let failed = 0;
      let deferred = 0;

      // Group by action type to handle bulk operations
      const grouped = queue.reduce((acc, item) => {
        if (!acc[item.action]) acc[item.action] = [];
        acc[item.action].push(item);
        return acc;
      }, {});

      for (const [action, items] of Object.entries(grouped)) {
        for (const item of items) {
          // Skip if max retries exceeded
          if (item.retries >= item.maxRetries) {
            failed++;
            if (onProgress) onProgress({ type: 'failed', action, itemId: item.id });
            continue;
          }

          try {
            // Deduplication check - don't process if same clientId already synced
            const isDuplicate = await this._checkDuplicate(item.clientId);
            if (isDuplicate) {
              await OfflineQueue.removeAction(item.id);
              deferred++;
              if (onProgress) onProgress({ type: 'duplicate', action, itemId: item.id });
              continue;
            }

            // Process the action
            const result = await apiCall(action, item.payload, item.clientId);

            if (result.success) {
              await OfflineQueue.removeAction(item.id);
              synced++;
              if (onProgress) onProgress({ type: 'success', action, itemId: item.id, data: result.data });
            } else {
              await OfflineQueue.updateActionError(item.id, result.error);
              failed++;
              if (onProgress) onProgress({ type: 'error', action, itemId: item.id, error: result.error });
            }
          } catch (error) {
            await OfflineQueue.updateActionError(item.id, error.message);
            failed++;
            if (onProgress) onProgress({ type: 'error', action, itemId: item.id, error: error.message });
          }
        }
      }

      return { success: true, synced, failed, deferred };
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, error: error.message, synced: 0, failed: 0, deferred: 0 };
    }
  }

  /**
   * Check if action was already processed (duplicate detection)
   * @private
   */
  static async _checkDuplicate(clientId) {
    try {
      const syncedClients = await AsyncStorage.getItem('synced_clients');
      const clients = syncedClients ? JSON.parse(syncedClients) : [];
      return clients.includes(clientId);
    } catch {
      return false;
    }
  }

  /**
   * Mark action as synced to prevent duplicates
   * @private
   */
  static async _markAsSynced(clientId) {
    try {
      const syncedClients = await AsyncStorage.getItem('synced_clients');
      const clients = syncedClients ? JSON.parse(syncedClients) : [];
      clients.push(clientId);
      
      // Keep last 1000 synced IDs to avoid infinite array growth
      const limitedClients = clients.slice(-1000);
      await AsyncStorage.setItem('synced_clients', JSON.stringify(limitedClients));
    } catch (error) {
      console.error('Failed to mark as synced:', error);
    }
  }
}

/**
 * Hook for managing offline status and sync operations
 * Usage in components:
 * const { isOnline, isSync, syncProgress, triggerSync } = useOfflineSync();
 */
export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [queueStats, setQueueStats] = useState({ total: 0, pending: 0, retrying: 0, failed: 0 });

  // Monitor network connectivity
  useEffect(() => {
    const subscription = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected);
      if (state.isConnected) {
        triggerSync();
      }
    });

    return () => subscription?.unsubscribe?.();
  }, []);

  // Update queue stats
  useEffect(() => {
    const updateStats = async () => {
      const stats = await OfflineQueue.getStats();
      setQueueStats(stats);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const triggerSync = async (apiCall) => {
    setIsSyncing(true);
    setSyncProgress({ synced: 0, failed: 0, total: queueStats.total });

    const result = await SyncManager.syncQueue(apiCall, (progress) => {
      setSyncProgress((prev) => ({
        ...prev,
        [progress.type]: (prev[progress.type] || 0) + 1,
      }));
    });

    setIsSyncing(false);
    
    // Refresh stats
    const stats = await OfflineQueue.getStats();
    setQueueStats(stats);

    return result;
  };

  return {
    isOnline,
    isSyncing,
    syncProgress,
    queueStats,
    triggerSync,
  };
};

// Export default for convenience
export default OfflineQueue;
