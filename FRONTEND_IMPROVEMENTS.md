# Frontend Improvements - Implementation Guide

## Summary of Improvements

This document describes the comprehensive frontend improvements implemented to enhance code quality, security, and developer experience across both the admin dashboard and mobile apps.

---

## 1. Error Handling Utilities

### Files Created:
- `admin/src/utils/errorHandler.js`
- `mobile/src/utils/errorHandler.js`

### Features:
- **User-Friendly Error Messages** - Converts API errors to readable messages
- **Error Categorization** - Differentiates between transient, validation, auth, and other errors
- **Error Logging** - Safe error formatting for logging (no sensitive data)
- **Validation Error Extraction** - Extracts field-level validation errors from 400 responses
- **Error Predicates** - Functions to check error types (isAuthError, isValidationError, etc.)

### Usage:
```javascript
import { getErrorMessage, handleApiError } from '@/utils/errorHandler';

try {
  await api.post('/issue', data);
} catch (error) {
  const message = getErrorMessage(error);
  showToast(message);
  
  // Or with handlers
  handleApiError(error, {
    onAuthError: () => logout(),
    onValidationError: (errors) => setFormErrors(errors),
  });
}
```

---

## 2. Input Validation Schemas

### Files Created:
- `admin/src/utils/validators.js`
- `mobile/src/utils/validators.js`

### Features:
- **Pre-built Schemas** for common forms (login, profile, issues, announcements, etc.)
- **Validation Functions** - Simple validator functions for each field
- **Form Validation** - `validateForm()` to validate entire form against schema
- **Error Messages** - User-friendly validation error messages

### Schemas Included:

**Admin & Mobile Common:**
- Authentication (login, OTP, profile)
- Issue reporting (issue type, description, location)

**Admin Only:**
- Worker management
- Issue updates
- Announcements

**Mobile Only:**
- Issue rating
- Chat messages

### Usage:
```javascript
import { reportIssueSchema, validateForm, isFormValid } from '@/utils/validators';

const formData = {
  issue_type: 'roads',
  description: 'Pothole on Main Street',
  latitude: 40.7128,
  longitude: -74.0060,
};

const errors = validateForm(formData, reportIssueSchema);
if (isFormValid(errors)) {
  // Submit form
  await submitIssue(formData);
}
```

---

## 3. API Retry Logic

### Files Created:
- `admin/src/utils/retry.js`
- `mobile/src/utils/retry.js`

### Features:
- **Exponential Backoff** - Automatic backoff with jitter for failed requests
- **Transient Error Detection** - Automatically retries only transient failures (408, 429, 5xx)
- **Max Retries** - Configurable max retries (default 3)
- **Callbacks** - Optional callback to track retry attempts
- **Batch Retry** - Retry multiple operations in batch

### Usage:
```javascript
import { retryWithBackoff, withRetry } from '@/utils/retry';

// Simple retry
const data = await retryWithBackoff(() => api.get('/issues'));

// With options
const data = await retryWithBackoff(
  () => api.get('/issues'),
  {
    maxRetries: 5,
    baseDelay: 500,
    onRetry: ({ attempt, delay }) => {
      console.log(`Retry attempt ${attempt} in ${delay}ms`);
    },
  }
);

// Generic async operation
const result = await withRetry(
  async () => {
    // Some async operation
  },
  { maxRetries: 3 }
);
```

---

## 4. Centralized UI State Management

### Files Created:
- `admin/src/store/uiStore.js`
- `mobile/src/store/uiStore.js`

### Features:
- **Loading State** - Global loading indicator
- **Error Management** - Centralized error storage and display
- **Toasts/Notifications** - User notifications with auto-dismiss
- **Modals/Bottom Sheets** - Modal and bottom sheet state management
- **Pagination** - Page, size, and total items management
- **Filtering** - Dynamic filter state management
- **Search** - Centralized search state
- **Selection** - Multi-select item management (admin only)
- **Sorting** - Sort field and order management (admin only)

### Custom Hooks Provided:

```javascript
// In any component
import { useUiStore, useErrorNotification, useSuccessNotification } from '@/store/uiStore';

// Admin only
import { useSelection, useSorting } from '@/store/uiStore';

// Mobile only
import { useBottomSheet, useFocus } from '@/store/uiStore';

// Generic hooks
import { useLoading, useModal, usePagination, useFiltering } from '@/store/uiStore';
```

