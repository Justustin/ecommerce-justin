# Address Service - Comprehensive Review

**Service:** Address Service
**Review Date:** 2025-11-09
**Status:** ⚠️ MINOR ISSUES - MOSTLY FUNCTIONAL

## Executive Summary

The Address Service is relatively simple and has **fewer critical issues** than other services. Main problems are lack of authentication and missing validation.

**Issues:**
- 🔴 NO AUTHENTICATION on any endpoint
- ⚠️ No input sanitization
- ⚠️ No rate limiting
- ⚠️ Missing validation on admin operations

**Service Status:** 🟡 NEEDS AUTHENTICATION AND VALIDATION

---

## Complete Endpoint List

### Public Endpoints (NO AUTH)
```
GET    /api/addresses/user/:userId     - Get user's addresses
POST   /api/addresses                  - Create address
PUT    /api/addresses/:id              - Update address
DELETE /api/addresses/:id              - Delete address
```

### Admin Endpoints (NO AUTH - SECURITY ISSUE!)
```
GET    /api/admin/addresses            - Get all addresses (filtered)
GET    /api/admin/addresses/analytics  - Get geographic analytics
DELETE /api/admin/addresses/:id        - Delete any address
PUT    /api/admin/addresses/:id        - Update any address
```

**Total Endpoints:** 8

---

## Critical Issues

### 🔴 BUG #1: No Authentication
**All routes completely unprotected**

**Vulnerabilities:**
- Anyone can view any user's addresses (privacy breach)
- Anyone can create/modify/delete addresses
- Anyone can access admin functions

**Fix:**
```typescript
import { authenticateUser, requireAdmin } from '../middleware/auth';

// Public routes - require user owns the address
router.post('/', authenticateUser, controller.createAddress);
router.put('/:id', authenticateUser, requireOwnership, controller.updateAddress);
router.delete('/:id', authenticateUser, requireOwnership, controller.deleteAddress);

// Admin routes
router.use('/admin', authenticateUser, requireAdmin);
```

---

## High Severity Issues

### BUG #2: No Input Validation
**File:** All controllers

No validation for:
- Phone number format
- Postal code format
- Province/city values (should match standard Indonesian names)
- Address length limits

**Fix:**
```typescript
body('phone').matches(/^(\+62|62|0)[0-9]{9,12}$/),
body('postalCode').matches(/^[0-9]{5}$/),
body('province').isIn(VALID_PROVINCES),
body('city').isString().isLength({ max: 100 })
```

---

## Medium Severity Issues

### BUG #3: Missing Ownership Validation
**File:** `src/controllers/address.controller.ts`
```typescript
updateAddress = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // ❌ No check if user owns this address
  const address = await prisma.user_addresses.update({
    where: { id },
    data: updateData
  });
};
```

**Impact:** User can modify other users' addresses

**Fix:**
```typescript
const address = await prisma.user_addresses.findUnique({
  where: { id }
});

if (!address) {
  return res.status(404).json({ error: 'Address not found' });
}

if (address.user_id !== req.user.id && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Not authorized' });
}

const updated = await prisma.user_addresses.update({...});
```

### BUG #4: Admin Update Accepts Any Data
**File:** `src/controllers/admin.controller.ts:146`
```typescript
updateAddress = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;  // ❌ No validation

  const updated = await prisma.user_addresses.update({
    where: { id },
    data: updateData  // ❌ Could include invalid fields
  });
};
```

**Fix:** Add validation and whitelist allowed fields

---

## Security Concerns

| Issue | Severity | Risk |
|-------|----------|------|
| No authentication | CRITICAL | Anyone can access all functionality |
| No ownership validation | HIGH | Users can modify others' addresses |
| No input validation | MEDIUM | Invalid data accepted |
| No rate limiting | MEDIUM | DDoS vulnerability |
| Admin accepts any data | MEDIUM | Data integrity risk |

---

## Code Quality Observations

### ✅ Strengths
- Simple, straightforward CRUD operations
- Good use of Prisma ORM
- Analytics endpoint provides useful geographic data
- Clean code structure

### ❌ Weaknesses
- Generic error handling
- No logging
- Missing JSDoc comments
- No tests

---

## Database Schema Observations

**Table:** `user_addresses`
```prisma
model user_addresses {
  id          String   @id @default(uuid())
  user_id     String   @db.Uuid
  label       String?  @db.VarChar(50)
  recipient_name String @db.VarChar(255)
  phone       String   @db.VarChar(20)
  province    String   @db.VarChar(100)
  city        String   @db.VarChar(100)
  district    String?  @db.VarChar(100)
  postal_code String?  @db.VarChar(10)
  address_line String
  is_default  Boolean? @default(false)
  created_at  DateTime @default(now())
  updated_at  DateTime @default(now())
  users       users    @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
}
```

**Observations:**
- ✅ Good indexing on user_id
- ✅ Cascade delete on user deletion
- ✅ Optional fields properly marked
- ⚠️ No validation constraints on phone/postal_code
- ⚠️ No unique constraint on (user_id, label) for default address

---

## Prioritized Fixes

### P0 - MUST FIX
1. **Implement authentication** (2 hours)
2. **Add ownership validation** (30 min)

### P1 - HIGH Priority
3. **Add input validation** (1-2 hours)
4. **Add phone/postal code format validation** (30 min)

### P2 - MEDIUM Priority
5. **Add rate limiting** (30 min)
6. **Whitelist admin update fields** (30 min)
7. **Add request logging** (30 min)

---

## Summary

**Issues:** 4 total
- Critical: 1 (no auth)
- High: 1 (no ownership validation)
- Medium: 2

**Fix Time:** ~4-5 hours for all issues

**Status:** 🟡 **NEEDS AUTHENTICATION**

**Assessment:** Compared to other services, Address Service is relatively well-implemented. Main concern is security (authentication and authorization). Once auth is added, this service would be production-ready.

**Recommendation:** Add authentication and ownership validation before deployment. This is a lower priority than fixing other services with more critical bugs.
