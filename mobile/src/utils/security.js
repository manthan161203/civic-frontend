/**
 * Security Utilities for React Native (Mobile)
 * 
 * Location: mobile/src/utils/security.js
 */

/**
 * Escape special characters in strings
 */
export const escapeHtml = (text) => {
  if (!text) return '';
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * Sanitize URLs (prevent javascript: protocol)
 */
export const sanitizeUrl = (url) => {
  if (!url) return '';
  
  const trimmedUrl = url.trim().toLowerCase();
  if (trimmedUrl.startsWith('javascript:') || trimmedUrl.startsWith('data:')) {
    return '';
  }
  
  return url;
};

/**
 * Sanitize JSON data recursively
 */
export const sanitizeJson = (value) => {
  if (typeof value === 'string') {
    return escapeHtml(value);
  }
  
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeJson(item));
    }
    
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[escapeHtml(key)] = sanitizeJson(val);
    }
    return sanitized;
  }
  
  return value;
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate phone number
 */
export const isValidPhone = (phone) => {
  const regex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return regex.test(phone);
};

/**
 * Check for safe values
 */
export const isSafeValue = (value) => {
  if (typeof value === 'string') {
    return !/(javascript:|data:|vbscript:)/i.test(value);
  }
  return true;
};

/**
 * Rate limiter for form submissions
 */
export const createRateLimiter = (maxAttempts = 5, timeWindow = 60000) => {
  let attempts = 0;
  let windowStart = Date.now();

  return {
    check: () => {
      const now = Date.now();
      if (now - windowStart > timeWindow) {
        attempts = 0;
        windowStart = now;
      }
      attempts++;
      return attempts <= maxAttempts;
    },
    
    reset: () => {
      attempts = 0;
      windowStart = Date.now();
    },
    
    getRemaining: () => Math.max(0, maxAttempts - attempts),
  };
};

/**
 * Biometric authentication check (Expo)
 */
export const isBiometricAvailable = async () => {
  try {
    // Requires expo-local-authentication
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch {
    return false;
  }
};

export default {
  escapeHtml,
  sanitizeUrl,
  sanitizeJson,
  isValidEmail,
  isValidPhone,
  isSafeValue,
  createRateLimiter,
  isBiometricAvailable,
};
