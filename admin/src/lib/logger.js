/**
 * Logger Utility for Admin Dashboard
 * ===================================
 * Provides a centralized logging system with different log levels
 * (debug, info, warn, error) for consistent error tracking and debugging.
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('Failed to fetch data:', error);
 *   logger.info('Data loaded successfully');
 */

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

const LOG_COLORS = {
  DEBUG: '#7c3aed', // purple
  INFO: '#3b82f6',  // blue
  WARN: '#f59e0b',  // amber
  ERROR: '#ef4444', // red
};

/**
 * Format log timestamp in ISO format with milliseconds
 * @returns {string} ISO datetime string
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Create a formatted log message
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} context - Context/module name
 * @param {string} message - Log message
 * @param {*} data - Additional data to log
 * @returns {string} Formatted log message
 */
const formatLog = (level, context, message, data) => {
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${level}] [${context}]`;
  
  if (data) {
    return `${prefix} ${message}`, data;
  }
  return `${prefix} ${message}`;
};

/**
 * Logger object with methods for different log levels
 */
export const logger = {
  /**
   * Log debug-level messages (development only)
   * @param {string} context - Context/module name
   * @param {string} message - Log message
   * @param {*} data - Optional additional data
   */
  debug: (context, message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      const [msg, d] = formatLog(LOG_LEVELS.DEBUG, context, message, data).split('\n');
      console.debug(
        `%c${msg}`,
        `color: ${LOG_COLORS.DEBUG}; font-weight: bold;`,
        d || ''
      );
    }
  },

  /**
   * Log info-level messages
   * @param {string} context - Context/module name
   * @param {string} message - Log message
   * @param {*} data - Optional additional data
   */
  info: (context, message, data = null) => {
    const [msg, d] = formatLog(LOG_LEVELS.INFO, context, message, data).split('\n');
    console.info(
      `%c${msg}`,
      `color: ${LOG_COLORS.INFO}; font-weight: bold;`,
      d || ''
    );
  },

  /**
   * Log warning-level messages
   * @param {string} context - Context/module name
   * @param {string} message - Log message
   * @param {*} data - Optional additional data
   */
  warn: (context, message, data = null) => {
    const [msg, d] = formatLog(LOG_LEVELS.WARN, context, message, data).split('\n');
    console.warn(
      `%c${msg}`,
      `color: ${LOG_COLORS.WARN}; font-weight: bold;`,
      d || ''
    );
  },

  /**
   * Log error-level messages
   * @param {string} context - Context/module name
   * @param {string} message - Log message
   * @param {Error} error - Error object
   * @param {*} data - Optional additional data
   */
  error: (context, message, error = null, data = null) => {
    const [msg, d] = formatLog(LOG_LEVELS.ERROR, context, message, data).split('\n');
    console.error(
      `%c${msg}`,
      `color: ${LOG_COLORS.ERROR}; font-weight: bold;`,
      error ? { error: error.message, stack: error.stack, details: d } : (d || '')
    );
  },
};
