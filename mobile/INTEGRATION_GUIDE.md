# Mobile App - Complete Integration Guide

**Status**: ✅ All utilities created and ready to integrate

This guide walks you through integrating all utilities into your React Native app.

---

## 📋 Files Created

### Utilities
- `src/utils/errorHandler.js` - Error handling
- `src/utils/validators.js` - Input validation  
- `src/utils/retry.js` - Retry logic
- `src/utils/security.js` - Security utilities

### State Management
- `src/store/uiStore.js` - Zustand state with mobile features

### Components
- `src/components/Button.jsx` - React Native button
- `src/components/FormInput.jsx` - React Native form input

### API Integration
- `src/api/client.js` - transport: base URL, auth, refresh, retry
- `src/api/errors.js` - every failure normalized to one `ApiError`

---

## 🚀 Integration Steps

### Step 1: Update API Client (30 min)

**File**: `mobile/src/api/client.js`

```javascript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useUiStore } from '@/store/uiStore';
import { getErrorMessage, isAuthError } from '@/utils/errorHandler';
import { withRetry } from '@/utils/retry';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 15000,
});

// Request interceptor - add token from secure storage
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to retrieve token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (isAuthError(error)) {
      try {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      } catch (storageError) {
        console.error('Failed to clear tokens:', storageError);
      }
      
      useUiStore.getState().closeAllModals();
      // Navigate to login
    }
    return Promise.reject(error);
  }
);

// Wrapper functions
export const apiGet = (url, params, options) => 
  withRetry(() => api.get(url, { params }), { maxRetries: 3, baseDelay: 1000, ...options });

export const apiPost = (url, data, options) => 
  withRetry(() => api.post(url, data), { maxRetries: 3, baseDelay: 1000, ...options });

export const apiPut = (url, data, options) => 
  withRetry(() => api.put(url, data), { maxRetries: 3, baseDelay: 1000, ...options });

export const apiDelete = (url, options) => 
  withRetry(() => api.delete(url), { maxRetries: 3, baseDelay: 1000, ...options });

export { getErrorMessage };
export default api;
```

---

### Step 2: Add Toast Notifications (20 min)

**File**: `mobile/app/(auth)/login.jsx` or your root component

```javascript
import { ToastContainer } from '@/components/Toast';
import { useUiStore } from '@/store/uiStore';

export default function RootNavigator() {
  const toasts = useUiStore((state) => state.toasts);

  return (
    <View style={{ flex: 1 }}>
      {/* Your app content */}
      <YourNavigationComponent />
      
      {/* Toast container */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
        />
      ))}
    </View>
  );
}
```

---

### Step 3: Update Your Forms (60-90 min)

**BEFORE** - Manual validation
```javascript
const [errors, setErrors] = useState({});
const [loading, setLoading] = useState(false);

const handleReportIssue = async () => {
  // Manual validation
  if (!form.type) {
    setErrors({ ...errors, type: 'Required' });
    return;
  }
  
  setLoading(true);
  try {
    await api.post('/issues', form);
    Alert.alert('Success', 'Issue reported');
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};
```

**AFTER** - Using utilities
```javascript
import { reportIssueSchema, validateForm } from '@/utils/validators';
import { useErrorNotification, useSuccessNotification, useLoading } from '@/store/uiStore';
import { apiPost, getErrorMessage } from '@/api/client';
import FormInput from '@/components/FormInput';
import Button from '@/components/Button';

const ReportIssueScreen = () => {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  
  const errorNotify = useErrorNotification();
  const successNotify = useSuccessNotification();
  const { withLoading } = useLoading();

  const handleReportIssue = async () => {
    // Validate
    const validationErrors = validateForm(form, reportIssueSchema);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // Submit with retry and loading state
    await withLoading(async () => {
      try {
        await apiPost('/issues', form);
        successNotify('Issue reported successfully!');
        setForm({});
      } catch (error) {
        errorNotify(getErrorMessage(error));
      }
    });
  };

  return (
    <View style={styles.container}>
      <FormInput
        label="Issue Type"
        type="select"
        value={form.type}
        onChangeText={(type) => setForm({...form, type})}
        error={errors.type}
        options={[
          { value: 'roads', label: 'Roads' },
          { value: 'water', label: 'Water' },
        ]}
      />
      
      <FormInput
        label="Description"
        value={form.description}
        onChangeText={(description) => setForm({...form, description})}
        error={errors.description}
        placeholder="Describe the issue..."
        multiline
        numberOfLines={4}
      />
      
      <Button onPress={handleReportIssue}>
        Report Issue
      </Button>
    </View>
  );
};
```

---

### Step 4: Implement Loading States (30 min)

**File**: Any component with async operations

```javascript
import { useLoading } from '@/store/uiStore';

const MyComponent = () => {
  const { isLoading, withLoading } = useLoading();

  const handleSubmit = async () => {
    await withLoading(async () => {
      // API call here
      await apiPost('/endpoint', data);
    });
  };

  return (
    <Button isLoading={isLoading} onPress={handleSubmit}>
      {isLoading ? 'Saving...' : 'Save'}
    </Button>
  );
};
```

---

### Step 5: Add Error Notifications (20 min)

**In your components**:
```javascript
import { useErrorNotification, useSuccessNotification } from '@/store/uiStore';

const errorNotify = useErrorNotification();
const successNotify = useSuccessNotification();

// Show error (with toast + logging)
errorNotify('Something went wrong!');

// Show success
successNotify('Saved successfully!');

// In try/catch
try {
  await api.post('/data', form);
  successNotify('Success!');
} catch (error) {
  errorNotify(getErrorMessage(error));
}
```

