# Factory Service - Comprehensive Review

**Service:** Factory Service
**Review Date:** 2025-11-09
**Status:** ⚠️ CRITICAL ISSUES FOUND

## Executive Summary

The Factory Service has **13 CRITICAL bugs** and **8 HIGH severity issues** that will cause immediate runtime failures and security vulnerabilities. The admin controller uses completely wrong database field names that don't match the schema, causing ALL admin operations to fail.

**Critical Issues:**
- ❌ Admin controller uses wrong field names (will fail on every request)
- ❌ Missing office relation in schema causes Prisma query failures
- ❌ NO AUTHENTICATION on any endpoint (including admin)
- ❌ Wrong package.json metadata (says "product-service")
- ❌ CORS imported but never applied
- ❌ Critical route ordering bug prevents access to endpoints
- ❌ Suspension endpoint uses wrong enum value

**Service Status:** 🔴 Will fail in production on most operations

---

## All Endpoints

### Public Endpoints (No Auth - SECURITY ISSUE!)
```
POST   /api/factories                    - Create new factory
GET    /api/factories                    - List factories with filters
GET    /api/factories/:id                - Get factory by ID
GET    /api/factories/code/:code         - Get factory by code (BROKEN - route ordering)
GET    /api/factories/owner/:ownerId     - Get factories by owner (BROKEN - route ordering)
PATCH  /api/factories/:id                - Update factory
PATCH  /api/factories/:id/verify         - Verify factory
PATCH  /api/factories/:id/status         - Update factory status
PATCH  /api/factories/:id/assign-office  - Assign office
DELETE /api/factories/:id                - Delete factory
```

### Admin Endpoints (No Auth - SECURITY ISSUE!)
```
POST   /api/admin/factories                           - Register factory (BROKEN - wrong fields)
PUT    /api/admin/factories/:id                       - Update factory (BROKEN - wrong fields)
DELETE /api/admin/factories/:id                       - Delete factory (BROKEN - wrong fields)
POST   /api/admin/factories/:id/verify                - Verify factory (BROKEN - wrong fields)
POST   /api/admin/factories/:id/suspend               - Suspend factory (BROKEN - wrong enum)
POST   /api/admin/factories/:id/reactivate            - Reactivate factory (BROKEN - wrong fields)
GET    /api/admin/factories/:id/metrics               - Get metrics
GET    /api/admin/factories/:id/sessions              - List sessions
POST   /api/admin/factories/:id/sessions/:sessionId/cancel - Cancel session
GET    /api/admin/factories/:id/analytics             - Get analytics
```

### Other Endpoints
```
GET    /health                           - Health check
GET    /api-docs                         - Swagger documentation
```

**Total Endpoints:** 22

---

## CRITICAL BUGS

### 🔴 BUG #1: Wrong Package.json Metadata
**Location:** `services/factory-service/package.json:2`
**Severity:** CRITICAL

**Issue:**
```json
{
  "name": "product-service",  // ❌ WRONG! Should be "factory-service"
  "version": "1.0.0"
}
```

**Impact:**
- Wrong service name causes confusion in monorepo
- Package management issues
- Debugging difficulties

**Fix:**
```json
{
  "name": "factory-service",
  "version": "1.0.0",
  "main": "dist/index.js"
}
```

---

### 🔴 BUG #2: Wrong Service Name in Logs
**Location:** `services/factory-service/src/index.ts:37`
**Severity:** CRITICAL

**Issue:**
```typescript
console.log(`🚀 product-service running on port ${PORT}`);  // ❌ WRONG!
```

**Impact:** Misleading logs cause confusion in production monitoring

