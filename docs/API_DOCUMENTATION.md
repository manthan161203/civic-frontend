# Civic API Documentation

**API Base URL**: `http://localhost:8000` (development) | `https://api.civic.example.com` (production)

**Documentation Version**: 1.0  
**Last Updated**: April 6, 2026

---

## Table of Contents
1. [Authentication](#authentication)
2. [Base Response Format](#base-response-format)
3. [Error Codes & Status Codes](#error-codes--status-codes)
4. [Endpoints](#endpoints)
   - [Auth Endpoints](#auth-endpoints)
   - [User Endpoints](#user-endpoints)
   - [Issue Endpoints](#issue-endpoints)
   - [Task Endpoints](#task-endpoints)
   - [Admin Endpoints](#admin-endpoints)
   - [Location Endpoints](#location-endpoints)
5. [Retry Strategy](#retry-strategy)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)

---

## Authentication

### Token Format
```
Authorization: Bearer <access_token>
```

### Login Flow
1. Send phone number to `/auth/login`
2. Receive OTP via SMS
3. Verify OTP at `/auth/verify-otp`
4. Receive `access_token` and `refresh_token`
5. Use `access_token` for API requests
6. Refresh token when expired using `/auth/refresh-token`

### Token Refresh
**Automatic**: API client automatically refreshes tokens on 401 response  
**Manual**: POST `/auth/refresh-token` with `refresh_token`

---

## Base Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-04-06T10:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "User not found",
  "code": "USER_NOT_FOUND",
  "timestamp": "2024-04-06T10:30:00Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [ /* array of items */ ],
    "total": 50,
    "page": 1,
    "size": 20,
    "pages": 3
  }
}
```

---

## Error Codes & Status Codes

### HTTP Status Codes

| Code | Meaning | Retry? |
|------|---------|--------|
| 200 | OK | No |
| 201 | Created | No |
| 204 | No Content | No |
| 400 | Bad Request | No |
| 401 | Unauthorized | Special* |
| 403 | Forbidden | No |
| 404 | Not Found | No |
| 408 | Timeout | Yes |
| 409 | Conflict | No |
| 422 | Unprocessable Entity | No |
| 429 | Too Many Requests | Yes |
| 500 | Server Error | Yes |
| 503 | Service Unavailable | Yes |
| 504 | Gateway Timeout | Yes |

*401: Not retried; triggers token refresh and re-auth

### Business Error Codes

```
AUTH_REQUIRED          - Authentication token missing or invalid
INVALID_OTP            - OTP verification failed
TOKEN_EXPIRED          - Token has expired (auto-refresh attempted)
USER_NOT_FOUND         - User doesn't exist
USER_INACTIVE          - User account is deactivated
VALIDATION_ERROR       - Input validation failed
DUPLICATE_ENTRY        - Record already exists
PERMISSION_DENIED      - Insufficient permissions
RESOURCE_NOT_FOUND     - Requested resource not found
RATE_LIMITED           - Too many requests (retry after delay)
INTERNAL_ERROR         - Server error
```

---

## Endpoints

### Auth Endpoints

#### 1. Send Login OTP
```
POST /auth/login
```

**Request**
```json
{
  "phone": "+919876543210"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "phone": "+919876543210",
    "message": "OTP sent",
    "dev_otp": "123456"  // Development only
  }
}
```

**Error Response (400)**
```json
{
  "success": false,
  "message": "Invalid phone number",
  "code": "INVALID_PHONE"
}
```

---

#### 2. Verify OTP & Login
```
POST /auth/verify-otp
```

**Request**
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "refresh_...",
    "user": {
      "id": "user_123",
      "name": "John Doe",
      "phone": "+919876543210",
      "role": "citizen"
    }
  }
}
```

**Error Response (400)**
```json
{
  "success": false,
  "message": "Invalid OTP",
  "code": "INVALID_OTP"
}
```

---

#### 3. Refresh Token
```
POST /auth/refresh-token
```

**Request**
```json
{
  "refresh_token": "refresh_..."
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "refresh_..."
  }
}
```

**Error Response (401)**
```json
{
  "success": false,
  "message": "Invalid refresh token",
  "code": "INVALID_TOKEN"
}
```

---

#### 4. Get Current User
```
GET /auth/me
```

**Headers**
```
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com",
    "role": "citizen",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### User Endpoints

#### 1. Get User Profile
```
GET /users/{user_id}
```

**Headers**
```
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com",
    "role": "citizen",
    "language": "en",
    "is_active": true,
    "stats": {
      "issues_reported": 5,
      "issues_resolved": 3,
      "issues_open": 2
    }
  }
}
```

---

#### 2. Update User Profile
```
PUT /users/{user_id}
```

**Headers**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request**
```json
{
  "name": "John Updated",
  "email": "john.updated@example.com",
  "language": "hi"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "name": "John Updated",
    "email": "john.updated@example.com",
    "language": "hi"
  }
}
```

**Validation Errors (400)**
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "errors": {
    "email": "Invalid email format",
    "language": "Language must be one of: en, hi, gu"
  }
}
```

---

### Issue Endpoints

#### 1. Create Issue
```
POST /issues
```

**Headers**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request**
```json
{
  "title": "Pothole on Main Street",
  "description": "Large pothole near intersection",
  "category": "roads",
  "severity": "high",
  "location": {
    "latitude": 21.1458,
    "longitude": 79.0882
  },
  "photos": ["photo_id_1", "photo_id_2"]
}
```

**Response (201)**
```json
{
  "success": true,
  "data": {
    "id": "issue_123",
    "title": "Pothole on Main Street",
    "status": "open",
    "created_at": "2024-04-06T10:30:00Z"
  }
}
```

---

#### 2. Get Issues List
```
GET /issues
```

**Query Parameters**
```
page=1                 # Page number (default: 1)
size=20               # Items per page (default: 20)
status=open           # Filter by status (open, in_progress, resolved, closed)
category=roads        # Filter by category
severity=high         # Filter by severity
search=pothole        # Search in title and description
```

**Headers**
```
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "issue_123",
        "title": "Pothole on Main Street",
        "status": "open",
        "category": "roads",
        "severity": "high",
        "created_by": "user_123",
        "created_at": "2024-04-06T10:30:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "size": 20,
    "pages": 3
  }
}
```

---

#### 3. Get Issue Details
```
GET /issues/{issue_id}
```

**Headers**
```
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "issue_123",
    "title": "Pothole on Main Street",
    "description": "Large pothole near intersection",
    "status": "open",
    "category": "roads",
    "severity": "high",
    "location": {
      "latitude": 21.1458,
      "longitude": 79.0882,
      "address": "Main Street, Nagpur"
    },
    "photos": [
      {
        "id": "photo_1",
        "url": "https://...",
        "created_at": "2024-04-06T10:30:00Z"
      }
    ],
    "created_by": "user_123",
    "assigned_to": "worker_456",
    "created_at": "2024-04-06T10:30:00Z",
    "updated_at": "2024-04-06T11:00:00Z"
  }
}
```

---

#### 4. Update Issue Status
```
PATCH /issues/{issue_id}/status
```

**Headers**
```
Authorization: Bearer <access_token>
```

**Request**
```json
{
  "status": "in_progress",
  "assigned_worker_id": "worker_456"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "issue_123",
    "status": "in_progress",
    "assigned_to": "worker_456",
    "updated_at": "2024-04-06T11:00:00Z"
  }
}
```

---

### Task Endpoints

#### 1. Get Worker Tasks
```
GET /tasks
```

**Query Parameters**
```
status=assigned       # Status filter (assigned, in_progress, blocked, resolved)
page=1
size=20
```

**Headers**
```
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "task_123",
        "issue_id": "issue_456",
        "title": "Repair Pothole",
        "status": "assigned",
        "priority": "high",
        "assigned_worker": "worker_789",
        "created_at": "2024-04-06T10:30:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "size": 20,
    "pages": 1
  }
}
```

---

#### 2. Update Task Status
```
PATCH /tasks/{task_id}/status
```

**Headers**
```
Authorization: Bearer <access_token>
```

**Request**
```json
{
  "status": "in_progress"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "task_123",
    "status": "in_progress",
    "updated_at": "2024-04-06T11:00:00Z"
  }
}
```

---

### Admin Endpoints

#### 1. Get Admin Reports
```
GET /admin/reports
```

**Query Parameters**
```
type=summary         # Report type (summary, detailed, analytics)
date_from=2024-03-01
date_to=2024-04-06
```

**Headers**
```
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2024-03-01",
      "to": "2024-04-06"
    },
    "statistics": {
      "total_issues": 250,
      "resolved": 180,
      "pending": 70,
      "average_resolution_time": "2.5 days"
    }
  }
}
```

---

#### 2. Manage Sub-Admins
```
POST /admin/sub-admins
GET /admin/sub-admins
PUT /admin/sub-admins/{admin_id}
DELETE /admin/sub-admins/{admin_id}
```

**Create Sub-Admin Request**
```json
{
  "name": "District Admin",
  "phone": "+919876543210",
  "role": "district_admin",
  "district_id": "district_123"
}
```

**Response (201)**
```json
{
  "success": true,
  "data": {
    "id": "admin_456",
    "name": "District Admin",
    "role": "district_admin",
    "created_at": "2024-04-06T10:30:00Z"
  }
}
```

---

### Location Endpoints

#### 1. Get Districts
```
GET /locations/districts
```

**Headers**
```
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "district_123",
        "name": "Nagpur",
        "state": "Maharashtra",
        "centroid": {
          "latitude": 21.1458,
          "longitude": 79.0882
        }
      }
    ]
  }
}
```

---

#### 2. Get Talukas
```
GET /locations/districts/{district_id}/talukas
```

**Headers**
```
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "taluka_456",
        "name": "Nagpur",
        "district_id": "district_123",
        "centroid": {
          "latitude": 21.1458,
          "longitude": 79.0882
        }
      }
    ]
  }
}
```

---

#### 3. Get Wards
```
GET /locations/talukas/{taluka_id}/wards
```

**Headers**
```
Authorization: Bearer <access_token>
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "ward_789",
        "name": "Ward 1",
        "ward_number": 1,
        "taluka_id": "taluka_456",
        "centroid": {
          "latitude": 21.1458,
          "longitude": 79.0882
        }
      }
    ]
  }
}
```

---

## Retry Strategy

### Automatic Retry Configuration
```javascript
// API client automatically retries on transient errors
{
  maxRetries: 3,           // Maximum 3 attempts
  baseDelay: 1000,         // Start with 1 second
  factor: 2                // Exponential backoff (1s, 2s, 4s)
}
```

### Which Errors are Retried?

**Automatically Retried:**
- 408 (Timeout)
- 429 (Rate Limited)
- 503 (Service Unavailable)
- 504 (Gateway Timeout)
- Network errors (ECONNABORTED, ENOTFOUND, etc.)

**Not Retried:**
- 400 (Validation Error)
- 401 (Unauthorized) - triggers token refresh
- 403 (Forbidden)
- 404 (Not Found)
- 422 (Unprocessable)

### Custom Retry Options
```javascript
// Override default retry settings
await apiPost('/critical-endpoint', data, {
  maxRetries: 5,           // More retries for critical ops
  baseDelay: 2000,         // Longer delay
  shouldRetry: (error) => {
    // Custom retry logic
    return error.response?.status !== 400;
  }
});
```

---

## Rate Limiting

### Limits
```
10 requests per second per API key
100 requests per minute per user
1000 requests per hour per user
```

### Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1712403600
```

### Handling Rate Limits
```javascript
// If 429 received, client automatically retries after delay
// Delay calculated: baseDelay * (factor ^ retryCount)
// Example: 1000 * (2 ^ 2) = 4000ms = 4 seconds
```

---

## Examples

### Example 1: Create Issue with Photos
```javascript
import { apiPost } from '@/api/client';
import { validateForm } from '@/utils/validators';
import { useUiStore } from '@/store/uiStore';

async function reportIssue(formData) {
  const { addToast } = useUiStore();

  // Validate form
  const validation = validateForm('createIssue', formData);
  if (!validation.valid) {
    Object.entries(validation.errors).forEach(([field, message]) => {
      addToast(`${field}: ${message}`, 'error');
    });
    return;
  }

  try {
    const { data } = await apiPost('/issues', {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      location: {
        latitude: formData.lat,
        longitude: formData.lng,
      },
      photos: formData.photoIds,
    });

    addToast('Issue reported successfully!', 'success');
    return data;
  } catch (error) {
    addToast(getErrorMessage(error, 'Failed to report issue'), 'error');
  }
}
```

---

### Example 2: Fetch Issues with Pagination
```javascript
import { apiGet, getErrorMessage } from '@/api/client';
import { useUiStore } from '@/store/uiStore';

async function fetchIssues(page = 1, filters = {}) {
  const { addToast } = useUiStore();

  try {
    const { data } = await apiGet('/issues', {
      page,
      size: 20,
      status: filters.status,
      category: filters.category,
      search: filters.search,
    });

    return data;
  } catch (error) {
    addToast(getErrorMessage(error, 'Failed to load issues'), 'error');
    throw error;
  }
}
```

---

### Example 3: Update Issue with Retry
```javascript
import { apiPatch } from '@/api/client';

async function updateIssueStatus(issueId, status) {
  // Custom retry for critical operation
  const { data } = await apiPatch(
    `/issues/${issueId}/status`,
    { status },
    {
      maxRetries: 5,      // More retries
      baseDelay: 2000,    // Longer delay
    }
  );

  return data;
}
```

---

### Example 4: Handle Validation Errors
```javascript
import { apiPost, getErrorMessage } from '@/api/client';
import { getValidationErrors } from '@/utils/errorHandler';

async function createUser(userData) {
  try {
    await apiPost('/users', userData);
  } catch (error) {
    if (isValidationError(error)) {
      const fieldErrors = getValidationErrors(error);
      // Show field-specific errors to user
      Object.entries(fieldErrors).forEach(([field, message]) => {
        setFieldError(field, message);
      });
    } else {
      // Show generic error message
      addToast(getErrorMessage(error), 'error');
    }
  }
}
```

---

## Support

For API issues or questions:
- **Documentation**: See INTEGRATION_EXAMPLES.md
- **Issues**: Check GitHub issues tracker
- **Support**: contact@civic.example.com

---

**Version**: 1.0 | **Last Updated**: April 6, 2026
