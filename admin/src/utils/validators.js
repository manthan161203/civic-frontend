/**
 * Input validation schemas using Zod
 * Centralized validation for forms and API calls
 */

// For admin dashboard - using Zod

// ============================================================================
// Auth Schemas
// ============================================================================

/**
 * OTP Login validation
 */
export const loginSchema = {
  phone: (value) => {
    if (!value) return 'Phone is required';
    if (!/^\+?[1-9]\d{1,14}$/.test(value.replace(/\s/g, ''))) {
      return 'Invalid phone number format';
    }
    return null;
  },
};

/**
 * OTP Verification validation
 */
export const otpSchema = {
  code: (value) => {
    if (!value) return 'OTP is required';
    if (!/^\d{6}$/.test(value)) return 'OTP must be 6 digits';
    return null;
  },
};

/**
 * Profile update validation
 */
export const profileSchema = {
  name: (value) => {
    if (!value) return 'Name is required';
    if (value.length < 2) return 'Name must be at least 2 characters';
    if (value.length > 100) return 'Name must not exceed 100 characters';
    return null;
  },
  phone: (value) => {
    if (!value) return 'Phone is required';
    if (!/^\+?[1-9]\d{1,14}$/.test(value.replace(/\s/g, ''))) {
      return 'Invalid phone number format';
    }
    return null;
  },
  email: (value) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Invalid email format';
    }
    return null;
  },
};

// ============================================================================
// Worker Schemas
// ============================================================================

/**
 * Create/Update worker validation
 */
export const workerSchema = {
  name: (value) => {
    if (!value) return 'Name is required';
    if (value.length < 2) return 'Name must be at least 2 characters';
    return null;
  },
  phone: (value) => {
    if (!value) return 'Phone is required';
    if (!/^\+?[1-9]\d{1,14}$/.test(value.replace(/\s/g, ''))) {
      return 'Invalid phone number format';
    }
    return null;
  },
  ward: (value) => {
    if (!value) return 'Ward is required';
    return null;
  },
};

// ============================================================================
// Issue Schemas
// ============================================================================

/**
 * Create issue validation
 */
export const issueSchema = {
  issue_type: (value) => {
    const validTypes = ['roads', 'water', 'electricity', 'sanitation', 'parks', 'garbage', 'other'];
    if (!value) return 'Issue type is required';
    if (!validTypes.includes(value)) return `Issue type must be one of: ${validTypes.join(', ')}`;
    return null;
  },
  description: (value) => {
    if (!value) return 'Description is required';
    if (value.length < 10) return 'Description must be at least 10 characters';
    if (value.length > 2000) return 'Description must not exceed 2000 characters';
    return null;
  },
  latitude: (value) => {
    if (value === null || value === undefined) return 'Latitude is required';
    const num = parseFloat(value);
    if (isNaN(num)) return 'Latitude must be a number';
    if (num < -90 || num > 90) return 'Latitude must be between -90 and 90';
    return null;
  },
  longitude: (value) => {
    if (value === null || value === undefined) return 'Longitude is required';
    const num = parseFloat(value);
    if (isNaN(num)) return 'Longitude must be a number';
    if (num < -180 || num > 180) return 'Longitude must be between -180 and 180';
    return null;
  },
};

/**
 * Update issue validation
 */
export const updateIssueSchema = {
  status: (value) => {
    const validStatuses = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];
    if (value && !validStatuses.includes(value)) {
      return `Status must be one of: ${validStatuses.join(', ')}`;
    }
    return null;
  },
  priority: (value) => {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (value && !validPriorities.includes(value)) {
      return `Priority must be one of: ${validPriorities.join(', ')}`;
    }
    return null;
  },
  assigned_worker_id: (value) => {
    if (value && typeof value !== 'string' && typeof value !== 'number') {
      return 'Invalid worker ID format';
    }
    return null;
  },
};

// ============================================================================
// Announcement Schemas
// ============================================================================

/**
 * Create/Update announcement validation
 */
export const announcementSchema = {
  title: (value) => {
    if (!value) return 'Title is required';
    if (value.length < 5) return 'Title must be at least 5 characters';
    if (value.length > 200) return 'Title must not exceed 200 characters';
    return null;
  },
  content: (value) => {
    if (!value) return 'Content is required';
    if (value.length < 10) return 'Content must be at least 10 characters';
    if (value.length > 5000) return 'Content must not exceed 5000 characters';
    return null;
  },
  priority: (value) => {
    const validPriorities = ['low', 'medium', 'high'];
    if (!value) return 'Priority is required';
    if (!validPriorities.includes(value)) {
      return `Priority must be one of: ${validPriorities.join(', ')}`;
    }
    return null;
  },
};

// ============================================================================
// Validation Utility Functions
// ============================================================================

/**
 * Validate form data against schema
 * @param {Object} data - Form data
 * @param {Object} schema - Validation schema
 * @returns {Object} Errors object {fieldName: "error message"}
 */
export const validateForm = (data, schema) => {
  const errors = {};

  Object.entries(schema).forEach(([field, validator]) => {
    const value = data[field];
    const error = validator(value);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
};

/**
 * Check if form has any errors
 * @param {Object} errors - Errors object
 * @returns {boolean} True if no errors
 */
export const isFormValid = (errors) => {
  return Object.values(errors).every((error) => !error);
};

/**
 * Get first error in form
 * @param {Object} errors - Errors object
 * @returns {string|null} First error message or null
 */
export const getFirstError = (errors) => {
  const errorEntries = Object.entries(errors);
  if (errorEntries.length === 0) return null;
  return errorEntries[0][1];
};
