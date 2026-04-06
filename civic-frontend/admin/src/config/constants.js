/**
 * Central Configuration and Constants for Civic Frontend
 * =====================================================
 *
 * Centralized constants, configuration values, and magic numbers for both
 * admin and mobile frontends. Makes maintenance and updates easy.
 *
 * Usage:
 *   import {
 *     MAX_PHOTO_SIZE_MB,
 *     ISSUE_STATUS_CLOSED,
 *     PAGINATION_SIZE,
 *     API_TIMEOUT_MS
 *   } from '@/config/constants';
 */

// ─────────────────────────────────────────────────────────────────────────────
// API CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const API_TIMEOUT_MS = 30000;
/** Default timeout for API calls in milliseconds. */

export const API_CONNECTIVITY_TIMEOUT_MS = 5000;
/** Timeout for checking network connectivity. */

export const API_RETRY_MAX_ATTEMPTS = 3;
/** Maximum retry attempts for failed API calls. */

export const API_RETRY_INITIAL_DELAY_MS = 1000;
/** Initial delay for API retry in milliseconds. */

export const API_RETRY_MAX_DELAY_MS = 30000;
/** Maximum delay between API retries in milliseconds. */

export const API_RETRY_BACKOFF_MULTIPLIER = 2;
/** Exponential backoff multiplier for retries. */

// ─────────────────────────────────────────────────────────────────────────────
// FILE UPLOAD CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_PHOTO_SIZE_MB = 10;
/** Maximum photo file size in megabytes. */

export const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;
/** Maximum photo file size in bytes. */

export const ALLOWED_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
/** Allowed photo file extensions. */

export const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Allowed MIME types for photos. */

export const MAX_PHOTOS_PER_ISSUE = 10;
/** Maximum number of photos per issue. */

export const MAX_PHOTOS_BEFORE = 5;
/** Maximum before photos per issue. */

export const MAX_PHOTOS_AFTER = 5;
/** Maximum after photos per issue. */

// ─────────────────────────────────────────────────────────────────────────────
// ISSUE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const ISSUE_STATUS_OPEN = 'open';
export const ISSUE_STATUS_ASSIGNED = 'assigned';
export const ISSUE_STATUS_IN_PROGRESS = 'in_progress';
export const ISSUE_STATUS_RESOLVED = 'resolved';
export const ISSUE_STATUS_CLOSED = 'closed';

export const ISSUE_STATUSES = {
  [ISSUE_STATUS_OPEN]: { label: 'Open', color: '#3B82F6', icon: 'circle-outline' },
  [ISSUE_STATUS_ASSIGNED]: { label: 'Assigned', color: '#8B5CF6', icon: 'user-check' },
  [ISSUE_STATUS_IN_PROGRESS]: { label: 'In Progress', color: '#F59E0B', icon: 'clock' },
  [ISSUE_STATUS_RESOLVED]: { label: 'Resolved', color: '#10B981', icon: 'check-circle' },
  [ISSUE_STATUS_CLOSED]: { label: 'Closed', color: '#6B7280', icon: 'lock' },
};

export const ISSUE_TYPES = [
  'garbage',
  'pothole',
  'streetlight',
  'drain',
  'water',
  'waste',
  'other'
];

export const ISSUE_PRIORITIES = {
  urgent: { label: 'Urgent', color: '#DC2626', value: 1 },
  high: { label: 'High', color: '#F59E0B', value: 2 },
  medium: { label: 'Medium', color: '#3B82F6', value: 3 },
  low: { label: 'Low', color: '#10B981', value: 4 },
};

