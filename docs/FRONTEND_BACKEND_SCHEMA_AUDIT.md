# Civic Application - Frontend/Backend Schema Audit Report

**Date:** 6 April 2026  
**Audit Scope:** All frontend dashboard and mobile app files  
**Backend Schema Source:** 
- `/civic-backend/app/schemas/issue.py`
- `/civic-backend/app/models/issue.py`
- `/civic-backend/app/routes/issues.py`

---

## Executive Summary

This audit examined all frontend code in the Civic application to identify field mismatches between what the frontend displays and what the backend API actually returns.

### Key Findings:
- **2 CRITICAL Issues** - Frontend will fail or display incorrect data
- **Multiple WARNING Issues** - Fields that may be used but don't exist
- **Mobile App:** GREEN - No critical issues found
- **Admin Dashboard:** MIXED - Several critical issues in specific pages

---

## Critical Issues Requiring Immediate Fix

### 🔴 CRITICAL #1: SLA Dashboard Page

**File:** [civic-frontend/admin/app/dashboard/sla/page.js](civic-frontend/admin/app/dashboard/sla/page.js)

**Problem Statement:**
The SLA Dashboard page is trying to access data fields and array structures that the backend does not return. This will cause the page to crash or display blank data.

**Detailed Issues:**

#### Issue #1a: Wrong Array Structure
| What Frontend Expects | What Backend Returns | Impact |
|----------------------|---------------------|--------|
| `data.sla_issues` | `escalated_issues` + `at_risk_issues` | Page crashes - array is undefined |

**Code Example (Line 21):**
```javascript
let issues = data.sla_issues || [];  // BUG: Backend doesn't return sla_issues
```

**Correct Approach:**
```javascript
let escalatedIssues = data.escalated_issues || [];
let atRiskIssues = data.at_risk_issues || [];
// Then handle both arrays separately or merge them
```

**Lines Affected:** 21, 23, 25, 63

---

#### Issue #1b: Non-existent Field `sla_status`
| Field Used | Correct Field | Notes |
|-----------|---------------|-------|
| `i.sla_status` | None - computed field | Should derive from `hours_remaining` |

**Backend Returns:** Issues with `hours_remaining` (numeric) and `escalated_issues`/`at_risk_issues` separation  
**Frontend Expects:** A single `sla_status` field with values: `'breached'`, `'warning'`, `'ontrack'`

**Code Examples:**
- Line 23: `i.sla_status === 'breached'`
- Line 25: `i.sla_status === 'warning'`
- Line 63: `i.sla_status === 'ontrack'`
- Lines 138, 140, 165, 166, 169, 176

**Fix Required:**
Compute status from the response structure:
- `escalated_issues` → `sla_status = 'breached'`
- `at_risk_issues` → `sla_status = 'warning'`
- Not in either → `sla_status = 'ontrack'`

---

#### Issue #1c: Non-existent Fields `response_time_hours` and `resolution_time_hours`
| Field Used | What Backend Actually Returns |
|-----------|------------------------------|
| `i.response_time_hours` | `i.hours_remaining` |
| `i.resolution_time_hours` | Does not exist - use `i.sla_hours` |

**Code Examples:**
- Line 154: `Response: {issue.response_time_hours}h`
- Line 160: `Resolution: {issue.resolution_time_hours}h`

**Fix:** Replace with backend fields:
- `response_time_hours` → `sla_hours` (SLA threshold)
- `resolution_time_hours` → `hours_remaining` (time left before breach)

---

**Severity:** 🔴 CRITICAL  
**Impact:** Page will not display SLA metrics correctly; filtering will fail  
**User Impact:** Admins cannot monitor SLA compliance

---

### 🔴 CRITICAL #2: AI Insights Page

**File:** [civic-frontend/admin/app/dashboard/ai-insights/page.js](civic-frontend/admin/app/dashboard/ai-insights/page.js)

**Problem Statement:**
The page references a field `reported_by_type` that does not exist in the Issue schema. This will display empty/undefined values to admins.

**Issue Details:**

#### Non-existent Field: `reported_by_type`
| What Frontend Uses | Correct Field | Type |
|------------------|---------------|------|
| `issue.reported_by_type` | Does not exist | — |
| Alternative | `issue.reporter` | object: `{id, name, phone}` |

**Code Location:**
- Line 145 in modal: `<p className="text-gray-600">{issue.reported_by_type}</p>`

**What Exists Instead:**
```python
reporter = relationship("User", foreign_keys=[reporter_id])

class IssueReporterInfo(BaseModel):
    id: UUID
    name: Optional[str] = None
    phone: Optional[str] = None
```

**Backend Returns:**
```json
{
  "reporter": {
    "id": "uuid-here",
    "name": "Citizen Name",
    "phone": "+91-xxxx-xxxx"
  }
}
```

