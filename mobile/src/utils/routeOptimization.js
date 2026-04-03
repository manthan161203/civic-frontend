/**
 * Route Optimization for Worker Tasks
 * ====================================
 * Sorts assigned tasks by proximity to current location using:
 * - Current GPS location
 * - Haversine distance formula for geographic calculations
 * - Clustering for efficient route planning
 * 
 * Purpose: Help workers plan optimal daily routes to minimize travel time
 */

import * as Location from 'expo-location';
import { logger } from './logger';

const COMPONENT_NAME = 'RouteOptimization';

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Starting latitude
 * @param {number} lon1 - Starting longitude
 * @param {number} lat2 - Ending latitude
 * @param {number} lon2 - Ending longitude
 * @returns {number} Distance in kilometers
 */
const _haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate center point (centroid) of multiple coordinates
 * @private
 * @param {Array} coordinates - Array of {latitude, longitude} objects
 * @returns {object} Center point {latitude, longitude}
 */
const _calculateCentroid = (coordinates) => {
  if (coordinates.length === 0) return null;
  
  const sum = coordinates.reduce(
    (acc, coord) => ({
      lat: acc.lat + coord.latitude,
      lon: acc.lon + coord.longitude,
    }),
    { lat: 0, lon: 0 }
  );

  return {
    latitude: sum.lat / coordinates.length,
    longitude: sum.lon / coordinates.length,
  };
};

export const RouteOptimization = {
  /**
   * Get current device location (requires permission)
   * @returns {Promise<object>} Location object {latitude, longitude, accuracy}
   * @throws {Error} If location permission denied or service unavailable
   */
  getCurrentLocation: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const result = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };

      logger.info(COMPONENT_NAME, 'Current location retrieved', result);
      return result;
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Failed to get current location', error);
      throw error;
    }
  },

  /**
   * Sort tasks by proximity to current location
   * Uses nearest-neighbor algorithm for efficient routing
   * @param {Array} tasks - Array of task objects with latitude/longitude
   * @param {object} currentLocation - {latitude, longitude} of worker's current position
   * @returns {Array} Tasks sorted by proximity (nearest first)
   */
  optimizeRoute: (tasks, currentLocation) => {
    try {
      if (!tasks || tasks.length === 0) {
        logger.warn(COMPONENT_NAME, 'No tasks to optimize');
        return [];
      }

      if (!currentLocation?.latitude || !currentLocation?.longitude) {
        logger.error(COMPONENT_NAME, 'Invalid current location', currentLocation);
        return tasks;
      }

      // Calculate distance for each task
      const tasksWithDistance = tasks.map((task) => ({
        ...task,
        distance: _haversineDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          task.latitude,
          task.longitude
        ),
      }));

      // Sort by distance (nearest first)
      const optimized = tasksWithDistance.sort((a, b) => a.distance - b.distance);

      logger.info(
        COMPONENT_NAME,
        `Route optimized: ${tasks.length} tasks sorted by proximity`,
        { totalDistance: optimized.reduce((sum, t) => sum + t.distance, 0).toFixed(2) + ' km' }
      );

      return optimized;
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Route optimization failed', error);
      return tasks; // Return unsorted list on error
    }
  },

  /**
   * Cluster nearby tasks into groups (useful for batching)
   * Uses k-means inspired clustering based on proximity
   * @param {Array} tasks - Tasks with latitude/longitude
   * @param {number} clusterRadius - Radius in kilometers to consider as same cluster
   * @returns {Array} Array of clusters, each containing nearby tasks
   */
  clusterTasks: (tasks, clusterRadius = 1) => {
    try {
      if (!tasks || tasks.length === 0) return [];

      const clusters = [];
      const processed = new Set();

      for (const task of tasks) {
        if (processed.has(task.id)) continue;

        const cluster = [task];
        processed.add(task.id);

        for (const other of tasks) {
          if (processed.has(other.id)) continue;

          const distance = _haversineDistance(
            task.latitude,
            task.longitude,
            other.latitude,
            other.longitude
          );

          if (distance <= clusterRadius) {
            cluster.push(other);
            processed.add(other.id);
          }
        }

        clusters.push(cluster);
      }

      logger.info(
        COMPONENT_NAME,
        `Clustered ${tasks.length} tasks into ${clusters.length} groups`,
        { clusterRadius: `${clusterRadius}km` }
      );

      return clusters;
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Task clustering failed', error);
      return tasks.map((t) => [t]); // Return each task as separate cluster
    }
  },

  /**
   * Calculate total distance for recommended route
   * @param {Array} tasks - Sorted tasks
   * @param {object} startLocation - Starting position
   * @returns {number} Total distance in kilometers
   */
  calculateTotalDistance: (tasks, startLocation) => {
    try {
      if (!tasks || tasks.length === 0 || !startLocation) return 0;

      let total = 0;
      let prev = startLocation;

      for (const task of tasks) {
        total += _haversineDistance(
          prev.latitude,
          prev.longitude,
          task.latitude,
          task.longitude
        );
        prev = { latitude: task.latitude, longitude: task.longitude };
      }

      return Math.round(total * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Distance calculation failed', error);
      return 0;
    }
  },

  /**
   * Estimate time needed to complete all tasks
   * Assumes average 30 minutes per task + travel time at 40 km/h
   * @param {Array} tasks - Tasks to complete
   * @param {object} startLocation - Starting location
   * @returns {object} Estimate {minPerTask, travelTime, totalMinutes, endTime}
   */
  estimateCompletionTime: (tasks, startLocation) => {
    try {
      const minPerTask = 30; // Average 30 minutes per task
      const speedKmPerHour = 40; // Average travel speed
      
      const distance = RouteOptimization.calculateTotalDistance(tasks, startLocation);
      const travelMinutes = (distance / speedKmPerHour) * 60;
      const totalMinutes = tasks.length * minPerTask + travelMinutes;

      const now = new Date();
      const endTime = new Date(now.getTime() + totalMinutes * 60000);

      logger.info(COMPONENT_NAME, 'Completion time estimated', {
        taskCount: tasks.length,
        totalDistance: `${distance}km`,
        totalMinutes: Math.round(totalMinutes),
      });

      return {
        minPerTask,
        travelTimeMinutes: Math.round(travelMinutes),
        totalMinutes: Math.round(totalMinutes),
        endTime: endTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };
    } catch (error) {
      logger.error(COMPONENT_NAME, 'Time estimation failed', error);
      return { minPerTask: 30, travelTimeMinutes: 0, totalMinutes: 0, endTime: null };
    }
  },
};
