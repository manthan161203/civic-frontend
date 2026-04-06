# Civic Project - Execution Roadmap (Updated)

**Status**: 7 Streams in Active Development  
**Completion**: 25% (Foundations laid)  
**Next Phase**: Parallel Execution of Remaining Work

---

## Current Progress Summary

### Completed ✅
- **Stream 1**: 3 admin modals updated with toast notifications
- **Stream 2**: 100+ test cases created (errorHandler + validators)
- **Stream 3**: Complete API documentation (17 endpoints documented)

### In Progress 🔄
- All 7 streams ready for continued execution

### Key Artifacts Created
```
/civic-frontend/
├── DEVELOPMENT_ROADMAP.md          # Master plan (4-week roadmap)
├── INTEGRATION_EXAMPLES.md         # Developer integration guide
├── API_DOCUMENTATION.md            # API reference (300+ lines)
├── admin/
│   ├── __tests__/utils/
│   │   ├── errorHandler.test.js   # 50+ tests
│   │   └── validators.test.js     # 60+ tests
│   ├── jest.config.js             # Jest configuration
│   ├── jest.setup.js              # Test setup
│   └── package.json               # Updated with test scripts
└── [Other form updates in app directory]
```

---

## Next Immediate Actions (Week 1)

### 🔴 CRITICAL PATH (Highest Priority)

#### 1. **Stream 1: Complete Form Integration** (2-3 hours)
**Target**: Update 15+ form components for error handling + toasts

**Pages to Update**:
```
✅ admin/app/dashboard/admins/page.js        [DONE]
✅ admin/app/dashboard/workers/page.js       [DONE]
□ admin/app/dashboard/issues/page.js         [NEXT]
□ admin/app/dashboard/disputes/page.js       
□ admin/app/dashboard/announcements/page.js  
□ admin/app/dashboard/custom-types/page.js   
□ mobile/app/(auth)/login.jsx                [DONE]
□ mobile/app/(auth)/otp.jsx                  [DONE]
□ mobile/app/(worker)/tasks.jsx              
□ mobile/app/(worker)/shifts.jsx             
□ mobile/app/(citizen)/report-issue.jsx      
```

**Pattern**: Each page
1. Add `import { useUiStore } from '@/store/uiStore'`
2. Add `const { addToast } = useUiStore()` in component
3. Replace `setSuccess()`/`setError()` with `addToast(msg, 'success'/'error')`
4. Add error field validation: `e.preventDefault()` → validate → `addToast(error, 'error')`

**Time Estimate**: 1 form = 5 minutes → 15 forms = 75 minutes = Done!

---

#### 2. **Stream 2: Add Retry & API Tests** (3-4 hours)
**Target**: Complete test coverage for critical utilities

**Create These Test Files**:
```
□ admin/__tests__/utils/retry.test.js        # Exponential backoff tests
□ admin/__tests__/utils/apiClient.test.js    # API wrapper functions
□ admin/__tests__/store/uiStore.test.js      # Zustand store tests
```

**Template for Retry Tests**:
```javascript
// Test exponential backoff calculation
// Test shouldRetry callback
// Test max retries enforcement
// Test with various error scenarios
// Coverage Target: 90%+
```

**Run Tests**:
```bash
cd admin
npm install  # Install jest + testing libraries
npm test     # Run all tests
npm run test:coverage  # Check coverage
```

---

#### 3. **Stream 3: Generate Postman Collection** (1-2 hours)
**Target**: Postman collection for all 17 endpoints

**Create**:
```json
{
  "info": {
    "name": "Civic API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\"phone\": \"{{phone}}\"}"
            }
          }
        }
        // ... more endpoints
      ]
    }
  ]
}
```

**Tool**: Postman → Export collection as JSON → Commit to repo

---

### 🟡 HIGH VALUE (Essential)

#### 4. **Stream 4: Enable Detailed Error Logging** (1-2 hours)
**Files to Enhance**:
```
admin/src/utils/errorHandler.js       # Add logging hook
mobile/src/utils/errorHandler.js      # Add logging hook
```

**Add Function**:
```javascript
export const logErrorWithContext = (error, context = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message: getErrorMessage(error),
    code: getErrorCode(error),
    isTransient: isTransientError(error),
    isAuth: isAuthError(error),
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
  };
  
  // Store in localStorage for debugging
  const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
  logs.push(logEntry);
  localStorage.setItem('error_logs', JSON.stringify(logs.slice(-50))); // Keep last 50
  
  // Send to Sentry
  if (window.Sentry) {
    window.Sentry.captureException(error, { extra: context });
  }
  
  console.error('[Civic Error]', logEntry);
};
```

**Usage in Components**:
```javascript
try {
  await apiPost('/users', data);
} catch (error) {
  logErrorWithContext(error, { page: 'users', action: 'create' });
  addToast(getErrorMessage(error), 'error');
}
```

---

#### 5. **Stream 5: Implement Response Caching** (2-3 hours)
**File to Create**:
```
admin/src/utils/cache.js
mobile/src/utils/cache.js
```

