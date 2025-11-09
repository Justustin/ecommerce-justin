# Group Buying Service - Test Plan

**Service:** Group Buying Service (Grosir)
**Port:** 3004
**Swagger URL:** http://localhost:3004/api-docs
**Created:** 2025-11-09

---

## Purpose

This test plan verifies all critical bug fixes in the Group Buying Service:
- ✅ Fixed package.json metadata
- ✅ Fixed property name mismatches in error handling
- ✅ Implemented secure session code generation with collision checking
- ✅ Added transaction wrapping for bot creation and tier updates
- ✅ Fixed MOQ comparison logic (totalQuantity instead of participantCount)
- ✅ Added epsilon comparison for floating-point safety

---

## Prerequisites

1. Start Group Buying Service: `cd services/group-buying- service && npm run dev`
2. Ensure database is running and migrated
3. Open Swagger UI: http://localhost:3005/api-docs
4. Have the following UUIDs ready:
   - **Product UUID**: A valid product from products table
   - **Factory UUID**: A valid factory from factories table
   - **User UUID**: A valid user from users table

**Get Required UUIDs:**
```sql
-- Get a product
SELECT id, name FROM products LIMIT 1;

-- Get a factory
SELECT id, factory_name FROM factories LIMIT 1;

-- Get a user
SELECT id, first_name FROM users LIMIT 1;
```

---

## Test Execution Instructions

- Run tests **in sequential order**
- Record the results for each test (PASS/FAIL)
- Copy the actual response if it fails
- Save session IDs and codes from responses to use in later tests

---

## Test Cases

### Test 1: Health Check
**Purpose:** Verify service is running

**Endpoint:** `GET /health`

**Expected Response:** `200 OK`
```json
{
  "status": "ok",
  "service": "group-buying-service"
}
```

**What This Tests:**
- ✅ Service starts successfully
- ✅ Service name is correct (not "product-service")

**Result:** [ ] PASS [ ] FAIL

---

### Test 2: Create Group Buying Session - Secure Code Generation!
**Purpose:** Test secure session code generation with collision checking

**Endpoint:** `POST /api/group-buying`

**Request Body:**
```json
{
  "productId": "YOUR_PRODUCT_UUID_HERE",
  "factoryId": "YOUR_FACTORY_UUID_HERE",
  "targetMoq": 100,
  "groupPrice": 150000,
  "endTime": "2025-11-15T23:59:59Z",
  "priceTier25": 180000,
  "priceTier50": 165000,
  "priceTier75": 155000,
  "priceTier100": 150000,
  "estimatedCompletionDate": "2025-11-30"
}
```

**Expected Response:** `201 Created`
```json
{
  "message": "Group buying session created successfully",
  "data": {
    "id": "uuid-here",
    "product_id": "your-product-uuid",
    "factory_id": "your-factory-uuid",
    "session_code": "GB-20251109-XXXXX",
    "target_moq": 100,
    "group_price": "150000",
    "status": "forming",
    "price_tier_25": "180000",
    "price_tier_50": "165000",
    "price_tier_75": "155000",
    "price_tier_100": "150000",
    "current_tier": 25,
    "start_time": "timestamp",
    "end_time": "2025-11-15T23:59:59.000Z"
  }
}
```

**What This Tests:**
- ✅ Session code is generated securely (crypto.randomBytes)
- ✅ Session code format: GB-YYYYMMDD-XXXXX
- ✅ No collision errors
- ✅ Tiering system properly initialized

**Save the session_code and id from response for later tests!**

**Result:** [ ] PASS [ ] FAIL

**If Failed, Copy Error:**
```
Paste error here
```

---

### Test 3: Create Second Session - Collision Check
**Purpose:** Verify no session code collisions occur

**Endpoint:** `POST /api/group-buying`

**Request Body:** Use same data as Test 2 but different estimatedCompletionDate

**Expected Response:** `201 Created` with a DIFFERENT session_code

**What This Tests:**
- ✅ Session code collision checking works
- ✅ Each session gets unique code

**Result:** [ ] PASS [ ] FAIL

---

### Test 4: List Active Sessions
**Purpose:** Verify sessions are created and listable

**Endpoint:** `GET /api/group-buying`

**Query Parameters:** (optional)
- `activeOnly=true`
- `page=1`
- `limit=10`