**Fix Required:**
Replace:
```javascript
issue.reported_by_type
```

With:
```javascript
issue.reporter?.name || 'Anonymous'
```

Or display full reporter info:
```javascript
<p className="text-gray-600">{issue.reporter?.name} ({issue.reporter?.phone})</p>
```

---

**Severity:** 🔴 CRITICAL  
**Impact:** Modal will show empty "Reporter Type" field  
**User Impact:** Admins see blank value instead of reporter information

---

## Warning Issues

### ⚠️ WARNING #1: SLA Dashboard - Inconsistent Data Structure

**File:** [civic-frontend/admin/app/dashboard/sla/page.js](civic-frontend/admin/app/dashboard/sla/page.js)

**Issue:** The SLA dashboard endpoint returns a different structure than the regular Issues endpoint.

**Mismatch Examples:**

| Field | Regular Issues Response | SLA Dashboard Response |
|-------|----------------------|----------------------|
| Created date | `created_at: ISO string` | `created_at: ISO string` ✓ |
| Hours info | Not present | `sla_hours`, `hours_remaining` |
| Worker assignment | `assigned_worker_id`, `assigned_worker_name` | Not included (endpoint returns minimal data) |
| Full issue data | All 40+ fields | Only ~10 fields for display |

**Implication:** If the code tries to access fields like `issue.status`, `issue.description`, etc. from the SLA response, it will get `undefined`.

---

### ⚠️ WARNING #2: Mobile App Survey Data

**File:** [civic-frontend/mobile/app/issue/[id].jsx](civic-frontend/mobile/app/issue/[id].jsx)

**Issue:** The app sends `speed_rating` as part of update payload (line 157).

**Code:**
```javascript
const surveyData = {
  speed_rating: speedRating,
  ...
};
```

**Q: Does the backend Issue.update endpoint accept this field?**
- Likely NO - this should go to a separate survey endpoint
- The backend IssueUpdate schema only accepts: `status`, `resolution_notes`, `assigned_worker_id`, `citizen_rating`, `priority`, `department`
- `speed_rating` is a survey response field, not an issue field

**Severity:** ⚠️ WARNING (likely silently ignored by backend)

---

## Detailed File-by-File Analysis

### Admin Dashboard Pages

#### ✅ CORRECT: Issues List Page
**File:** [civic-frontend/admin/app/dashboard/issues/page.js](civic-frontend/admin/app/dashboard/issues/page.js)

**All field references verified:**
- ✓ `issue.before_photos`, `issue.after_photos`
- ✓ `issue.priority`, `issue.status`, `issue.issue_type`
- ✓ `issue.assigned_worker_id`, `issue.assigned_worker_name`
- ✓ `issue.address`, `issue.ward`, `issue.latitude`, `issue.longitude`
- ✓ `issue.upvote_count`, `issue.created_at`
- ✓ `issue.description`, `issue.severity`

**No Schema Mismatches Found** ✓

---

#### ✅ CORRECT: Surveys Page
**File:** [civic-frontend/admin/app/dashboard/surveys/page.js](civic-frontend/admin/app/dashboard/surveys/page.js)

**Survey-specific fields (CORRECT):**
- ✓ `s.speed_rating` (from survey endpoint)
- ✓ `s.fully_resolved` (from survey endpoint)
- ✓ `s.would_report_again` (from survey endpoint)
- ✓ `s.feedback` (from survey endpoint)

**Issue-specific fields (CORRECT):**
- ✓ `issue.comment_count`
- ✓ `issue.parent_issue_id`
- ✓ `issue.reassignment_count`
- ✓ `issue.before_photos`, `issue.after_photos`
- ✓ `issue.assigned_worker_name`

**No Schema Mismatches Found** ✓

---

#### ✅ CORRECT: AI Insights Tab (Detail Modal)
**File:** [civic-frontend/admin/app/dashboard/ai-insights/page.js](civic-frontend/admin/app/dashboard/ai-insights/page.js)
**Lines:** 49-150 (detail modal)

**AI fields correctly used:**
- ✓ `issue.ai_issue_type`
- ✓ `issue.ai_severity`
- ✓ `issue.ai_confidence`
- ✓ `issue.ai_suggested_description`
- ✓ `issue.ai_is_resolved`
- ✓ `issue.ai_resolution_quality`
- ✓ `issue.ai_resolution_notes`