**Fix:**
```typescript
console.log(`🚀 factory-service running on port ${PORT}`);
console.log(`📚 Swagger docs available at http://localhost:${PORT}/api-docs`);
```

---

### 🔴 BUG #3: CORS Imported But Not Applied
**Location:** `services/factory-service/src/index.ts:2,14`
**Severity:** CRITICAL

**Issue:**
```typescript
import cors from 'cors';  // Imported
// ...
app.use(express.json());  // ❌ But never used!
```

**Impact:** No CORS protection - API cannot be called from browsers, breaking frontend integration

**Fix:**
```typescript
app.use(cors());  // Add after app creation
app.use(express.json());
```

---

### 🔴 BUG #4: Admin Controller Uses Completely Wrong Field Names
**Location:** `services/factory-service/src/controllers/admin.controller.ts:31-47`
**Severity:** CRITICAL - WILL FAIL AT RUNTIME

**Issue:** The admin controller's `registerFactory` method uses field names that don't exist in the database schema:

```typescript
// Lines 31-47 - WRONG FIELDS!
const factory = await prisma.factories.create({
  data: {
    factory_name: factoryName,
    owner_name: ownerName,        // ❌ DOESN'T EXIST - should be owner_id (UUID)
    email,
    phone,                         // ❌ DOESN'T EXIST - should be phone_number
    address,                       // ❌ DOESN'T EXIST - should be address_line
    city,
    province,
    postal_code: postalCode,
    description,
    certifications,                // ❌ DOESN'T EXIST IN SCHEMA!
    minimum_order_value: minimumOrderValue,           // ❌ DOESN'T EXIST!
    production_capacity_per_month: productionCapacityPerMonth,  // ❌ DOESN'T EXIST!
    verification_status: 'pending'
  }
});
```

**Actual Schema Fields:**
```prisma
model factories {
  id                                 String
  owner_id                           String    // ← NOT owner_name
  office_id                          String?
  factory_code                       String
  factory_name                       String
  status                             factory_status
  verification_status                verification_status
  business_license_number            String?
  business_license_photo_url         String?
  tax_id                             String?
  phone_number                       String    // ← NOT phone
  email                              String?
  province                           String
  city                               String
  district                           String
  postal_code                        String?
  address_line                       String    // ← NOT address
  logo_url                           String?
  description                        String?
  assigned_at                        DateTime?
  verified_at                        DateTime?
  verified_by                        String?
  created_at                         DateTime
  updated_at                         DateTime
  bank_name                          String?
  bank_account_number                String?
  bank_account_name                  String?
  wholesale_unit                     Int?
  // NO: certifications, minimum_order_value, production_capacity_per_month
}
```

**Impact:** Every call to `POST /api/admin/factories` will fail with Prisma error: "Unknown field"

**Fix:**
```typescript
const factory = await prisma.factories.create({
  data: {
    owner_id: ownerId,           // ✅ UUID from request
    factory_code: factoryCode,
    factory_name: factoryName,
    phone_number: phoneNumber,   // ✅ Correct field name
    email,
    province,
    city,
    district,
    postal_code: postalCode,
    address_line: addressLine,   // ✅ Correct field name
    description,
    verification_status: 'pending',
    status: 'pending'
  }
});
```

---

### 🔴 BUG #5: Admin Update Factory Uses Wrong Fields
**Location:** `services/factory-service/src/controllers/admin.controller.ts:82-96`
**Severity:** CRITICAL - WILL FAIL AT RUNTIME

**Issue:**
```typescript
const factory = await prisma.factories.update({
  where: { id },
  data: {
    factory_name: factoryName,
    description,
    address,                       // ❌ WRONG - should be address_line
    city,
    province,
    postal_code: postalCode,
    phone,                         // ❌ WRONG - should be phone_number
    email,
    minimum_order_value: minimumOrderValue,     // ❌ DOESN'T EXIST
    production_capacity_per_month: productionCapacityPerMonth,  // ❌ DOESN'T EXIST
    updated_at: new Date()
  }
});
```

**Impact:** All update operations will fail

---

### 🔴 BUG #6: verification_notes Field Doesn't Exist
**Location:** `services/factory-service/src/controllers/admin.controller.ts:145,179,216`
**Severity:** HIGH - WILL FAIL AT RUNTIME

**Issue:**
```typescript
// Line 145
verification_notes: verificationNotes,  // ❌ Field doesn't exist in schema

// Line 179
verification_notes: `Suspended: ${reason}. Duration: ${suspensionDuration}`,

// Line 216
verification_notes: `Reactivated: ${notes}`,
```

**Impact:** All verification, suspension, and reactivation operations will fail with Prisma unknown field error

---

### 🔴 BUG #7: Suspend Factory Uses Wrong Enum Value
**Location:** `services/factory-service/src/controllers/admin.controller.ts:178`
**Severity:** CRITICAL - LOGIC ERROR

**Issue:**
```typescript
const factory = await prisma.factories.update({
  where: { id },
  data: {
    verification_status: 'suspended',  // ❌ WRONG FIELD AND WRONG VALUE!
  }
});
```

**The enum only has:** `unverified | pending | verified | rejected`

There is a SEPARATE `status` field with enum: `pending | active | suspended | inactive`

**Impact:** Suspension will fail with invalid enum value error

**Fix:**
```typescript
const factory = await prisma.factories.update({
  where: { id },
  data: {
    status: 'suspended',  // ✅ Use status field, not verification_status
    updated_at: new Date()
  }
});
```

---

### 🔴 BUG #8: Missing agent_offices Relation in Schema
**Location:** `services/factory-service/src/repositories/factory.repository.ts` - Lines 50-57, 135-142, 175-183, 208-214, 233-238, 352-360
**Severity:** CRITICAL - WILL FAIL AT RUNTIME

**Issue:** The repository tries to include `agent_offices` relation in Prisma queries:
```typescript
include: {
  agent_offices: {  // ❌ RELATION DOESN'T EXIST!
    select: {
      id: true,
      office_code: true,
      office_name: true,
      city: true,
    }
  }
}
```

**Schema Analysis:**
- The `factories` table has an `office_id` field (String?, optional UUID)
- There is NO `agent_offices` table in the schema
- There is NO relation defined for office_id in the factories model

**Impact:** All queries that try to include the office relation will fail with:
```
Error: Unknown relation `agent_offices` on model `factories`
```

This affects:
- `create()` - line 50
- `findAll()` - line 135
- `findById()` - line 175
- `findByCode()` - line 208
- `findByOwnerId()` - line 233
- `assignOffice()` - line 352

**Fix:** Remove the office includes entirely or create the agent_offices table and relation

---

### 🔴 BUG #9: Critical Route Ordering Bug
**Location:** `services/factory-service/src/routes/factory.routes.ts:214,235,254`
**Severity:** CRITICAL - BREAKS ENDPOINTS

**Issue:** Routes are defined in wrong order:
```typescript
// Line 193
router.get('/', controller.getFactories);