### Examples:

**Error Notification:**
```javascript
const notify = useErrorNotification();
notify('An error occurred', true); // Shows toast and logs
```

**Success Notification:**
```javascript
const notify = useSuccessNotification();
notify('Issue created successfully');
```

**Loading State:**
```javascript
const { isLoading, withLoading } = useLoading();

const handleSubmit = async () => {
  await withLoading(async () => {
    await api.post('/issue', data);
  });
};
```

**Pagination:**
```javascript
const { page, pageSize, totalItems, nextPage, prevPage } = usePagination();

const loadIssues = async () => {
  const { data, total } = await api.get('/issues', { page, size: pageSize });
  setTotalItems(total);
};
```

**Filtering:**
```javascript
const { filters, addFilter, removeFilter, clearFilters } = useFiltering();

// Add a filter: status = 'open'
addFilter('status', 'open');

// Remove a filter
removeFilter('status');

// Clear all filters
clearFilters();
```

**Selection (Admin):**
```javascript
const { selectedItems, toggleSelected, clearSelected } = useSelection();

// Toggle selection of item
toggleSelected(itemId);

// Clear all selections
clearSelected();
```

---

## 5. Integration with Existing Code

### Update API Client Error Handling

**Before (admin/src/api/client.js):**
```javascript
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // ... existing retry logic
    return Promise.reject(error);
  }
);
```

**After:**
```javascript
import { getErrorMessage, isAuthError } from '../utils/errorHandler';
import { useUiStore } from '../store/uiStore';

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // ... existing retry logic
    
    // Handle auth errors
    if (isAuthError(error)) {
      useUiStore.getState().closeAllModals();
      // Redirect to login
    }
    
    return Promise.reject(error);
  }
);
```

### Update Form Components

**Before:**
```javascript
const [errors, setErrors] = useState({});

const handleSubmit = async () => {
  if (!form.issue_type) setErrors({ issue_type: 'Required' });
  // ... manual validation
};
```

**After:**
```javascript
import { reportIssueSchema, validateForm } from '@/utils/validators';
import { useErrorNotification, useLoading } from '@/store/uiStore';

export function ReportIssueForm() {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const notify = useErrorNotification();
  const { withLoading } = useLoading();

  const handleSubmit = async () => {
    const errors = validateForm(formData, reportIssueSchema);
    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    await withLoading(async () => {
      try {
        await api.post('/issues', formData);
        notify('Issue reported successfully', false); // No UI notification
      } catch (error) {
        notify(getErrorMessage(error), true); // Show as toast
      }
    });
  };

  return (
    // Form JSX
  );
}
```

---

## 6. Security Improvements

### Token Storage Review

**Current Status:**
- ✅ Mobile: Uses Expo SecureStore (secure)
- ⚠️ Admin: Uses localStorage (vulnerable to XSS)

**Recommended Fix for Admin:**
```javascript
// Use httpOnly cookies instead (set by backend):
// Backend: response.set_cookie('access_token', token, httpOnly=True)

// Frontend won't need to manage token storage
api.defaults.withCredentials = true;

// Or use sessionStorage as temporary (still better than localStorage):
// sessionStorage.setItem('access_token', token);
```

### Input Validation

All forms should now use validation schemas:
- Prevents client-side attacks (XSS via form inputs)
- Validates before sending to API
- Consistent user experience

### Rate Limiting

Add to API client interceptor:
```javascript
const rateLimiter = new Map();

function isRateLimited(key) {
  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, { count: 1, timestamp: Date.now() });
    return false;
  }
  
  const { count, timestamp } = rateLimiter.get(key);
  if (timestamp < Date.now() - 1000) {
    // Reset after 1 second
    rateLimiter.set(key, { count: 1, timestamp: Date.now() });
    return false;
  }
  
  if (count >= 5) return true; // 5 requests per second max
  
  rateLimiter.set(key, { count: count + 1, timestamp });
  return false;
}

api.interceptors.request.use((config) => {
  const key = `${config.method}:${config.url}`;
  if (isRateLimited(key)) {
    throw new Error('Too many requests. Please slow down.');
  }
  return config;
});
```

