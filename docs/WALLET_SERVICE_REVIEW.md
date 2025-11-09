# Wallet Service - Comprehensive Review

**Service:** Wallet Service
**Review Date:** 2025-11-09
**Status:** ⚠️ CRITICAL BUGS FOUND

## Executive Summary

The Wallet Service has **4 CRITICAL bugs**, **2 HIGH severity issues**, and **3 MEDIUM issues**. Database schema field mismatches will cause runtime failures, and no authentication leaves financial data exposed.

**Critical Issues:**
- 🔴 Wrong package.json metadata (says "payment-service")
- 🔴 Database field name mismatches (transaction_type, admin_note)
- 🔴 Missing balance audit fields (balance_before, balance_after)
- 🔴 NO AUTHENTICATION on any endpoint
- 🔴 Incomplete withdrawal processing (no actual money transfer)
- 🔴 API path mismatch with documentation

**Service Status:** 🔴 NOT PRODUCTION READY

---

## Critical Bugs

### 🔴 BUG #1: Wrong Package Metadata
**File:** `package.json:2-4`
```json
{
  "name": "payment-service",  // ❌ WRONG!
  "description": "Payment processing and settlement service",
  "scripts": {
    "cron:settlements": "tsx src/jobs/weekly-settlement.ts",  // ❌ Doesn't exist
    "cron:expire": "tsx src/jobs/expire-payments.ts"         // ❌ Doesn't exist
  }
}
```

**Fix:**
```json
{
  "name": "wallet-service",
  "description": "User wallet and withdrawal management service"
}
```

### 🔴 BUG #2: Database Field Mismatch - transaction_type
**File:** `src/controllers/admin.controller.ts:171`
```typescript
const transaction = await tx.wallet_transactions.create({
    data: {
        transaction_type: type === 'credit' ? 'credit' : 'debit',  // ❌ WRONG FIELD
        // ...
    }
});
```

**Schema:**
```prisma
model wallet_transactions {
  type String @db.VarChar(50)  // ✅ Field is "type" not "transaction_type"
}
```

**Impact:** Prisma error "Unknown field 'transaction_type'" - admin adjustments completely broken

**Fix:**
```typescript
type: type === 'credit' ? 'credit' : 'debit',  // ✅ Correct
```

### 🔴 BUG #3: Database Field Mismatch - admin_note
**File:** `src/controllers/admin.controller.ts:362,381`
```typescript
// Line 362
admin_note: adminNote  // ❌ WRONG - Field is "admin_notes" (plural)

// Line 381
admin_note: rejectionReason || adminNote  // ❌ WRONG
```

**Schema:**
```prisma
model wallet_withdrawals {
  admin_notes String?  // ✅ Plural "admin_notes"
}
```

**Impact:** Withdrawal approval/rejection completely broken

**Fix:**
```typescript
admin_notes: adminNote  // ✅ Plural
```

### 🔴 BUG #4: Missing Balance Audit Fields
**File:** `src/controllers/admin.controller.ts:168-179`
```typescript
const transaction = await tx.wallet_transactions.create({
    data: {
        // ... other fields
        // ❌ MISSING: balance_before (required)
        // ❌ MISSING: balance_after (required)
    }
});
```

**Schema:**
```prisma
model wallet_transactions {
  balance_before Decimal @db.Decimal(15, 2)  // ❌ Required!
  balance_after  Decimal @db.Decimal(15, 2)  // ❌ Required!
}
```

**Impact:** Cannot audit wallet changes, impossible to detect fraud

**Fix:**
```typescript
const wallet = await tx.user_wallets.findUnique({ where: { user_id: userId } });
const balanceBefore = Number(wallet.balance);

// Update wallet...

const balanceAfter = Number(updatedWallet.balance);

const transaction = await tx.wallet_transactions.create({
    data: {
        balance_before: balanceBefore,  // ✅ Add audit trail
        balance_after: balanceAfter,
        // ...
    }
});
```

---

## High Severity Issues

### 🔴 BUG #5: No Authentication
**All routes completely unprotected**

**Vulnerabilities:**
- Anyone can view any user's wallet balance
- Anyone can credit any wallet (free money exploit!)
- Anyone can request withdrawals
- Anyone can access admin functions
- Anyone can adjust balances

**Fix:**
```typescript
import { authenticateUser, requireAdmin } from '../middleware/auth';

router.get('/balance/:userId', authenticateUser, requireOwnerOrAdmin, controller.getBalance);
router.post('/transactions/credit', authenticateUser, controller.creditTransaction);
router.use('/admin', authenticateUser, requireAdmin);
```

### 🔴 BUG #6: API Path Mismatch
**File:** `src/routes/wallet.routes.ts:9`

**Documentation expects:** `GET /api/wallet/:userId`
**Actual endpoint:** `GET /api/balance/:userId`

**Impact:** Integration failures with other services (group buying expects /wallet/:userId)

**Fix:**
```typescript
router.get('/wallet/:userId', [param('userId').isUUID()], controller.getBalance);
```

---

## Medium Severity Issues

