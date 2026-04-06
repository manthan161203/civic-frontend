/**
 * Security Utilities - Input Sanitization
 * 
 * Prevents XSS attacks by sanitizing user input
 * Location: admin/src/utils/security.js
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML
 * 
 * @example
 * const safe = escapeHtml('<script>alert("xss")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
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
 * Sanitize URL to prevent javascript: and data: protocols
 * @param {string} url - URL to sanitize
 * @returns {string} Safe URL
 * 
 * @example
 * sanitizeUrl('javascript:alert("xss")'); // Returns empty string
 * sanitizeUrl('https://example.com'); // Returns 'https://example.com'
 */
export const sanitizeUrl = (url) => {
  if (!url) return '';
  
  const trimmedUrl = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (trimmedUrl.startsWith('javascript:') || trimmedUrl.startsWith('data:')) {
    return '';
  }
  
  return url;
};

/**
 * Remove potentially dangerous HTML tags and attributes
 * @param {string} html - HTML string to clean
 * @returns {string} Cleaned HTML
 * 
 * @example
 * cleanHtml('<p>Hello</p><script>alert(1)</script>');
 * // Returns: '<p>Hello</p>'
 */
export const cleanHtml = (html) => {
  if (!html) return '';
  
  // Remove script tags and content
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove on* event handlers
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove iframes
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // Remove style tags
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  return cleaned;
};

/**
 * Sanitize JSON input to prevent injection attacks
 * @param {*} value - Value to sanitize
 * @returns {*} Sanitized value
 * 
 * @example
 * const safe = sanitizeJson({ name: '<script>alert(1)</script>' });
 * // Returns: { name: '&lt;script&gt;alert(1)&lt;/script&gt;' }
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
 * Validate email format (basic check)
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate phone number (basic check)
 * @param {string} phone - Phone to validate
 * @returns {boolean} True if valid
 */
export const isValidPhone = (phone) => {
  const regex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return regex.test(phone);
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if value is safe to use in HTML
 * @param {*} value - Value to check
 * @returns {boolean} True if safe
 */
export const isSafeValue = (value) => {
  if (typeof value === 'string') {
    // Check for dangerous patterns
    return !/(javascript:|data:|vbscript:|onerror|onclick|<script)/i.test(value);
  }
  return true;
};

/**
 * Rate limit helper - prevents form submission spam
 * @returns {Object} Rate limiter object with check method
 */
export const createRateLimiter = (maxAttempts = 5, timeWindow = 60000) => {
  let attempts = 0;
  let windowStart = Date.now();

  return {
    check: () => {
      const now = Date.now();
      
      // Reset if time window expired
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
 * CSRF Token Management
 */
export const getCsrfToken = () => {
  // Token from meta tag set by backend
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  return token || localStorage.getItem('csrf_token');
};

export const setCsrfToken = (token) => {
  localStorage.setItem('csrf_token', token);
};

export const addCsrfTokenToRequest = (config) => {
  const token = getCsrfToken();
  if (token) {
    config.headers['X-CSRF-Token'] = token;
  }
  return config;
};

export default {
  escapeHtml,
  sanitizeUrl,
  cleanHtml,
  sanitizeJson,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isSafeValue,
  createRateLimiter,
  getCsrfToken,
  setCsrfToken,
  addCsrfTokenToRequest,
};
