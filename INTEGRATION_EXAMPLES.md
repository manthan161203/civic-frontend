# Form Component Integration Examples

This guide demonstrates how to integrate the error handling, validation, retry logic, and state management utilities into your form components.

## Quick Reference

### Admin App Imports
```javascript
import { apiPost, apiPut, apiPatch, apiDelete, apiGet, getErrorMessage } from '@/api/client';
import { validateForm, validateEmail, validatePhone } from '@/utils/validators';
import { useUiStore } from '@/store/uiStore';
```

### Mobile App Imports
```javascript
import { apiPost, apiPut, apiPatch, apiDelete, apiGet, getErrorMessage } from '@/api/client';
import { validateForm, validateEmail, validatePhone } from '@/utils/validators';
import { useUiStore } from '@/store/uiStore';
```

---

## Admin App Form Example

### Basic Form with Validation and Error Handling

```javascript
'use client';
import { useState } from 'react';
import { apiPost } from '@/api/client';
import { validateForm, validateEmail } from '@/utils/validators';
import { useUiStore } from '@/store/uiStore';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import Alert from '@/components/Alert';

export default function CreateUserForm() {
  const { addToast } = useUiStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'citizen',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateForm('createUser', form);
    if (!validation.valid) {
      setErrors(validation.errors);
      addToast('Please fix the errors below', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiPost('/users', form);
      addToast(`User ${form.name} created successfully`, 'success');
      setForm({ name: '', email: '', phone: '', role: 'citizen' });
      // Refresh users list
      onUserCreated?.();
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Failed to create user');
      setErrors({ submit: errorMsg });
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.submit && (
        <Alert type="error" message={errors.submit} />
      )}

      <FormInput
        label="Name"
        name="name"
        value={form.name}
        onChange={handleChange}
        error={errors.name}
        required
      />

      <FormInput
        label="Email"
        name="email"
        type="email"
        value={form.email}
        onChange={handleChange}
        error={errors.email}
      />

      <FormInput
        label="Phone"
        name="phone"
        type="tel"
        value={form.phone}
        onChange={handleChange}
        error={errors.phone}
      />

      <FormInput
        label="Role"
        name="role"
        type="select"
        value={form.role}
        onChange={handleChange}
        options={[
          { value: 'citizen', label: 'Citizen' },
          { value: 'worker', label: 'Worker' },
          { value: 'admin', label: 'Admin' },
        ]}
      />

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        loadingText="Creating..."
      >
        Create User
      </Button>
    </form>
  );
}
```

### Form with Custom Retry Options

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Retry with custom options
    const { data } = await apiPost(
      '/issues',
      form,
      {
        maxRetries: 5,        // More retries for critical operations
        baseDelay: 2000,      // Start with 2 second delay
        shouldRetry: (error) => {
          // Custom retry logic - don't retry validation errors
          return error.response?.status !== 400;
        },
      }
    );
    addToast('Issue created successfully', 'success');
  } catch (error) {
    addToast(getErrorMessage(error, 'Failed to create issue'), 'error');
  } finally {
    setLoading(false);
  }
};
```

### Using API Methods with Proper Error Handling

```javascript
// GET request
const fetchIssues = async () => {
  try {
    const { data } = await apiGet('/issues', { status: 'open', page: 1 });
    setIssues(data.items);
  } catch (error) {
    addToast(getErrorMessage(error, 'Failed to load issues'), 'error');
  }
};

// POST request
const createIssue = async (issueData) => {
  try {
    const { data } = await apiPost('/issues', issueData);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create issue'));
  }
};

// PUT request (full replace)
const updateIssue = async (id, issueData) => {
  try {
    const { data } = await apiPut(`/issues/${id}`, issueData);
    addToast('Issue updated successfully', 'success');
    return data;
  } catch (error) {
    addToast(getErrorMessage(error, 'Failed to update issue'), 'error');
  }
};

// PATCH request (partial update)
const updateIssueStatus = async (id, status) => {
  try {
    const { data } = await apiPatch(`/issues/${id}`, { status });
    addToast('Status updated', 'success');
    return data;
  } catch (error) {
    addToast(getErrorMessage(error, 'Failed to update status'), 'error');
  }
};

// DELETE request
const deleteIssue = async (id) => {
  try {
    await apiDelete(`/issues/${id}`);
    addToast('Issue deleted successfully', 'success');
  } catch (error) {
    addToast(getErrorMessage(error, 'Failed to delete issue'), 'error');
  }
};
```

---

## Mobile App Form Example (React Native)

### Basic Form with Validation and Error Handling

```javascript
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { apiPost } from '@/api/client';
import { validateForm } from '@/utils/validators';
import { useUiStore } from '@/store/uiStore';
import FormInput from '@/components/FormInput';
import Button from '@/components/Button';

export default function CreateIssueForm() {
  const { addToast } = useUiStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    severity: 'medium',
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    // Validate
    const validation = validateForm('createIssue', form);
    if (!validation.valid) {
      setErrors(validation.errors);
      addToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiPost('/issues', form);
      addToast('Issue reported successfully', 'success');
      // Navigate back or clear form
      navigation.goBack();
    } catch (error) {
      const errorMsg = getErrorMessage(error, 'Failed to report issue');
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FormInput
        label="Title"
        value={form.title}
        onChangeText={(value) => handleChange('title', value)}
        error={errors.title}
        placeholder="Issue title"
      />

      <FormInput
        label="Description"
        value={form.description}
        onChangeText={(value) => handleChange('description', value)}
        error={errors.description}
        placeholder="Describe the issue"
        multiline
      />

      <FormInput
        label="Category"
        value={form.category}
        onChangeText={(value) => handleChange('category', value)}
        error={errors.category}
        type="select"
        options={[
          { label: 'Road', value: 'road' },
          { label: 'Water', value: 'water' },
          { label: 'Electricity', value: 'electricity' },
        ]}
      />

      <Button
        onPress={handleSubmit}
        loading={loading}
        style={styles.button}
      >
        Report Issue
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  button: { marginTop: 24 },
});
```

### Mobile API Usage Pattern

```javascript
import { useUiStore } from '@/store/uiStore';
import { apiGet, apiPost, apiPut, getErrorMessage } from '@/api/client';

