# Factory Service - Test Plan

**Service:** Factory Service
**Port:** 3003
**Swagger URL:** http://localhost:3003/api-docs
**Created:** 2025-11-09

---

## Purpose

This test plan verifies all critical bug fixes in the Factory Service:
- ✅ Fixed package.json metadata
- ✅ Applied CORS middleware
- ✅ Fixed service name in logs
- ✅ Fixed route ordering (code/owner endpoints now reachable)
- ✅ Removed agent_offices includes
- ✅ Fixed admin registerFactory field names
- ✅ Fixed admin updateFactory field names
- ✅ Fixed suspension logic (status vs verification_status)
- ✅ Removed verification_notes usage
- ✅ Fixed verifyFactory to save verified_by
- ✅ Added P2002 error handling

---

## Prerequisites

1. Start Factory Service: `cd services/factory-service && npm run dev`
2. Ensure database is running and migrated
3. Open Swagger UI: http://localhost:3003/api-docs
4. Have a valid user UUID (for owner_id and verified_by)

**Get a User UUID:**
- Check your database: `SELECT id FROM users LIMIT 1;`
- Or use User Service to create a user first
- Example UUID format: `550e8400-e29b-41d4-a716-446655440000`

---

## Test Execution Instructions

- Run tests **in sequential order**
- Record the results for each test (PASS/FAIL)
- Copy the actual response if it fails
- Save factory IDs from responses to use in later tests

---

## Test Cases

### Test 1: Health Check
**Purpose:** Verify service is running

**Endpoint:** `GET /health`

**Expected Response:** `200 OK`
```json
{
  "status": "ok",
  "service": "factory-service"
}
```

**What This Tests:**
- ✅ Service starts successfully
- ✅ Service name is correct (not "product-service")

**Result:** [ ] PASS [ ] FAIL

---

### Test 2: Admin Register Factory - New Fix!
**Purpose:** Test the completely rewritten registerFactory method

**Endpoint:** `POST /api/admin/factories`

**Request Body:**
```json
{
  "ownerId": "YOUR_USER_UUID_HERE",
  "factoryCode": "FACT-JKT-001",
  "factoryName": "PT Batik Jakarta",
  "phoneNumber": "+6281234567890",
  "email": "contact@batikjakarta.com",
  "province": "DKI Jakarta",
  "city": "Jakarta Selatan",
  "district": "Kebayoran Baru",
  "postalCode": "12345",
  "addressLine": "Jl. Sudirman No. 123",
  "description": "Premium batik manufacturer",
  "businessLicenseNumber": "BLN-123456",
  "taxId": "01.234.567.8-901.000",
  "logoUrl": "https://example.com/logo.png"
}
```