**EXCEPT:**
- ❌ Line 145: `issue.reported_by_type` (DOES NOT EXIST - see CRITICAL #2)

**Other Issues referenced:**
- ✓ `issue.description`, `issue.status` (correct fields)

---

#### ✅ CORRECT: Analytics Page
**File:** [civic-frontend/admin/app/dashboard/analytics/page.js](civic-frontend/admin/app/dashboard/analytics/page.js)

**No issue-specific fields used in core logic**  
**No Schema Mismatches Found** ✓

---

### Mobile App Pages

#### ✅ CORRECT: Issue Detail Page
**File:** [civic-frontend/mobile/app/issue/[id].jsx](civic-frontend/mobile/app/issue/[id].jsx)

**All verified fields:**
- ✓ `issue.citizen_rating` (allows field update)
- ✓ `issue.before_photos`, `issue.after_photos`
- ✓ `issue.status`, `issue.priority`, `issue.issue_type`
- ✓ `issue.custom_issue_type_label`
- ✓ `issue.escalation_level`
- ✓ `issue.upvote_count`, `issue.address`, `issue.created_at`
- ✓ `issue.assigned_worker_id`, `issue.reporter_id`

**⚠️ Non-standard fields sent:**
- Line 157: Sends `speed_rating` with survey data (may not be accepted by Issue update endpoint)

**Otherwise: No Schema Mismatches** ✓

---

#### ✅ CORRECT: Citizen Index Page
**File:** [civic-frontend/mobile/app/(citizen)/index.jsx](civic-frontend/mobile/app/(citizen)/index.jsx)

**Fields used:**
- ✓ `item.citizen_rating`
- ✓ All standard issue fields

**No Schema Mismatches Found** ✓

---

#### ✅ CORRECT: Worker Pages
**Files:**
- [civic-frontend/mobile/app/(worker)/index.jsx](civic-frontend/mobile/app/(worker)/index.jsx)
- [civic-frontend/mobile/app/(worker)/task-detail.jsx](civic-frontend/mobile/app/(worker)/task-detail.jsx)
- [civic-frontend/mobile/app/(worker)/performance.jsx](civic-frontend/mobile/app/(worker)/performance.jsx)

**All fields verified as correct**  
**No Schema Mismatches Found** ✓

---

## Backend API Reference

### Issue Response Schema (IssueResponse)

**Standard Fields:**
```python
id: UUID
reporter_id: UUID
assigned_worker_id: Optional[UUID]
assigned_worker_name: Optional[str]  # Computed property
issue_type: str
custom_issue_type_label: Optional[str]
severity: str  # "high" | "medium" | "low"
priority: str  # "urgent" | "high" | "medium" | "low"
status: str  # "open" | "assigned" | "in_progress" | "resolved" | "closed"
department: Optional[str]
description: Optional[str]
latitude: float
longitude: float
address: Optional[str]
ward: Optional[str]
ward_id: Optional[UUID]
before_photos: List[str]
after_photos: List[str]
citizen_rating: Optional[int]  # 1-5 scale
upvote_count: int
user_upvoted: bool
```

**Escalation & Flags:**
```python
is_escalated: bool
escalated_at: Optional[datetime]
escalation_level: int  # 0=none, 1=ward, 2=taluka, 3=district
is_duplicate: bool
parent_issue_id: Optional[UUID]
```

**AI Fields:**
```python
ai_issue_type: Optional[str]
ai_severity: Optional[str]
ai_confidence: Optional[float]
ai_suggested_description: Optional[str]
ai_is_resolved: Optional[bool]
ai_resolution_quality: Optional[str]  # "good" | "partial" | "poor"
ai_resolution_notes: Optional[str]
```

**Resolution & Metadata:**
```python
resolution_notes: Optional[str]
is_blocked: bool
blocked_reason: Optional[str]
reassignment_count: int
is_deleted: bool
is_sos: bool
created_at: datetime
updated_at: datetime
resolved_at: Optional[datetime]
comment_count: int
reporter: Optional[IssueReporterInfo]  # {id, name, phone}
```

---

### SLA Dashboard Response Schema

**Endpoint:** `GET /issues/sla/dashboard`

**Returns:**
```python
{
    "escalated_count": int,
    "escalated_issues": [
        {
            "id": str,
            "id_short": str,
            "issue_type": str,
            "priority": str,
            "status": str,
            "ward": str,
            "created_at": ISO string,
            "sla_hours": int,
            "hours_remaining": float,
            "is_escalated": bool,
            "escalated_at": ISO string | null
        }
    ],
    "at_risk_count": int,
    "at_risk_issues": [  # Same structure as escalated_issues
    ],
    "compliance_by_priority": {
        "urgent": { "total": int, "compliant": int, "violated": int, "compliance_rate": float },
        "high": { ... },
        "medium": { ... },
        "low": { ... }
    },
    "updated_at": ISO string
}
```

**Key Differences from IssueResponse:**
- Returns TWO arrays: `escalated_issues` and `at_risk_issues`
- NO `sla_status` field
- NO `response_time_hours` or `resolution_time_hours`
- Minimal fields per issue (not full IssueResponse)
- Includes `hours_remaining` and `sla_hours`

---

## Fields That DON'T EXIST (Common Mistakes)

| Field Name | Why It's Wrong | Correct Alternative |
|-----------|--------------|-------------------|
| `priority_level` | Not in schema | `priority` |
| `rating` | Not in schema | `citizen_rating` |
| `photos` | Not in schema | `before_photos` + `after_photos` |
| `comments_count` | Wrong suffix | `comment_count` |
| `closed_at` | Not in schema | `resolved_at` |
| `reporter_name` | Wrong structure | `reporter.name` |
| `reporter_phone` | Wrong structure | `reporter.phone` |
| `assigned_worker_name` | Computed, not stored | Accessed as property (but exists) |
| `is_flagged` | Not in schema | `is_escalated` |
| `flag_count` | Not in schema | Does not exist |
| `sla_status` | Not in schema | Compute from endpoint response |
| `response_time_hours` | Not in schema | `sla_hours` (SLA threshold) |
| `resolution_time_hours` | Not in schema | `hours_remaining` |
| `reported_by_type` | Not in schema | `reporter.name` |

---

## Summary by Page

### Admin Dashboard

| Page | Status | Issues Found | Severity |
|------|--------|--------------|----------|
| Issues | ✅ PASS | None | — |
| SLA | ❌ FAIL | 3 issues | CRITICAL |
| AI Insights | ⚠️ PARTIAL | 1 issue | CRITICAL |
| Surveys | ✅ PASS | None | — |
| Analytics | ✅ PASS | None | — |
| Leaderboard | ✅ PASS | None | — |
| Workers | ✅ PASS | None | — |
| Citizens | ✅ PASS | None | — |
| Announcements | ✅ PASS | None | — |
| Disputes | ✅ PASS | None | — |
| Complaints | ✅ PASS | None | — |

### Mobile App

| Page | Status | Issues Found | Severity |
|------|--------|--------------|----------|
| Issue Detail | ✅ PASS* | None (minor warning) | — |
| Citizen Index | ✅ PASS | None | — |
| Worker Tasks | ✅ PASS | None | — |
| Worker Performance | ✅ PASS | None | — |
| Chat | ✅ PASS | None | — |

\* Line 157 sends `speed_rating` which may not be accepted; otherwise correct

---

## Recommendations for Immediate Action

### Priority 1: CRITICAL (Fix This Sprint)

1. **SLA Dashboard Page Fix**
   - [ ] Parse response into `escalated_issues` and `at_risk_issues` arrays
   - [ ] Compute `sla_status` from endpoint structure
   - [ ] Replace `response_time_hours` with `sla_hours`
   - [ ] Replace `resolution_time_hours` with `hours_remaining`
   - [ ] Add unit tests for data transformation

2. **AI Insights Page Fix**
   - [ ] Replace `issue.reported_by_type` with `issue.reporter?.name`
   - [ ] Test modal rendering with null reporter

### Priority 2: WARNING (Check This Sprint)

3. **Mobile App - Speed Rating**
   - [ ] Verify if `speed_rating` is accepted by `/issues/{id}` update endpoint
   - [ ] If not, create separate survey submission endpoint
   - [ ] Document which fields are for issue updates vs. survey submissions

### Priority 3: TESTING (Verify This Sprint)

4. **Comprehensive Testing**
   - [ ] Add E2E tests for SLA dashboard data loading
   - [ ] Add E2E tests for AI insights modal
   - [ ] Verify all field references against live API

---

## Notes for Development Team

### Backend Schema is Source of Truth
All frontend field references should be validated against:
- `/civic-backend/app/schemas/issue.py` (IssueResponse)
- `/civic-backend/app/routes/issues.py` (Endpoint definitions)

### Computed vs. Database Fields
- **Computed Properties:** `assigned_worker_name` - exists but computed from relationship
- **Relationships:** `reporter` is a full object, not a string field

### Endpoint-Specific Responses
Different endpoints return different structures:
- `/admin/issues` → Full IssueResponse with all fields
- `/issues/sla/dashboard` → Partial response with SLA metrics
- `/admin/surveys/stats` → Survey statistics (different schema)

Always check the backend endpoint code to see what it actually returns.

---

## Appendix: Full Code References

### SLA Dashboard Issue Reference

**Lines 21-63:** Data loading and filtering
**Lines 138-177:** Issue card rendering with sla_status, response_time_hours, resolution_time_hours

### AI Insights Issue Reference

**Line 145:** `issue.reported_by_type` field reference

---

**Report Generated:** 6 April 2026  
**Audit Completed By:** Frontend-Backend Schema Audit Tool
