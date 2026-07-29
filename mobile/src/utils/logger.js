/**
 * Logger Utility for React Native Mobile App
 * ==========================================
 * Provides structured logging with multiple levels (DEBUG, INFO, WARN, ERROR)
 * Logs are stored locally on device and can be uploaded for debugging
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const COLORS = {
  DEBUG: '\u001b[35m', // Purple
  INFO: '\u001b[36m',  // Cyan
  WARN: '\u001b[33m',  // Yellow
  ERROR: '\u001b[31m', // Red
  RESET: '\u001b[0m',
};

const STORAGE_KEY = 'app_logs';
const MAX_LOG_ENTRIES = 500; // Keep only last 500 logs in storage
const DEV_MODE = process.env.NODE_ENV !== 'production';

/**
 * Write log entry to AsyncStorage
 * @private
 */
const _writeToStorage = async (logEntry) => {
  try {
    const logsJson = await AsyncStorage.getItem(STORAGE_KEY);
    const logs = logsJson ? JSON.parse(logsJson) : [];
    logs.push(logEntry);
    
    // Keep only last N entries to avoid storage bloat
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    }
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to write logs to storage:', err);
  }
};

/**
 * Format timestamp for logging
 * @private
 */
const _formatTime = () => {
  const now = new Date();
  return now.toISOString().slice(11, 19); // HH:MM:SS
};

/**
 * Extra destinations for log records.
 *
 * Console and AsyncStorage stay; this is the seam a crash reporter attaches to:
 *
 *   import * as Sentry from '@sentry/react-native';
 *   addLogSink((record) => {
 *     if (record.level === 'ERROR') {
 *       Sentry.captureException(record.error ?? new Error(record.message), {
 *         tags: { component: record.component, request_id: record.requestId },
 *       });
 *     }
 *   });
 *
 * @type {((record: object) => void)[]}
 */
const sinks = [];

/** @param {(record: object) => void} fn @returns {() => void} unsubscribe */
export function addLogSink(fn) {
  sinks.push(fn);
  return () => {
    const i = sinks.indexOf(fn);
    if (i >= 0) sinks.splice(i, 1);
  };
}

/**
 * Turn a thrown value into something that survives JSON.stringify.
 *
 * `error.message` alone loses the stack — and for an ApiError it also loses
 * `kind`, `status` and `requestId`, the last of which is the join key between
 * this log line and the backend one that caused it.
 *
 * @private
 */
const _serialiseError = (error) => {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.kind ? { kind: error.kind } : {}),
      ...(error.status ? { status: error.status } : {}),
      ...(error.requestId ? { requestId: error.requestId } : {}),
    };
  }
  return { name: 'NonError', message: String(error) };
};

/**
 * Core logging function
 * @private
 */
const _log = (level, component, message, data) => {
  const timestamp = _formatTime();
  const logEntry = {
    timestamp,
    level,
    component,
    message,
    data: data || null,
  };
  
  // Format console output with color
  const color = COLORS[level] || '';
  const reset = COLORS.RESET;
  console.log(
    `${color}[${timestamp}] [${level}] [${component}] ${message}${reset}`,
    data || ''
  );
  
  // Store in AsyncStorage for debugging
  _writeToStorage(logEntry);

  // Fan out. Wrapped because a logger that throws takes down the code path it
  // was reporting on.
  for (const sink of sinks) {
    try {
      sink(logEntry);
    } catch {
      /* a broken sink must not break the caller */
    }
  }
};

export const logger = {
  /**
   * Debug level — detailed diagnostic information
   * Use in development for tracing code execution
   */
  debug: (component, message, data) => {
    if (DEV_MODE) _log('DEBUG', component, message, data);
  },

  /**
   * Info level — general informational messages
   * Use for tracking key app events (login, submission, etc.)
   */
  info: (component, message, data) => {
    _log('INFO', component, message, data);
  },

  /**
   * Warn level — warning messages for suspicious behavior
   * Use when something unexpected happens but app continues
   */
  warn: (component, message, data) => {
    _log('WARN', component, message, data);
  },

  /**
   * Error level — error messages for failures
   * Use when errors occur that need investigation
   */
  error: (component, message, error, meta) => {
    // Previously `error?.message || String(error)` — which discarded the stack,
    // and for an ApiError discarded `kind`, `status` and `requestId` too, so a
    // logged failure could not be traced back to the request that caused it.
    const serialised = _serialiseError(error);
    _log('ERROR', component, message, {
      ...(serialised ? { error: serialised } : {}),
      ...(meta ? { meta } : {}),
      ...(serialised?.requestId ? { requestId: serialised.requestId } : {}),
    });
  },

  /**
   * Retrieve all stored logs from AsyncStorage
   * Useful for debugging and uploading to server
   */
  getLogs: async () => {
    try {
      const logsJson = await AsyncStorage.getItem(STORAGE_KEY);
      return logsJson ? JSON.parse(logsJson) : [];
    } catch {
      return [];
    }
  },

  /**
   * Clear all stored logs from AsyncStorage
   */
  clearLogs: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      console.error('Failed to clear logs');
    }
  },
};