**Expected Response:** `201 Created`
```json
{
  "message": "Factory registered successfully",
  "data": {
    "id": "uuid-here",
    "owner_id": "your-user-uuid",
    "factory_code": "FACT-JKT-001",
    "factory_name": "PT Batik Jakarta",
    "phone_number": "+6281234567890",
    "email": "contact@batikjakarta.com",
    "province": "DKI Jakarta",
    "city": "Jakarta Selatan",
    "district": "Kebayoran Baru",
    "postal_code": "12345",
    "address_line": "Jl. Sudirman No. 123",
    "description": "Premium batik manufacturer",
    "business_license_number": "BLN-123456",
    "tax_id": "01.234.567.8-901.000",
    "logo_url": "https://example.com/logo.png",
    "verification_status": "pending",
    "status": "pending",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

**What This Tests:**
- ✅ Uses correct field names (owner_id not owner_name)
- ✅ Uses correct field names (phone_number not phone)
- ✅ Uses correct field names (address_line not address)
- ✅ No longer tries to use non-existent fields
- ✅ No Prisma "Unknown field" errors
- ✅ Sets initial status correctly

**Save the factory ID from response for later tests!**

**Result:** [ ] PASS [ ] FAIL

**If Failed, Copy Error:**
```
Paste error here
```

---

### Test 3: Duplicate Factory Code - P2002 Error Handling
**Purpose:** Test unique constraint error handling

**Endpoint:** `POST /api/admin/factories`

**Request Body:** Use same factoryCode as Test 2
```json
{
  "ownerId": "YOUR_USER_UUID_HERE",
  "factoryCode": "FACT-JKT-001",
  "factoryName": "PT Batik Jakarta 2",
  "phoneNumber": "+6281234567891",
  "email": "contact2@batikjakarta.com",
  "province": "DKI Jakarta",
  "city": "Jakarta Pusat",
  "district": "Tanah Abang",
  "postalCode": "10250",
  "addressLine": "Jl. Tanah Abang No. 45"
}
```

**Expected Response:** `409 Conflict`
```json
{
  "error": "factory_code already exists",
  "field": "factory_code"
}
```

**What This Tests:**
- ✅ P2002 unique constraint error handling works
- ✅ Returns 409 status (not generic 400)
- ✅ User-friendly error message

**Result:** [ ] PASS [ ] FAIL

---

### Test 4: List Factories
**Purpose:** Verify factory was created and list endpoint works

**Endpoint:** `GET /api/factories`

**Query Parameters:** (optional)
- `page=1`
- `limit=10`

**Expected Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "factory_name": "PT Batik Jakarta",
      "factory_code": "FACT-JKT-001",
      "status": "pending",
      "verification_status": "pending",
      "users_factories_owner_idTousers": {
        "id": "uuid",
        "first_name": "Owner Name",
        "email": "owner@example.com"
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

**What This Tests:**
- ✅ No agent_offices relation error (removed!)
- ✅ Query succeeds without "Unknown relation" error
- ✅ Includes owner information correctly

**Result:** [ ] PASS [ ] FAIL

---

### Test 5: Get Factory by ID
**Purpose:** Verify single factory retrieval

**Endpoint:** `GET /api/factories/{id}`

**Parameters:**
- Use factory ID from Test 2

**Expected Response:** `200 OK`
```json
{
  "id": "uuid",
  "factory_name": "PT Batik Jakarta",
  "factory_code": "FACT-JKT-001",
  "owner_id": "uuid",
  "phone_number": "+6281234567890",
  "email": "contact@batikjakarta.com",
  "province": "DKI Jakarta",
  "city": "Jakarta Selatan",
  "district": "Kebayoran Baru",
  "postal_code": "12345",
  "address_line": "Jl. Sudirman No. 123",
  "status": "pending",
  "verification_status": "pending",
  "users_factories_owner_idTousers": {
    "id": "uuid",
    "first_name": "Owner Name"
  }
}
```

**What This Tests:**
- ✅ No agent_offices relation error
- ✅ Returns correct field names

**Result:** [ ] PASS [ ] FAIL

---

### Test 6: Get Factory by Code - Route Ordering Fix!
**Purpose:** Test previously unreachable endpoint

**Endpoint:** `GET /api/factories/code/{code}`

**Parameters:**
- code: `FACT-JKT-001`

**Expected Response:** `200 OK`
```json
{
  "id": "uuid",
  "factory_name": "PT Batik Jakarta",
  "factory_code": "FACT-JKT-001",
  "users_factories_owner_idTousers": {
    "id": "uuid",
    "first_name": "Owner Name"
  }
}
```

**What This Tests:**
- ✅ Route ordering fix works
- ✅ /code/:code is now reachable (was blocked by /:id before)
- ✅ No agent_offices error

**Result:** [ ] PASS [ ] FAIL

**Notes:** If this returns 404 "Factory not found" or treats "code" as a UUID, the route ordering is still broken!

---

### Test 7: Get Factories by Owner - Route Ordering Fix!
**Purpose:** Test another previously unreachable endpoint

**Endpoint:** `GET /api/factories/owner/{ownerId}`

**Parameters:**
- Use the ownerId from Test 2

**Expected Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "factory_name": "PT Batik Jakarta",
      "factory_code": "FACT-JKT-001",
      "users_factories_owner_idTousers": {
        "id": "uuid",
        "first_name": "Owner Name"
      }
    }
  ]
}
```