---

## 7. Implementation Checklist

### Phase 1: Error Handling (Priority: High)
- [ ] Test errorHandler.js in both apps
- [ ] Update API client to use error utilities
- [ ] Update forms to display error messages
- [ ] Add error toast notifications

### Phase 2: Validation (Priority: High)
- [ ] Integrate validators into forms
- [ ] Test all validation schemas
- [ ] Show validation errors in UI
- [ ] Test form submission with retries

### Phase 3: State Management (Priority: Medium)
- [ ] Replace manual loading states with useLoading
- [ ] Replace manual error states with useErrorNotification
- [ ] Move pagination logic to usePagination hook
- [ ] Move filtering logic to useFiltering hook

### Phase 4: Performance (Priority: Low)
- [ ] Add React.memo to expensive components
- [ ] Implement request deduplication
- [ ] Cache API responses
- [ ] Optimize bundle size

### Phase 5: Security (Priority: High)
- [ ] Review and fix token storage (admin)
- [ ] Add rate limiting to API client
- [ ] Test input validation across forms
- [ ] Add CSRF protection (if needed)

---

## 8. Testing

### Test Error Handler:
```javascript
import { getErrorMessage, isTransientError } from '@/utils/errorHandler';

describe('errorHandler', () => {
  it('should return user-friendly message for 401', () => {
    const error = new Error();
    error.response = { status: 401 };
    expect(getErrorMessage(error)).toBe('Session expired. Please login again.');
  });

  it('should identify transient errors', () => {
    const error = new Error();
    error.response = { status: 500 };
    expect(isTransientError(error)).toBe(true);
  });
});
```

### Test Validators:
```javascript
import { reportIssueSchema, validateForm } from '@/utils/validators';

describe('validators', () => {
  it('should validate issue data', () => {
    const data = {
      issue_type: 'roads',
      description: 'Test issue description here',
      latitude: 40.7128,
      longitude: -74.0060,
    };
    const errors = validateForm(data, reportIssueSchema);
    expect(Object.keys(errors)).toHaveLength(0);
  });
});
```

---

## 9. File Structure After Improvements

```
admin/src/
├── api/
│   ├── client.js          (updated with error handling)
│   └── index.js           (existing)
├── components/
│   └── ui/               (future: consolidate UI components)
├── store/
│   ├── authStore.js      (existing)
│   └── uiStore.js        (NEW)
└── utils/
    ├── errorHandler.js   (NEW)
    ├── retry.js          (NEW)
    └── validators.js     (NEW)

mobile/src/
├── api/
│   ├── client.js         (updated with error handling)
│   └── ...               (existing)
├── store/
│   ├── authStore.js      (existing)
│   ├── notificationStore.js (existing)
│   └── uiStore.js        (NEW)
└── utils/
    ├── errorHandler.js   (NEW)
    ├── retry.js          (NEW)
    ├── validators.js     (NEW)
    └── ...               (existing)
```

---

## 10. Next Steps

1. **Immediate** (This Week):
   - ✅ Copy new utilities to both projects
   - Test error handling and validation
   - Update API client interceptors
   - Add error notifications to key forms

2. **Short-term** (Next Week):
   - Replace manual state management with hooks
   - Add loading states to all API calls
   - Implement pagination/filtering hooks
   - Test with real data

3. **Medium-term** (Month 2):
   - Consolidate UI components (Modal, Input, Toast, etc.)
   - Add more comprehensive error boundaries
   - Implement offline support with retries
   - Add request caching

4. **Long-term** (Month 3+):
   - Performance optimization
   - Bundle size analysis
   - Add unit/integration tests
   - Security audit and fixes

---

## 11. Support & Documentation

All utilities include:
- ✅ JSDoc comments
- ✅ Usage examples
- ✅ Type hints
- ✅ Error handling

For questions or issues, refer to:
- **Error Handling**: `errorHandler.js` comments
- **Validation**: `validators.js` comments
- **Retry Logic**: `retry.js` comments
- **State Management**: `uiStore.js` comments

---

**Status**: ✅ All improvements implemented and ready to integrate

**Estimated Integration Time**: 2-3 hours per app

**Risk Level**: Low (backward compatible, additive changes)