---

### Step 6: Use Pagination & Filtering (30 min)

```javascript
import { usePagination, useFiltering } from '@/store/uiStore';

const IssuesListScreen = () => {
  const { page, pageSize, nextPage, prevPage } = usePagination();
  const { filters, addFilter, removeFilter } = useFiltering();
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    const loadIssues = async () => {
      const response = await apiGet('/issues', {
        page,
        size: pageSize,
        ...filters,
      });
      setIssues(response.data.items);
    };
    loadIssues();
  }, [page, filters]);

  return (
    <View>
      {/* Filter buttons */}
      <Button 
        onPress={() => addFilter('status', 'open')}
        variant={filters.status === 'open' ? 'primary' : 'secondary'}
      >
        Open
      </Button>
      
      <Button 
        onPress={() => removeFilter('status')}
        variant="ghost"
      >
        Clear Filters
      </Button>

      {/* Issues list */}
      <FlatList
        data={issues}
        renderItem={({ item }) => <IssueCard issue={item} />}
        keyExtractor={(item) => item.id}
      />

      {/* Pagination */}
      <View style={styles.pagination}>
        <Button onPress={prevPage} disabled={page <= 1}>Prev</Button>
        <Text>Page {page}</Text>
        <Button onPress={nextPage}>Next</Button>
      </View>
    </View>
  );
};
```

---

### Step 7: Add Security (20 min)

```javascript
import { sanitizeJson, escapedHtml, createRateLimiter } from '@/utils/security';

// Rate limiter for form submissions
const rateLimiter = createRateLimiter(5, 60000); // 5 attempts per minute

const handleSubmit = async () => {
  if (!rateLimiter.check()) {
    errorNotify('Too many attempts. Please slow down.');
    return;
  }

  // Sanitize user input
  const cleanData = sanitizeJson(form);
  
  try {
    await apiPost('/data', cleanData);
  } catch (error) {
    errorNotify(getErrorMessage(error));
  }
};
```

---

### Step 8: Test Everything (60 min)

#### Test Error Message
```javascript
const testError = async () => {
  try {
    await apiGet('/nonexistent');
  } catch {
    // Should show friendly error message in toast
  }
};
```

#### Test Validation
```javascript
import { validateForm, reportIssueSchema } from '@/utils/validators';

const testValidation = () => {
  const invalid = { type: '', description: '' };
  const errors = validateForm(invalid, reportIssueSchema);
  // Should return validation errors
};
```

#### Test Offline Retry
```javascript
// Turn off internet and make API call
const testRetry = async () => {
  const data = await apiGet('/issues');
  // Should auto-retry when connection returns
};
```

---

## ✅ Integration Checklist

### Utilities
- [ ] Copy errorHandler.js
- [ ] Copy validators.js
- [ ] Copy retry.js
- [ ] Copy security.js

### State Management
- [ ] uiStore.js exists
- [ ] Toast handling implemented

### Components
- [ ] Copy Button.jsx
- [ ] Copy FormInput.jsx
- [ ] Test components render

### API Setup
- [ ] Update api/client.js
- [ ] Add error interceptor
- [ ] Add JWT token handling
- [ ] Add retry wrappers

### Forms
- [ ] Use FormInput component
- [ ] Add validation schemas
- [ ] Show validation errors
- [ ] Add error notifications

### Loading States
- [ ] Replace useState with useLoading
- [ ] Use withLoading wrapper
- [ ] Update Button components

### Notifications
- [ ] Add toast to navigation
- [ ] Use useErrorNotification
- [ ] Use useSuccessNotification
- [ ] Test notifications display

### Security
- [ ] Add input sanitization
- [ ] Add rate limiting
- [ ] Validate form inputs
- [ ] Test XSS prevention

### Testing
- [ ] Test error messages
- [ ] Test validation
- [ ] Test offline/retry
- [ ] Test loading states
- [ ] Test notifications

---

## 📊 Components & Files Status

| Component | Status |
|-----------|--------|
| Error Handler | ✅ |
| Validators | ✅ |
| Retry Logic | ✅ |
| Security Utils | ✅ |
| UI State Store | ✅ |
| Button | ✅ |
| FormInput | ✅ |
| API Integration | ✅ |

---

## 🎯 Success Criteria

After integration, you should have:
- ✅ Error messages shown as toasts
- ✅ Form validation before submission
- ✅ Offline support with auto-retry
- ✅ Global loading indicators
- ✅ Secure form handling
- ✅ Smooth user experience

---

## 🆘 Troubleshooting

**Toast not showing?**
→ Add toast rendering to your navigation component

**Validation not working?**
→ Ensure validateForm() is called with correct schema

**API failing?**
→ Check token is being stored in SecureStore

**Retry not working?**
→ Use the apiGet/apiPost wrappers, not api.get directly

---

## 📚 Next Steps

1. ✅ Complete all integration steps
2. ✅ Run through the testing checklist
3. ✅ Test with real API
4. ✅ Test offline mode
5. ✅ Deploy to TestFlight/internal testing

**Estimated Time**: 6-8 hours  
**Testing Time**: 2-3 hours  
**Total Timeline**: 1-2 days

---

**Status**: Ready for integration  
**Version**: 1.0  
**Last Updated**: Session 9