**What This Tests:**
- ✅ Route ordering fix works
- ✅ /owner/:ownerId is now reachable (was blocked by /:id before)
- ✅ No agent_offices error

**Result:** [ ] PASS [ ] FAIL

---

### Test 8: Admin Update Factory - Field Names Fix!
**Purpose:** Test the fixed updateFactory method

**Endpoint:** `PUT /api/admin/factories/{id}`

**Parameters:**
- Use factory ID from Test 2

**Request Body:**
```json
{
  "factoryName": "PT Batik Jakarta Premium",
  "description": "Premium batik manufacturer - Updated",
  "addressLine": "Jl. Sudirman No. 123 (Updated)",
  "city": "Jakarta Selatan",
  "district": "Kebayoran Baru",
  "province": "DKI Jakarta",
  "postalCode": "12345",
  "phoneNumber": "+6281234567899",
  "email": "updated@batikjakarta.com",
  "businessLicenseNumber": "BLN-123456-UPDATED",
  "taxId": "01.234.567.8-901.001"
}
```

**Expected Response:** `200 OK`
```json
{
  "message": "Factory updated successfully",
  "data": {
    "id": "uuid",
    "factory_name": "PT Batik Jakarta Premium",
    "description": "Premium batik manufacturer - Updated",
    "address_line": "Jl. Sudirman No. 123 (Updated)",
    "phone_number": "+6281234567899",
    "email": "updated@batikjakarta.com",
    "business_license_number": "BLN-123456-UPDATED",
    "tax_id": "01.234.567.8-901.001",
    "updated_at": "new-timestamp"
  }
}
```

**What This Tests:**
- ✅ Uses correct field names (address_line not address)
- ✅ Uses correct field names (phone_number not phone)
- ✅ No longer tries to update non-existent fields
- ✅ No Prisma errors

**Result:** [ ] PASS [ ] FAIL

---

### Test 9: Admin Verify Factory - verified_by Fix!
**Purpose:** Test that verified_by is now saved to database

**Endpoint:** `POST /api/admin/factories/{id}/verify`

**Parameters:**
- Use factory ID from Test 2

**Request Body:**
```json
{
  "verifiedBy": "YOUR_ADMIN_USER_UUID_HERE"
}
```

**Expected Response:** `200 OK`
```json
{
  "message": "Factory verified successfully",
  "data": {
    "id": "uuid",
    "factory_name": "PT Batik Jakarta Premium",
    "verification_status": "verified",
    "verified_at": "timestamp",
    "verified_by": "YOUR_ADMIN_USER_UUID_HERE",
    "updated_at": "timestamp"
  }
}
```

**What This Tests:**
- ✅ verified_by is saved to database (not just returned in response)
- ✅ No verification_notes field error (removed!)
- ✅ Sets verification_status to 'verified'

**Result:** [ ] PASS [ ] FAIL

---

### Test 10: Admin Suspend Factory - Status Field Fix!
**Purpose:** Test suspension uses correct field and enum

**Endpoint:** `POST /api/admin/factories/{id}/suspend`

**Parameters:**
- Use factory ID from Test 2

**Request Body:**
```json
{
  "reason": "Quality issues reported",
  "suspensionDuration": "30 days"
}
```

**Expected Response:** `200 OK`
```json
{
  "message": "Factory suspended successfully",
  "data": {
    "id": "uuid",
    "factory_name": "PT Batik Jakarta Premium",
    "status": "suspended",
    "updated_at": "timestamp"
  },
  "suspension": {
    "reason": "Quality issues reported",
    "duration": "30 days"
  }
}
```

**What This Tests:**
- ✅ Uses status field (not verification_status)
- ✅ 'suspended' is valid enum value for status
- ✅ No verification_notes field error
- ✅ No invalid enum error

**Result:** [ ] PASS [ ] FAIL

---

### Test 11: Admin Reactivate Factory - Status Field Fix!
**Purpose:** Test reactivation uses correct field

**Endpoint:** `POST /api/admin/factories/{id}/reactivate`

**Parameters:**
- Use factory ID from Test 2