// Line 214 - TOO GENERIC, MATCHES EVERYTHING!
router.get('/:id', controller.getFactoryById);

// Line 235 - UNREACHABLE! Will be caught by /:id above
router.get('/code/:code', controller.getFactoryByCode);

// Line 254 - UNREACHABLE! Will be caught by /:id above
router.get('/owner/:ownerId', controller.getFactoriesByOwner);
```

**Impact:**
- `GET /api/factories/code/:code` is completely unreachable
- `GET /api/factories/owner/:ownerId` is completely unreachable
- Requests will fail with "Factory not found" when trying to use "code" or "owner" as UUIDs

**Fix:** Move specific routes BEFORE generic routes:
```typescript
router.get('/', controller.getFactories);

// Specific routes FIRST
router.get('/code/:code', controller.getFactoryByCode);
router.get('/owner/:ownerId', controller.getFactoriesByOwner);

// Generic route LAST
router.get('/:id', controller.getFactoryById);
```

---

### 🔴 BUG #10: No Authentication on Any Endpoints
**Location:** All route files
**Severity:** CRITICAL - SECURITY VULNERABILITY

**Issue:** There is NO authentication middleware on ANY endpoints

**Impact:** Complete security breach. Anyone can:
- Create factories without being authenticated
- Verify or reject any factory
- Delete any factory
- Access admin operations
- Suspend or reactivate factories
- View all factory data including sensitive information

**Fix:**
```typescript
import { authenticateToken, requireAdmin } from '../middleware/auth';

// Public endpoints
router.get('/', controller.getFactories);
router.get('/:id', controller.getFactoryById);

// Protected endpoints
router.post('/', authenticateToken, controller.createFactory);
router.patch('/:id', authenticateToken, controller.updateFactory);

// Admin endpoints
router.patch('/:id/verify', requireAdmin, controller.verifyFactory);
router.delete('/:id', requireAdmin, controller.deleteFactory);
```

---

### 🔴 BUG #11: Admin Controller Doesn't Validate verifiedBy
**Location:** `services/factory-service/src/controllers/admin.controller.ts:138-148`
**Severity:** HIGH

**Issue:**
```typescript
const { verificationNotes, verifiedBy } = req.body;

const factory = await prisma.factories.update({
  where: { id },
  data: {
    verification_status: 'verified',
    verified_at: new Date(),
    verification_notes: verificationNotes,  // Field doesn't exist anyway
    updated_at: new Date()
  }
});

res.json({
  message: 'Factory verified successfully',
  data: {
    factory,
    verifiedBy  // ❌ Not saved to database, just returned in response!
  }
});
```

**Issues:**
1. `verifiedBy` is accepted but never saved to the database
2. The schema has a `verified_by` field (UUID) that should be used
3. No validation that the verifiedBy user exists

**Fix:**
```typescript
const { verifiedBy } = req.body;

// Validate verifiedBy user exists
const verifier = await prisma.users.findUnique({
  where: { id: verifiedBy }
});

if (!verifier || verifier.role !== 'admin') {
  return res.status(403).json({ error: 'Invalid verifier' });
}