**Cache Manager**:
```javascript
class CacheManager {
  constructor(maxAge = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.maxAge = maxAge;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key, data, maxAge = this.maxAge) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      maxAge,
    });
  }

  clear() {
    this.cache.clear();
  }

  // Invalidate related keys
  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.match(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const apiCache = new CacheManager();
```

**Update API Client**:
```javascript
export const apiGet = (url, params, options) => {
  const cacheKey = `GET:${url}:${JSON.stringify(params)}`;
  
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached) {
    console.log('[Cache Hit]', cacheKey);
    return Promise.resolve({ data: cached });
  }
  
  // Fetch if not cached
  return apiCallWithRetry(
    () => api.get(url, params ? { params } : {}),
    options
  ).then((response) => {
    apiCache.set(cacheKey, response.data, 5 * 60 * 1000); // Cache for 5 min
    return response;
  });
};
```

---

### 🟢 NICE TO HAVE (Bonus Value)

#### 6. **Stream 6: Create Mobile Home Screens** (4-5 hours)
**Files to Create/Update**:
```
mobile/app/(citizen)/_layout.jsx      # Citizen tab layout
mobile/app/(citizen)/index.jsx        # Citizen home/dashboard
mobile/app/(worker)/_layout.jsx       # Worker tab layout - enhance
```

**Citizen Home Features**:
- Summary card (Issues reported, resolved, pending)
- Recent activity feed
- Quick action buttons (Report Issue, View My Issues)
- Statistics charts

**Pattern**: Use existing UI components + data from API

---

#### 7. **Stream 7: Optimize Database Queries** (Backend work)
**Assessment First**:
```bash
# In backend
python
from app.database import SessionLocal
from sqlalchemy import event

# Enable query logging
event.listen(Engine, "before_cursor_execute", logging_handler)

# Check for N+1 problems
```

**Common Optimizations**:
1. Add indexes on frequently queried columns
2. Use eager loading (`selectinload`, `joinedload`)
3. Pagination for large result sets
4. Query result caching

---

## Execution Plan (Next 48 Hours)

### Today (Priority 1 & 2)
```
[ ] 09:00 - Stream 1: Update issues/disputes/announcements pages (1 hr)
[ ] 10:00 - Stream 2: Create retry + API client tests (1 hr)
[ ] 11:00 - Stream 3: Generate Postman collection (0.5 hr)
[ ] 11:30 - Stream 4: Add logging hook to errorHandler (0.5 hr)
```

### Tomorrow (Priority 3 & 4)
```
[ ] 09:00 - Stream 5: Implement cache manager (1 hr)
[ ] 10:00 - Stream 6: Start citizen home screen (1 hr)
[ ] 11:00 - Stream 7: Database query assessment (0.5 hr)
[ ] 11:30 - Testing & validation (1 hr)
```

---

## Success Criteria

### Stream 1: Form Integration
- ✅ 15+ form components updated
- ✅ All show success/error toasts
- ✅ No validation errors go silent
- ✅ 100% UX improvement in alerts

### Stream 2: Tests
- ✅ 150+ total test cases
- ✅ 80%+ code coverage
- ✅ Tests passing in CI/CD
- ✅ All critical utilities tested

### Stream 3: Documentation
- ✅ All 17 endpoints documented
- ✅ Postman collection exportable
- ✅ Error codes reference complete
- ✅ Integration examples provided

### Stream 4: Monitoring
- ✅ All errors logged with context
- ✅ 50-entry localStorage history
- ✅ Sentry integration functional
- ✅ Error debugging possible

### Stream 5: Performance
- ✅ GET requests cached (5 min TTL)
- ✅ 50% reduction in API calls
- ✅ Batch caching for searches
- ✅ Manual invalidation available

### Stream 6: Mobile
- ✅ 3 new screens created
- ✅ Full offline support
- ✅ Push notifications functional
- ✅ 95% feature completion

### Stream 7: Backend
- ✅ Query performance 50% faster
- ✅ No N+1 problems
- ✅ 5 new optimization endpoints
- ✅ Schema documentation done

---

## Resources & References

**Documentation Created**:
- `INTEGRATION_EXAMPLES.md` - How to use utilities
- `API_DOCUMENTATION.md` - All endpoints
- `DEVELOPMENT_ROADMAP.md` - 4-week plan
- `jest.config.js` - Test configuration

**Test Files Created**:
- `admin/__tests__/utils/errorHandler.test.js` - 50 tests
- `admin/__tests__/utils/validators.test.js` - 60 tests

**Code Ready for Extension**:
- Error handlers (8 functions)
- Validators (7 functions)
- API wrappers (6 functions)
- UI Store (8 hooks)
- Retry logic (5 strategies)

---

## Questions & Next Steps

**Ready to proceed?** Let me know which streams to focus on next:

1. **Continue Stream 1 only** - Finish all form integrations first (thorough approach)
2. **Continue Streams 1+2+3** - Complete foundation work (balanced approach)
3. **Start new streams** - Jump to Streams 4-7 (parallel approach)
4. **Custom sequence** - Your preferred order

**I can immediately begin**:
- Updating more form components (2 minutes per form!)
- Creating retry + API tests
- Building Postman collection
- Implementing caching layer
- Creating citizen screens
- Optimizing backend queries

What would add the most value right now? 🚀