export const ISSUE_SEVERITY = {
  high: { label: 'High', color: '#DC2626' },
  medium: { label: 'Medium', color: '#F59E0B' },
  low: { label: 'Low', color: '#10B981' },
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION & LISTING
// ─────────────────────────────────────────────────────────────────────────────

export const PAGINATION_DEFAULT_SIZE = 20;
/** Default items per page. */

export const PAGINATION_MAX_SIZE = 200;
/** Maximum items per page to prevent performance issues. */

export const PAGINATION_SIZE_OPTIONS = [10, 20, 50, 100];
/** Available pagination size options. */

export const INFINITE_SCROLL_THRESHOLD = 500;
/** Pixels from bottom to trigger infinite scroll load (mobile). */

// ─────────────────────────────────────────────────────────────────────────────
// RATING & FEEDBACK
// ─────────────────────────────────────────────────────────────────────────────

export const MIN_CITIZEN_RATING = 1;
export const MAX_CITIZEN_RATING = 5;

export const RATING_STARS = {
  1: { label: 'Poor', color: '#DC2626', emoji: '😞' },
  2: { label: 'Fair', color: '#F59E0B', emoji: '😐' },
  3: { label: 'Good', color: '#3B82F6', emoji: '🙂' },
  4: { label: 'Very Good', color: '#10B981', emoji: '😊' },
  5: { label: 'Excellent', color: '#059669', emoji: '😍' },
};

export const MAX_FEEDBACK_LENGTH = 1000;
/** Maximum characters for feedback/comments. */

// ─────────────────────────────────────────────────────────────────────────────
// DATE & TIME
// ─────────────────────────────────────────────────────────────────────────────

export const DATE_FORMAT_DISPLAY = 'MMM DD, YYYY';
/** Date format for UI display. */

export const DATE_FORMAT_API = 'YYYY-MM-DD';
/** Date format for API communication. */

export const TIME_FORMAT_DISPLAY = 'hh:mm A';
/** Time format for UI display. */

export const TIME_FORMAT_FULL = 'MMM DD, YYYY hh:mm A';
/** Full datetime format for UI display. */

export const DEBOUNCE_SEARCH_MS = 500;
/** Debounce delay for search inputs in milliseconds. */

export const DEBOUNCE_FORM_MS = 300;
/** Debounce delay for form inputs in milliseconds. */

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE & LOCALIZATION
// ─────────────────────────────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = ['en', 'gu', 'hi'];
export const DEFAULT_LANGUAGE = 'en';

export const LANGUAGE_NAMES = {
  en: 'English',
  gu: 'Gujarati',
  hi: 'Hindi',
};

// ─────────────────────────────────────────────────────────────────────────────
// SORT & FILTER OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const ISSUE_SORT_OPTIONS = [
  { value: 'created_at_desc', label: 'Newest First' },
  { value: 'created_at_asc', label: 'Oldest First' },
  { value: 'updated_at_desc', label: 'Recently Updated' },
  { value: 'priority_asc', label: 'Most Urgent' },
  { value: 'rating_desc', label: 'Highest Rated' },
];

export const TIME_PERIOD_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export const WORKER_SORT_OPTIONS = [
  { value: 'rating_desc', label: 'Highest Rated' },
  { value: 'resolved_issues_desc', label: 'Most Issues Resolved' },
  { value: 'points_desc', label: 'Most Points' },
  { value: 'name_asc', label: 'A to Z' },
];

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const DISPUTE_STATUS_OPEN = 'open';
export const DISPUTE_STATUS_UNDER_REVIEW = 'under_review';
export const DISPUTE_STATUS_ACCEPTED = 'accepted';
export const DISPUTE_STATUS_REJECTED = 'rejected';

export const DISPUTE_STATUSES = {
  [DISPUTE_STATUS_OPEN]: { label: 'Open', color: '#3B82F6', icon: 'circle-outline' },
  [DISPUTE_STATUS_UNDER_REVIEW]: { label: 'Under Review', color: '#F59E0B', icon: 'eye' },
  [DISPUTE_STATUS_ACCEPTED]: { label: 'Accepted', color: '#10B981', icon: 'check-circle' },
  [DISPUTE_STATUS_REJECTED]: { label: 'Rejected', color: '#DC2626', icon: 'x-circle' },
};

// ─────────────────────────────────────────────────────────────────────────────
// USER ROLES
// ─────────────────────────────────────────────────────────────────────────────

export const USER_ROLE_CITIZEN = 'citizen';
export const USER_ROLE_WORKER = 'worker';
export const USER_ROLE_ADMIN = 'admin';
export const USER_ROLE_WARD_ADMIN = 'ward_admin';
export const USER_ROLE_TALUKA_ADMIN = 'taluka_admin';
export const USER_ROLE_DISTRICT_ADMIN = 'district_admin';