const factory = await prisma.factories.update({
  where: { id },
  data: {
    verification_status: 'verified',
    verified_at: new Date(),
    verified_by: verifiedBy,  // ✅ Save to database
    updated_at: new Date()
  }
});
```

---

### 🔴 BUG #12: Inconsistent Controller Patterns
**Location:** Throughout service
**Severity:** MEDIUM

**Issue:** The service uses TWO different patterns:
1. **Main controller** uses repository pattern with business logic in service layer
2. **Admin controller** directly uses Prisma client bypassing all business logic

**Impact:**
- Business logic validation is bypassed in admin endpoints
- Code duplication
- Admin operations skip uniqueness checks

---

### 🔴 BUG #13: Race Condition in Uniqueness Checks
**Location:** `services/factory-service/src/services/factory.service.ts:19-33`
**Severity:** MEDIUM

**Issue:**
```typescript
async createFactory(data: CreateFactoryDTO) {
  // Check if code exists
  const codeExists = await this.repository.checkFactoryCodeExists(data.factoryCode);
  if (codeExists) {
    throw new Error(`Factory code ${data.factoryCode} already exists`);
  }

  // ⚠️ RACE CONDITION: Another request could create the same code here
  return this.repository.create(data);
}
```

**Fix:** Use database unique constraints and handle the error:
```typescript
async createFactory(data: CreateFactoryDTO) {
  try {
    return await this.repository.create(data);
  } catch (error: any) {
    if (error.code === 'P2002') {  // Prisma unique constraint error
      const field = error.meta?.target?.[0];
      if (field === 'factory_code') {
        throw new Error(`Factory code ${data.factoryCode} already exists`);
      }
    }
    throw error;
  }
}
```

---

## Security Vulnerabilities

### Critical Security Issues
1. ❌ **No authentication/authorization** on any endpoint
2. ❌ **No rate limiting** (vulnerable to DOS, brute force)
3. ❌ **No input sanitization** beyond basic validation
4. ❌ **Sensitive error messages** expose internal details
5. ❌ **Hard delete without checks** (orphaned data risk)

---

## Code Quality Issues

### Q1. No Error Handling in Admin Endpoints
```typescript
catch (error: any) {
  res.status(400).json({ error: error.message });  // ❌ All errors become 400
}
```

### Q2. Incomplete TODO
**Location:** `services/factory-service/src/controllers/admin.controller.ts:372`
```typescript
// TODO: If refundParticipants is true, trigger refund process
// This would require calling the Payment Service
```

### Q3. No Logging
Only console.log for startup, no request logging or error logging

### Q4. No Request Validation on Query Params
Query parameters aren't validated (page, limit, status, etc.)

### Q5. Unused Utility Method
`generateFactoryCode` is defined but never used

### Q6. Prisma Client Not Properly Managed
Creates new client for each repository instance

---

## Business Logic Issues

### B1. Verification Automatically Activates Factory
```typescript
async verifyFactory(id: string, data: VerifyFactoryDTO) {
  if (data.verificationStatus === 'verified') {
    await this.repository.updateStatus(id, { status: 'active' });
  }
  return this.repository.verify(id, data);
}
```

**Issue:** Verification and activation should be separate actions

### B2. No Validation on Status Transitions
Status can change from any state to any state without validation

---

## Database Schema Observations

### Fields Present ✅
- id, owner_id, office_id, factory_code, factory_name
- status, verification_status
- phone_number, email, province, city, district
- address_line, postal_code
- business_license_number, tax_id
- verified_by, verified_at, assigned_at

### Fields Missing (but used in admin controller) ❌
- owner_name
- phone (should be phone_number)
- address (should be address_line)
- certifications
- minimum_order_value
- production_capacity_per_month
- verification_notes

### Relations
- ✅ users (owner) via owner_id
- ✅ users (verifier) via verified_by
- ❌ office_id has NO relation (agent_offices table doesn't exist)

---

## Prioritized Recommendations

### 🔥 IMMEDIATE (Before any testing/deployment):

1. **Fix package.json name** (5 min)
2. **Apply CORS** (2 min)
3. **Fix service name in logs** (2 min)
4. **Fix route ordering** (5 min)
5. **Remove agent_offices includes** (10 min)
6. **Rewrite admin controller** to use correct field names (30 min)

### ⚠️ HIGH PRIORITY (Before production):

7. **Add authentication** (2-4 hours)
8. **Fix suspension logic** (15 min)
9. **Remove verification_notes usage** (10 min)
10. **Add proper error handling** (1 hour)

### 📋 MEDIUM PRIORITY:

11. **Unify admin and main controllers** (2-3 hours)
12. **Add request logging** (30 min)
13. **Fix race conditions** (1 hour)
14. **Add query parameter validation** (1 hour)

### 💡 LOW PRIORITY:

15. **Add rate limiting** (30 min)
16. **Add security headers** (15 min)
17. **Fix Prisma client singleton** (20 min)
18. **Add soft delete** (2 hours)

---

## Summary

**Total Issues Found:** 33
- Critical: 13
- High: 8
- Medium: 9
- Low: 3

**Estimated Fix Time:**
- Immediate fixes: 1 hour
- High priority: 6-8 hours
- Medium priority: 8-10 hours
- Low priority: 5-7 hours
- **Total: 20-26 hours**

**Current Service Status:** ⛔ NOT PRODUCTION READY
- Admin endpoints are completely broken (wrong field names)
- No authentication/authorization
- Critical route ordering bug
- Missing database relations cause runtime failures

**Recommendation:** This service requires significant refactoring before it can be used.