**Request Body:**
```json
{
  "notes": "Quality issues resolved"
}
```

**Expected Response:** `200 OK`
```json
{
  "message": "Factory reactivated successfully",
  "data": {
    "id": "uuid",
    "factory_name": "PT Batik Jakarta Premium",
    "status": "active",
    "updated_at": "timestamp"
  }
}
```

**What This Tests:**
- ✅ Sets status to 'active' (not verification_status)
- ✅ No verification_notes field error
- ✅ Factory can be reactivated after suspension

**Result:** [ ] PASS [ ] FAIL

---

### Test 12: Admin Delete Factory
**Purpose:** Test factory deletion works

**Endpoint:** `DELETE /api/admin/factories/{id}`

**Parameters:**
- Use factory ID from Test 2

**Expected Response:** `200 OK`
```json
{
  "message": "Factory deleted successfully"
}
```

**What This Tests:**
- ✅ Hard delete works (note: might want soft delete in future)

**Result:** [ ] PASS [ ] FAIL

---

### Test 13: Verify Deletion
**Purpose:** Confirm factory is deleted

**Endpoint:** `GET /api/factories/{id}`

**Parameters:**
- Use factory ID from Test 2

**Expected Response:** `404 Not Found` or empty result

**What This Tests:**
- ✅ Factory is actually deleted

**Result:** [ ] PASS [ ] FAIL

---

## Test Summary

| Test # | Test Name | Result | Notes |
|--------|-----------|--------|-------|
| 1 | Health Check | [ ] | |
| 2 | Admin Register Factory | [ ] | |
| 3 | Duplicate Code Error | [ ] | |
| 4 | List Factories | [ ] | |
| 5 | Get Factory by ID | [ ] | |
| 6 | Get Factory by Code | [ ] | |
| 7 | Get Factories by Owner | [ ] | |
| 8 | Admin Update Factory | [ ] | |
| 9 | Admin Verify Factory | [ ] | |
| 10 | Admin Suspend Factory | [ ] | |
| 11 | Admin Reactivate Factory | [ ] | |
| 12 | Admin Delete Factory | [ ] | |
| 13 | Verify Deletion | [ ] | |

**Total Tests:** 13
**Passed:** ___
**Failed:** ___

---

## Critical Tests (Must Pass)

These tests verify the critical bug fixes:

- **Test 2** - registerFactory field names (was completely broken)
- **Test 3** - P2002 error handling (new feature)
- **Test 4** - agent_offices removed (was causing failures)
- **Test 6** - Route ordering fix (was unreachable)
- **Test 7** - Route ordering fix (was unreachable)
- **Test 8** - updateFactory field names (was broken)
- **Test 9** - verified_by persistence (was not saving)
- **Test 10** - Suspension status field (wrong field/enum)
- **Test 11** - Reactivation status field (wrong field)

**If any of these fail, report the error and I'll fix it immediately!**

---

## Common Issues to Watch For

### Issue 1: "Unknown field" errors
**Symptom:** Prisma errors like `Unknown field 'owner_name'`
**Means:** Field name mismatch not fully fixed
**Report:** Which field and which endpoint

### Issue 2: "Unknown relation" errors
**Symptom:** Prisma errors like `Unknown relation 'agent_offices'`
**Means:** Missed an agent_offices include somewhere
**Report:** Which endpoint

### Issue 3: Invalid enum value
**Symptom:** `Invalid value for field 'verification_status'`
**Means:** Still using wrong field for status operations
**Report:** Which endpoint

### Issue 4: 404 on /code or /owner routes
**Symptom:** Routes return "Factory not found" or treat parameter as UUID
**Means:** Route ordering still wrong
**Report:** Exact URL you're calling

---

## After Testing

Report results in this format:
```
Test 2: FAIL
Error: Unknown field 'owner_name' in factories.create()

Test 6: FAIL
GET /api/factories/code/FACT-JKT-001 returns 404

All other tests: PASS
```

I'll fix any failures and we can re-test before updating the documentation!

---

**Good luck with testing! 🧪**