export const USER_ROLES = {
  [USER_ROLE_CITIZEN]: { label: 'Citizen', color: '#3B82F6' },
  [USER_ROLE_WORKER]: { label: 'Worker', color: '#10B981' },
  [USER_ROLE_ADMIN]: { label: 'Admin', color: '#DC2626' },
  [USER_ROLE_WARD_ADMIN]: { label: 'Ward Admin', color: '#F59E0B' },
  [USER_ROLE_TALUKA_ADMIN]: { label: 'Taluka Admin', color: '#8B5CF6' },
  [USER_ROLE_DISTRICT_ADMIN]: { label: 'District Admin', color: '#EC4899' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE SPECIFIC
// ─────────────────────────────────────────────────────────────────────────────

export const MOBILE_SYNC_INTERVAL_MS = 60000;
/** Interval for syncing offline queue in milliseconds (1 minute). */

export const MOBILE_OFFLINE_QUEUE_MAX_SIZE = 100;
/** Maximum items in offline queue before discarding oldest. */

export const MOBILE_LOCATION_UPDATE_INTERVAL_MS = 30000;
/** Interval for updating location in milliseconds. */

export const MOBILE_LOCATION_ACCURACY_THRESHOLD_M = 50;
/** Minimum location accuracy in meters. */

export const MOBILE_MAP_ZOOM_DEFAULT = 15;
/** Default map zoom level. */

export const MOBILE_MAP_ZOOM_DETAIL = 18;
/** Zoom level for issue detail view. */

// ─────────────────────────────────────────────────────────────────────────────
// CACHE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const CACHE_DURATION_MS = 5 * 60 * 1000;
/** Default cache duration in milliseconds (5 minutes). */

export const CACHE_DURATION_LONG_MS = 60 * 60 * 1000;
/** Long-term cache duration in milliseconds (1 hour). */

export const CACHE_DURATION_SHORT_MS = 30 * 1000;
/** Short-term cache duration in milliseconds (30 seconds). */

// ─────────────────────────────────────────────────────────────────────────────
// UI/UX CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const TOAST_DURATION_MS = 3000;
/** Duration for toast notifications in milliseconds. */

export const TOAST_DURATION_ERROR_MS = 5000;
/** Duration for error toast in milliseconds. */

export const MODAL_ANIMATION_DURATION_MS = 300;
/** Modal animation duration in milliseconds. */

export const SUCCESS_ANIMATION_DURATION_MS = 1000;
/** Success animation duration in milliseconds. */

export const LOADING_SKELETON_COUNT = 5;
/** Number of skeleton items to show while loading. */

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 50;

export const MIN_PHONE_LENGTH = 10;
export const MAX_PHONE_LENGTH = 15;

export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;
export const MIN_LONGITUDE = -180;
export const MAX_LONGITUDE = 180;

export const MAX_DESCRIPTION_LENGTH = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// GEOFENCE & LOCATION
// ─────────────────────────────────────────────────────────────────────────────

export const GEOFENCE_ZONE_RADIUS_KM = 5;
/** Default geofence zone radius in kilometers. */

export const SOS_BROADCAST_RADIUS_KM = 5;
/** SOS alert broadcast radius in kilometers. */

export const MAP_CENTER_LATITUDE = 22.3072;
/** Default map center latitude (Gujarat, India). */

export const MAP_CENTER_LONGITUDE = 71.8023;
/** Default map center longitude (Gujarat, India). */

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAGS
// ─────────────────────────────────────────────────────────────────────────────

export const FEATURE_FLAGS = {
  AI_INSIGHTS: true,
  GEOFENCE: true,
  SOS_EMERGENCY: true,
  OFFLINE_MODE: true,
  CUSTOM_ISSUE_TYPES: true,
  LEADERBOARD: true,
  REWARD_SYSTEM: true,
  DISPUTES: true,
  SURVEYS: true,
};

/** Check if feature is enabled */
export function isFeatureEnabled(featureName) {
  return FEATURE_FLAGS[featureName] === true;
}