**Expected Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "session_code": "GB-20251109-XXXXX",
      "target_moq": 100,
      "group_price": "150000",
      "status": "forming",
      "current_tier": 25,
      "products": {
        "id": "uuid",
        "name": "Product Name"
      },
      "factories": {
        "id": "uuid",
        "factory_name": "Factory Name"
      }
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

**What This Tests:**
- ✅ Session listing works
- ✅ Includes product and factory information

**Result:** [ ] PASS [ ] FAIL

---

### Test 5: Get Session by Code
**Purpose:** Verify session lookup by code works

**Endpoint:** `GET /api/group-buying/code/{code}`

**Parameters:**
- Use session_code from Test 2

**Expected Response:** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "session_code": "GB-20251109-XXXXX",
    "target_moq": 100,
    "group_price": "150000",
    "current_tier": 25,
    "products": {
      "name": "Product Name"
    }
  }
}
```

**What This Tests:**
- ✅ Session code lookup works
- ✅ Session data is complete

**Result:** [ ] PASS [ ] FAIL

---

### Test 6: Join Group Buying Session
**Purpose:** Test joining a session

**Endpoint:** `POST /api/group-buying/{id}/join`

**Parameters:**
- Use session ID from Test 2

**Request Body:**
```json
{
  "userId": "YOUR_USER_UUID_HERE",
  "quantity": 10,
  "unitPrice": 150000,
  "totalPrice": 1500000,
  "variantId": null
}
```

**Expected Response:** `201 Created`
```json
{
  "message": "Successfully joined the session",
  "data": {
    "id": "uuid",
    "group_session_id": "session-uuid",
    "user_id": "your-user-uuid",
    "quantity": 10,
    "unit_price": "150000",
    "total_price": "1500000",
    "joined_at": "timestamp"
  }
}
```

**What This Tests:**
- ✅ Users can join sessions
- ✅ Quantity tracking works

**Result:** [ ] PASS [ ] FAIL

---

### Test 7: Get Session Stats - MOQ Comparison Fix!
**Purpose:** Test MOQ calculation uses totalQuantity not participantCount

**Endpoint:** `GET /api/group-buying/{id}/stats`

**Parameters:**
- Use session ID from Test 2

**Expected Response:** `200 OK`
```json
{
  "data": {
    "participantCount": 1,
    "totalQuantity": 10,
    "totalRevenue": "1500000",
    "targetMoq": 100,
    "progress": 10.0,
    "moqReached": false,
    "status": "forming"
  }
}
```

**What This Tests:**
- ✅ MOQ calculation uses totalQuantity (10) not participantCount (1)
- ✅ Progress is 10% (10/100) not 1% (1/100)
- ✅ moqReached is false because 10 < 100

**CRITICAL:** If progress shows 1% instead of 10%, the bug is NOT fixed!

**Result:** [ ] PASS [ ] FAIL

---

### Test 8: Join Session with More Quantity
**Purpose:** Test MOQ threshold with epsilon comparison

**Endpoint:** `POST /api/group-buying/{id}/join`

**Request Body:**
```json
{
  "userId": "YOUR_USER_UUID_HERE",
  "quantity": 90,
  "unitPrice": 150000,
  "totalPrice": 13500000,
  "variantId": null
}
```

**Expected Response:** `201 Created`

**Then GET /api/group-buying/{id}/stats**

**Expected Response:**
```json
{
  "data": {
    "participantCount": 2,
    "totalQuantity": 100,
    "targetMoq": 100,
    "progress": 100.0,
    "moqReached": true,
    "status": "forming"
  }
}
```

**What This Tests:**
- ✅ Epsilon comparison works (100.0 + 0.0001 >= 100)
- ✅ MOQ is correctly reached when totalQuantity = 100
- ✅ Uses totalQuantity (100) not participantCount (2)

**Result:** [ ] PASS [ ] FAIL

---

### Test 9: Get Participants
**Purpose:** Verify participant listing

**Endpoint:** `GET /api/group-buying/{id}/participants`

**Expected Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "quantity": 10,
      "users": {
        "first_name": "User Name",
        "email": "user@example.com"
      }
    },
    {
      "id": "uuid",
      "user_id": "uuid",
      "quantity": 90
    }
  ]
}
```

**What This Tests:**
- ✅ Participant listing works
- ✅ Shows correct quantities

**Result:** [ ] PASS [ ] FAIL

---

### Test 10: Update Session
**Purpose:** Test session updating

**Endpoint:** `PATCH /api/group-buying/{id}`

**Request Body:**
```json
{
  "endTime": "2025-11-20T23:59:59Z",
  "priceTier25": 185000
}
```