### BUG #7: Incomplete Withdrawal Processing
**File:** `src/controllers/admin.controller.ts:366`
```typescript
if (action === 'approve') {
    await prisma.wallet_withdrawals.update({
        data: { status: 'processing' }
    });

    // ❌ TODO: Integrate with payment gateway to actually send money
    // Money never sent!
}
```

**Impact:** Users approved for withdrawals never receive money

**Fix:** Integrate Xendit disbursement API

### BUG #8: Missing Withdrawal Status Validation
**File:** `src/controllers/admin.controller.ts:348-353`
```typescript
if (withdrawal.status !== 'pending') {
    return res.status(400).json({ error: `Already ${withdrawal.status}` });
}
```

**Issue:** No state machine for valid transitions

**Fix:**
```typescript
const VALID_TRANSITIONS = {
    'pending': ['processing', 'rejected'],
    'processing': ['completed', 'failed'],
    'failed': ['processing', 'rejected']
};
```

### BUG #9: Query Parameter Type Issues
Query params (userId, page, limit) not properly validated

---

## Complete Endpoint List

### Public Endpoints (NO AUTH - SECURITY ISSUE!)
```
GET    /api/balance/:userId           - Get wallet balance
POST   /api/transactions/credit       - Credit wallet
POST   /api/withdrawals/request       - Request withdrawal
```

### Admin Endpoints (NO AUTH - SECURITY ISSUE!)
```
GET    /api/admin/wallets             - List all wallets
GET    /api/admin/wallets/user/:userId - Get wallet details
POST   /api/admin/wallets/adjust      - Manual credit/debit
GET    /api/admin/transactions        - List transactions
GET    /api/admin/withdrawals         - List withdrawals
POST   /api/admin/withdrawals/:id/process - Approve/reject
GET    /api/admin/wallets/analytics   - Get analytics
```

---

## Business Logic Review

### ✅ CORRECT: Wallet Balance Calculation
```typescript
const updateResult = await tx.user_wallets.updateMany({
    where: {
        user_id: data.userId,
        balance: { gte: data.amount }  // ✅ Atomic check
    },
    data: {
        balance: { decrement: data.amount }
    }
});
```

**Analysis:** Prevents double-spending and race conditions ✅

### ⚠️ ISSUE: Refund Logic
```typescript
await tx.user_wallets.update({
    where: { user_id: withdrawal.user_id },
    data: {
        balance: { increment: withdrawal.amount }
        // ❌ Missing: total_withdrawn decrement
    }
});
```

**Impact:** Wallet totals become inconsistent

---

## Database Schema Observations

### Strengths ✅
- Proper UUIDs
- Decimal(15,2) for currency (no floating point errors)
- Good indexing
- Cascade deletes
- Audit fields (balance_before, balance_after)

### Issues ❌
- No index on wallet_transactions.user_id alone
- No check constraint for non-negative balance
- transaction.type is VARCHAR(50) but should be ENUM
- withdrawals.status is VARCHAR(20) but should be ENUM

---

## Security Vulnerabilities

| Issue | Severity | Risk |
|-------|----------|------|
| No authentication | CRITICAL | Anyone can access all functionality |
| No admin authorization | CRITICAL | Anyone can use admin endpoints |
| Read any user's wallet | CRITICAL | Privacy breach |
| Free money exploit | CRITICAL | Credit wallet without auth |
| No rate limiting | HIGH | DDoS vulnerability |

---

## Prioritized Fixes

### P0 - MUST FIX (Blocking)
1. **Fix package.json metadata** (5 min)
2. **Fix field name: transaction_type → type** (2 min)
3. **Fix field name: admin_note → admin_notes** (2 min)
4. **Add balance_before/balance_after fields** (15 min)
5. **Implement authentication** (2-4 hours)
6. **Fix API path to match docs** (5 min)

**Total:** ~4-6 hours

### P1 - HIGH Priority
7. **Implement Xendit withdrawal integration** (1-2 days)
8. **Add refund total_withdrawn fix** (10 min)
9. **Add withdrawal state machine** (1 hour)

### P2 - MEDIUM Priority
10. **Add notification service integration** (3-4 hours)
11. **Improve validation** (1-2 hours)
12. **Add rate limiting** (1 hour)

---

## Required Environment Variables

```env
# Server
PORT=3010
NODE_ENV=development

# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-secret-key

# Payment Gateway
XENDIT_API_KEY=xnd_development_...
XENDIT_WEBHOOK_TOKEN=...

# Service URLs
NOTIFICATION_SERVICE_URL=http://localhost:3007

# Withdrawal Settings
WITHDRAWAL_FEE=2500
MIN_WITHDRAWAL_AMOUNT=10000
MAX_WITHDRAWAL_AMOUNT=10000000
```

---

## Summary

**Issues:** 9 total
- Critical: 4
- High: 2
- Medium: 3

**Fix Time:** 4-6 hours for P0, 2-3 days for full production readiness

**Status:** 🔴 **NOT PRODUCTION READY**

**Blockers:**
1. Schema field mismatches (runtime failures)
2. No authentication (security breach)
3. Incomplete withdrawal processing (core feature broken)

**Recommendation:** Fix all schema bugs and implement authentication before any testing.