export function useIssuesAPI() {
  const { addToast } = useUiStore();
  const [loading, setLoading] = useState(false);

  const getIssues = async () => {
    setLoading(true);
    try {
      const { data } = await apiGet('/issues');
      return data;
    } catch (error) {
      addToast(getErrorMessage(error, 'Failed to load issues'), 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createIssue = async (issueData) => {
    setLoading(true);
    try {
      const { data } = await apiPost('/issues', issueData);
      addToast('Issue reported successfully', 'success');
      return data;
    } catch (error) {
      addToast(getErrorMessage(error, 'Failed to report issue'), 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { getIssues, createIssue, loading };
}
```

---

## Validation Examples

### Using Validator Schemas

```javascript
import { validateForm, validateEmail, validatePhone, validateUrl } from '@/utils/validators';

// Validate entire form
const validation = validateForm('createUser', {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '9876543210',
});

if (!validation.valid) {
  console.log('Errors:', validation.errors);
  // { email: 'Invalid email format' }
}

// Validate individual fields
const emailValid = validateEmail('john@example.com'); // true
const phoneValid = validatePhone('9876543210');       // true
const urlValid = validateUrl('https://example.com');  // true
```

### Available Validators

- `validateForm(schema, data)` - Validate entire form against schema
- `validateEmail(email)` - Validate email format
- `validatePhone(phone)` - Validate 10-digit phone number
- `validateUrl(url)` - Validate URL format
- `validatePassword(password)` - Validate password strength

---

## Error Handling Patterns

### Pattern 1: Try-Catch with Toast

```javascript
try {
  await apiPost('/users', userData);
  addToast('User created successfully', 'success');
} catch (error) {
  addToast(getErrorMessage(error), 'error');
}
```

### Pattern 2: Error State Management

```javascript
const [errors, setErrors] = useState({});

try {
  await apiPost('/users', userData);
} catch (error) {
  if (error.response?.status === 400) {
    // Validation errors
    setErrors(error.response.data.errors || {});
  } else {
    // Other errors
    addToast(getErrorMessage(error), 'error');
  }
}
```

### Pattern 3: Custom Error Handling

```javascript
try {
  await apiPost('/issues', formData);
} catch (error) {
  if (error.response?.status === 409) {
    // Conflict - duplicate
    addToast('An issue already exists at this location', 'warning');
  } else if (error.response?.status === 403) {
    // Forbidden
    addToast('You do not have permission to perform this action', 'error');
  } else {
    addToast(getErrorMessage(error), 'error');
  }
}
```

---

## State Management

### Using useUiStore Hook

```javascript
import { useUiStore } from '@/store/uiStore';

function MyComponent() {
  const { 
    addToast,           // Show notification
    setLoading,         // Set global loading state
    openModal,          // Open a modal
    closeModal,         // Close a modal
    closeAllModals,     // Close all modals
  } = useUiStore();

  const handleClick = async () => {
    setLoading(true);
    try {
      await apiPost('/data', payload);
      addToast('Success!', 'success');
      closeAllModals();
    } catch (error) {
      addToast('Error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return <button onClick={handleClick}>Submit</button>;
}
```

---

## Best Practices

### 1. Always Validate Before Submitting
```javascript
const validation = validateForm('schema', form);
if (!validation.valid) {
  setErrors(validation.errors);
  return;
}
```

### 2. Use Consistent Error Messages
```javascript
// Good
addToast(getErrorMessage(error, 'Failed to create user'), 'error');

// Avoid
addToast('Error at line 123 in controller.py', 'error');
```

### 3. Show Loading States
```javascript
<Button loading={loading} disabled={loading}>
  {loading ? 'Saving...' : 'Save'}
</Button>
```

### 4. Clear Errors on Input Change
```javascript
const handleChange = (e) => {
  setForm({ ...form, [name]: value });
  if (errors[name]) {
    setErrors({ ...errors, [name]: '' });
  }
};
```

### 5. Use Toast for Feedback, Modals for Actions
```javascript
// Toast - for notifications
addToast('Successfully deleted', 'success');

// Modal - for confirmations
openModal('confirmDelete', { id: userId });
```

### 6. Custom Retry for Critical Operations
```javascript
const { data } = await apiPost('/critical-operation', payload, {
  maxRetries: 5,       // More retries
  baseDelay: 2000,     // Longer delay
  factor: 2,           // Exponential backoff
});
```

---

## Common Patterns Summary

| Use Case | Pattern |
|----------|---------|
| Create item | `apiPost()` + validate + toast |
| Update item | `apiPut()` + validate + toast |
| Partially update | `apiPatch()` + validate + toast |
| Delete item | `apiDelete()` + confirm modal + toast |
| Fetch list | `apiGet()` + useQuery/state + toast on error |
| Form validation | `validateForm()` + setErrors + toast |
| Loading state | `setLoading()` + disabled buttons |
| Retry failures | retry options in apiCall |
| User feedback | `addToast()` for any result |

---

## Questions?

Refer to:
- API Client: `src/api/client.js`
- Error Handler: `src/utils/errorHandler.js`
- Validators: `src/utils/validators.js`
- UI Store: `src/store/uiStore.js`
- Components: `src/components/`