**Expected Response:** `200 OK`
```json
{
  "message": "Session updated successfully",
  "data": {
    "id": "uuid",
    "end_time": "2025-11-20T23:59:59.000Z",
    "price_tier_25": "185000",
    "updated_at": "new-timestamp"
  }
}
```

**What This Tests:**
- ✅ Session updates work
- ✅ Only forming/active sessions can be updated

**Result:** [ ] PASS [ ] FAIL

---

### Test 11: List All Sessions with Filters
**Purpose:** Test session listing with filters

**Endpoint:** `GET /api/group-buying`

**Query Parameters:** (optional)
- `status=forming`
- `page=1`
- `limit=10`

**Expected Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "session_code": "GB-20251109-XXXXX",
      "status": "forming",
      "target_moq": 100,
      "products": {
        "name": "Product Name"
      }
    }
  ]
}
```

**What This Tests:**
- ✅ Session listing with status filtering works
- ✅ Pagination works

**Result:** [ ] PASS [ ] FAIL

---

### Test 12: Cancel Session
**Purpose:** Test session cancellation

**Endpoint:** `POST /api/group-buying/{id}/cancel`

**Request Body:**
```json
{
  "reason": "Testing cancellation"
}
```

**Expected Response:** `200 OK`
```json
{
  "message": "Session cancelled and refunds processed",
  "participantsRefunded": 2
}
```

**What This Tests:**
- ✅ Session cancellation works
- ✅ Refund processing works

**Result:** [ ] PASS [ ] FAIL

---

### Test 13: Verify Cancellation
**Purpose:** Confirm session is cancelled

**Endpoint:** `GET /api/group-buying/{id}`

**Expected Response:** `200 OK` with status = 'cancelled'

**What This Tests:**
- ✅ Session status updated correctly

**Result:** [ ] PASS [ ] FAIL

---

## Test Summary

| Test # | Test Name | Result | Notes |
|--------|-----------|--------|-------|
| 1 | Health Check | [ ] | |
| 2 | Create Session (Secure Code) | [ ] | |
| 3 | Create Second Session (Collision Check) | [ ] | |
| 4 | List Active Sessions | [ ] | |
| 5 | Get Session by Code | [ ] | |
| 6 | Join Session | [ ] | |
| 7 | Get Session Stats (MOQ Fix) | [ ] | CRITICAL TEST |
| 8 | Join Session (Epsilon Test) | [ ] | CRITICAL TEST |
| 9 | Get Participants | [ ] | |
| 10 | Update Session | [ ] | |
| 11 | Admin Get All Sessions | [ ] | |
| 12 | Admin Cancel Session | [ ] | |
| 13 | Verify Cancellation | [ ] | |

**Total Tests:** 13
**Passed:** ___
**Failed:** ___

---

## Critical Tests (Must Pass)

These tests verify the critical bug fixes:

- **Test 2** - Secure session code generation (crypto-based, not Math.random)
- **Test 3** - Collision checking (each code is unique)
- **Test 7** - MOQ uses totalQuantity not participantCount (was completely wrong)
- **Test 8** - Epsilon comparison for floating-point safety

**If any of these fail, report the error and I'll fix it immediately!**

---

## Common Issues to Watch For

### Issue 1: Wrong MOQ calculation
**Symptom:** Progress shows 1% when 1 person joins with 10 quantity (should be 10%)
**Means:** Still using participantCount instead of totalQuantity
**Report:** Exact progress value from Test 7

### Issue 2: Session code format wrong
**Symptom:** Code doesn't match GB-YYYYMMDD-XXXXX format
**Means:** Code generation not working correctly
**Report:** Actual session_code received

### Issue 3: Duplicate session codes
**Symptom:** Two sessions get the same code
**Means:** Collision checking not working
**Report:** Both session codes

### Issue 4: MOQ not reached when should be
**Symptom:** moqReached is false when totalQuantity >= targetMoq
**Means:** Epsilon comparison or comparison logic broken
**Report:** Exact values: totalQuantity, targetMoq, moqReached

---

## After Testing

Report results in this format:
```
Test 7: FAIL
Stats show participantCount: 1, totalQuantity: 10, progress: 1% (should be 10%)
Bug: Still using participantCount for MOQ calculation

Test 2: PASS
Session code: GB-20251109-A8F3D

All other tests: PASS
```

I'll fix any failures and we can re-test before updating the documentation!

---

**Good luck with testing! 🧪**
