# Warehouse Service - Comprehensive Review & Documentation

**Service:** Warehouse Service
**Port:** 3011
**Status:** ❌ CRITICAL BUGS - DO NOT DEPLOY
**Last Reviewed:** 2025-11-09

---

## Executive Summary

The Warehouse Service manages inventory, purchase orders, and implements the bundle-based grosir allocation system. The service has **5 critical bugs** including invalid Prisma API calls, wrong database field names, and incorrect package.json. The bundle-based fulfillment logic is well-implemented but the service has major security and data integrity issues.

**Critical Issues:**
- ❌ Invalid Prisma API call will cause runtime error
- ❌ Wrong database field name (`received_date` vs `received_at`)
- ❌ Wrong package.json (copied from payment-service)
- ❌ Status enum mismatch
- ❌ Wrong Swagger configuration
- ❌ No authentication on admin endpoints

---

## Endpoints Overview

### Total Endpoints: 13
- **User Endpoints:** 2 (1 deprecated)
- **Admin Endpoints:** 11 (3 not implemented)

---

## Detailed Endpoint Documentation

### User Endpoints

#### 1. POST /api/fulfill-demand (DEPRECATED)
**Status:** ⚠️ DEPRECATED - Use fulfill-bundle-demand instead
**Purpose:** Old single-variant fulfillment
**Body:**
```typescript
{
  productId: string;
  variantId?: string;
  quantity: number;
  wholesaleUnit: number;  // DEPRECATED
}
```

#### 2. POST /api/fulfill-bundle-demand
**Status:** ✅ NEW - Bundle-based fulfillment
**Purpose:** Process demand for multiple variants as bundle
**Body:**
```typescript
{
  productId: string;
  sessionId: string;
  variantDemands: Array<{
    variantId: string | null;
    quantity: number;
  }>;
}
```

**Algorithm:**
1. Fetch bundle configuration for product
2. Fetch warehouse tolerance for each variant
3. Check current inventory
4. Calculate bundles needed per variant
5. Find maximum bundles needed
6. Check if warehouse can handle excess
7. Create PO for complete bundles OR reserve existing stock
8. Send WhatsApp notification to factory
9. Return inventory projections

**Response:**
```typescript
{
  hasStock: boolean;
  bundlesOrdered?: number;
  totalUnitsOrdered?: number;
  constrainingVariant?: string | null;
  message?: string;
  inventoryAdditions?: Array<{
    variantId: string | null;
    quantity: number;
  }>;
}
```

---

### Admin Endpoints

#### Inventory Management

##### 1. GET /api/admin/warehouse/inventory
**Purpose:** View all inventory with filtering
**Query Parameters:**
- `productId` - Filter by product
- `lowStock` - Filter by low stock (⚠️ BUG: Invalid Prisma API)
- `page`, `limit` - Pagination

**🐛 BUG:** Line 27 uses invalid `prisma.warehouse_inventory.fields`

##### 2. GET /api/admin/warehouse/inventory/:productId
**Purpose:** View product-specific inventory with variants

##### 3. POST /api/admin/warehouse/inventory/adjust
**Purpose:** Manual stock adjustment
**Body:**
```typescript
{
  productId: string;
  variantId?: string;
  quantity: number;
  adjustmentType: 'add' | 'remove' | 'set';
  reason: string;
  notes?: string;
}
```

**Validation:** ✅ Good
**Issues:**
- ❌ No check that 'remove' doesn't create negative quantity
- ❌ TODO: Audit log not implemented

##### 4. POST /api/admin/warehouse/inventory/:productId/reserve
**Purpose:** Manual stock reservation
**Body:**
```typescript
{
  variantId?: string;
  quantity: number;
  reservedFor: string;  // Order ID or session ID
  notes?: string;
}
```

##### 5. POST /api/admin/warehouse/inventory/:productId/release
**Purpose:** Release reservation
**Body:**
```typescript
{
  variantId?: string;
  quantity: number;
  reservedFor: string;
  notes?: string;
}
```

---

#### Purchase Order Management

##### 6. GET /api/admin/warehouse/purchase-orders
**Purpose:** List all POs
**Query Parameters:**
- `factoryId` - Filter by factory
- `status` - Filter by status
- `productId` - Filter by product
- `startDate`, `endDate` - Date range
- `page`, `limit` - Pagination

##### 7. GET /api/admin/warehouse/purchase-orders/:id
**Purpose:** View PO details with factory and product info

##### 8. PUT /api/admin/warehouse/purchase-orders/:id
**Purpose:** Update PO status
**Body:**
```typescript
{
  status: 'pending' | 'confirmed' | 'in_production' | 'shipped' | 'received' | 'cancelled';
  notes?: string;
}
```

**Issues:**
- ❌ No validation of status transitions
- ❌ Can skip from 'pending' to 'received'

##### 9. POST /api/admin/warehouse/purchase-orders/:id/receive
**Purpose:** Mark PO as received and add inventory
**Body:**
```typescript
{
  receivedDate: string;
  receivedBy: string;
  receivedItems: Array<{
    variantId: string | null;
    quantityReceived: number;
    quantityDamaged?: number;
  }>;
  notes?: string;
}
```

**🐛 BUG:** Line 452 uses `received_date` instead of `received_at`

**Issues:**
- ❌ No validation that quantityReceived <= PO.quantity
- ❌ No validation that quantityDamaged <= quantityReceived
- ❌ receivedBy parameter not stored in database

##### 10. POST /api/admin/warehouse/purchase-orders/:id/cancel
**Purpose:** Cancel PO
**Body:**
```typescript
{
  reason: string;
}
```

---

#### Stock Auditing (NOT IMPLEMENTED)

##### 11. GET /api/admin/warehouse/audit-log
**Status:** ❌ NOT IMPLEMENTED - Returns 501
**Note:** Requires warehouse_audit_log table (doesn't exist in schema)

##### 12. POST /api/admin/warehouse/cycle-count
**Status:** ❌ NOT IMPLEMENTED - Returns 501

##### 13. GET /api/admin/warehouse/discrepancies
**Status:** ❌ NOT IMPLEMENTED - Returns 501

---

## Critical Bugs (Must Fix)

### 🔴 BUG #1: Invalid Prisma API Call - CRITICAL
**File:** `src/controllers/admin.controller.ts`
**Line:** 27

```typescript
if (lowStock === 'true') {
    where.available_quantity = {
        lte: prisma.warehouse_inventory.fields.reserved_quantity  // ❌ INVALID!
    };
}
```

**Problem:** `prisma.warehouse_inventory.fields` doesn't exist in Prisma Client API

**Impact:** Runtime error when using lowStock filter

**Fix:**
```typescript
if (lowStock === 'true') {
    // Option 1: Compare with fixed threshold
    where.available_quantity = {
        lte: 10  // Or from config
    };

    // Option 2: Compare with reserved_quantity (raw SQL needed)
    // This requires a different approach as Prisma doesn't support field-to-field comparison
}
```

---

### 🔴 BUG #2: Wrong Database Field Name - CRITICAL
**File:** `src/controllers/admin.controller.ts`
**Line:** 452

```typescript
const order = await prisma.warehouse_purchase_orders.update({
    where: { id },
    data: {
        status: 'received',
        received_date: new Date(receivedDate),  // ❌ WRONG FIELD NAME
        updated_at: new Date()
    }
});
```

**Schema Definition:**
```prisma
model warehouse_purchase_orders {
  received_at DateTime?  // ✅ Correct name
  // NO received_date field!
}
```

**Impact:** Prisma validation error, PO cannot be marked as received

**Fix:**
```typescript
received_at: new Date(receivedDate),  // ✅ Correct
```

---

### 🔴 BUG #3: Status Enum Mismatch - HIGH
**File:** `src/repositories/warehouse.repository.ts`
**Line:** 37

```typescript
data: {
    status: 'pending_approval'  // ❌ Not in allowed enum
}
```

**Validation in admin.routes.ts (line 313):**
```typescript
body('status').isIn(['pending', 'confirmed', 'in_production', 'shipped', 'received', 'cancelled'])
```

**Problem:** New POs created with 'pending_approval' status cannot be updated via admin endpoint

**Impact:** Created POs stuck in invalid state

**Fix:**
```typescript
status: 'pending'  // ✅ Use valid enum value
```

---

### 🔴 BUG #4: Wrong package.json - CRITICAL
**File:** `package.json`
**Entire File**

```json
{
  "name": "payment-service",  // ❌ Should be "warehouse-service"
  "description": "Payment processing and settlement service",  // ❌ Wrong
  "scripts": {
    "cron:settlements": "tsx src/jobs/weekly-settlement.ts",  // ❌ File doesn't exist
    "cron:expire": "tsx src/jobs/expire-payments.ts"  // ❌ File doesn't exist
  },
  "dependencies": {
    "xendit-node": "^4.0.0",  // ❌ Not needed in warehouse service
    "node-cron": "^3.0.3"     // ❌ Not used
  }
}
```

**Impact:**
- npm scripts reference non-existent files
- Unnecessary dependencies
- Wrong package identification

**Fix:** Create proper warehouse-service package.json

---

### 🔴 BUG #5: Wrong Swagger Configuration - MEDIUM
**File:** `src/config/swagger.ts`
**Lines:** 7-22

```typescript
info: {
    title: 'Factory Service API',  // ❌ Should be 'Warehouse Service API'
    description: 'Factory management service...',  // ❌ Wrong
},
servers: [{
    url: 'http://localhost:3003',  // ❌ Should be 3011
}],
tags: [{
    name: 'Factories',  // ❌ Should be 'Warehouse'
    description: 'Factory management endpoints',  // ❌ Wrong
}]
```

**Additional Issue:** Swagger spec never imported in index.ts - dead code

---

## High Priority Issues

### ⚠️ Issue #1: Variant ID Null Handling
**Multiple Locations** throughout the codebase

**Problem:** Converts `null` to string `"null"`:
```typescript
const key = variant_id || 'null';  // ❌ Corrupts data
```

**Impact:**
- Unique constraint `@@unique([product_id, variant_id])` fails
- Queries for `variant_id = null` don't find records with `variant_id = 'null'`
- Cannot differentiate null variant from variant named "null"

**Locations:**
- warehouse.repository.ts:10
- admin.controller.ts: Lines 120, 140, 149, 192, 213, 256, 277, 469, 480
- warehouse.service.ts: 12+ occurrences

**Fix:**
```typescript
where: {
    product_id: productId,
    variant_id: variantId || null  // ✅ Use proper null
}
```

---

### ⚠️ Issue #2: No Transaction Support
**File:** `src/services/warehouse.service.ts`
**Lines:** 282-288

```typescript
// Multiple inventory updates without transaction
await prisma.warehouse_inventory.update({...});
await prisma.warehouse_inventory.update({...});
```

**Problem:** Race conditions possible
- Two concurrent requests could both read same inventory
- Both decrement independently
- Result in incorrect final inventory

**Fix:**
```typescript
await prisma.$transaction(async (tx) => {
    // All updates within transaction
});
```

---

### ⚠️ Issue #3: N+1 Query Problem
**File:** `src/services/warehouse.service.ts`
**Lines:** 222-225

```typescript
const inventoryPromises = variantDemands.map(vd =>
    this.repository.findInventory(productId, vd.variantId)
);
const inventories = await Promise.all(inventoryPromises);
```

**Problem:** For N variants, runs N separate queries

**Fix:**
```typescript
const inventories = await prisma.warehouse_inventory.findMany({
    where: {
        product_id: productId,
        variant_id: { in: variantDemands.map(vd => vd.variantId) }
    }
});
```

---

### ⚠️ Issue #4: Missing PO Status Transition Validation
**File:** `src/controllers/admin.controller.ts`
**Line:** 374

No validation of valid status transitions. Currently allows:
- pending → received (skipping production)
- received → pending (going backwards)
- Any status → any status

**Valid Transitions Should Be:**
```
pending → [confirmed, cancelled]
confirmed → [in_production, cancelled]
in_production → [shipped, cancelled]
shipped → [received, cancelled]
received → [] (terminal)
cancelled → [] (terminal)
```

---

### ⚠️ Issue #5: Missing Received Quantity Validation
**File:** `src/controllers/admin.controller.ts`
**Lines:** 462-464

```typescript
for (const item of receivedItems) {
    const netReceived = item.quantityReceived - (item.quantityDamaged || 0);
```

**Missing Validations:**
- quantityReceived <= PO.quantity (can't receive more than ordered)
- quantityDamaged <= quantityReceived
- netReceived >= 0

---

## Security Issues

### 🔒 Security #1: No Authentication - CRITICAL
**All admin endpoints** are accessible without authentication:
- Anyone can view inventory
- Anyone can adjust stock
- Anyone can create/cancel POs
- No audit trail of who did what

**Fix:** Add JWT middleware to all admin routes

---

### 🔒 Security #2: Permissive CORS
**File:** `src/index.ts`
**Line:** 12

```typescript
app.use(cors());  // Allows ALL origins
```

**Fix:**
```typescript
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
```

---

### 🔒 Security #3: No Rate Limiting
**Impact:** API can be abused:
- Inventory spam adjustments
- PO creation spam
- DoS attacks

**Fix:** Add rate limiting middleware

---

## Bundle-Based Fulfillment Logic Review

### ✅ Strengths

1. **Well-Documented Algorithm** (lines 176-183)
   ```typescript
   // 1. Fetch bundle configuration
   // 2. Fetch warehouse tolerance
   // 3. Check current inventory
   // ... (10 steps total)
   ```

2. **Correct Excess Calculation**
   ```typescript
   const willProduce = maxBundlesNeeded * bundleConfig.units_per_bundle;
   const demand = variantDemand?.quantity || 0;
   const excess = willProduce - demand;
   ```

3. **Proper Tolerance Enforcement**
   ```typescript
   if (excess > tolerance.max_excess_units) {
       const maxAllowedForThisVariant = demand + tolerance.max_excess_units;
       const bundlesAllowed = Math.floor(maxAllowedForThisVariant / bundleConfig.units_per_bundle);
   }
   ```

4. **WhatsApp Integration**
   - Sends detailed breakdown to factory
   - Includes bundle composition
   - Handles missing phone numbers gracefully

---

### ⚠️ Weaknesses

1. **No Bundle Configuration Validation**
   ```typescript
   if (bundleConfigs.length === 0) {
       throw new Error(`No bundle configuration found...`);
   }
   // ❌ But doesn't check if ALL variants in demand have configs
   ```

2. **No Factory Capacity Check**
   - Fetches factory details but never checks:
     - Is factory active?
     - Does factory have capacity?
     - Can factory meet deadline?

3. **No WhatsApp Retry Mechanism**
   ```typescript
   catch (error: any) {
       console.error(`Failed to send WhatsApp...`, error.message);
       // ❌ Silent failure, no retry, no tracking
   }
   ```

4. **Hardcoded Timeout**
   ```typescript
   timeout: 10000  // ❌ Should be in env config
   ```

---

## Data Integrity Issues

### Issue #1: Missing Audit Trail
**Files:** All controllers

**Missing:**
- Who adjusted inventory?
- When was it adjusted?
- What was the previous value?
- Why was it adjusted?

**Database:** `warehouse_audit_log` table doesn't exist

---

### Issue #2: No Inventory Reconciliation
**Impact:**
- Physical inventory vs system inventory can drift
- No cycle counting
- No discrepancy tracking
- Endpoints stubbed (return 501)

---

### Issue #3: Reservation Without Expiry
**File:** `src/controllers/admin.controller.ts`
**Lines:** 178-237

Stock reservations have no expiration:
- Reserved stock locked indefinitely
- No cleanup mechanism
- Can cause artificial stock shortages

**Recommendation:** Add `reserved_until` timestamp and cleanup job

---

## WhatsApp Integration Issues

### Issue #1: Silent Failures
**File:** `src/services/warehouse.service.ts`
**Lines:** 167-169, 482-484

```typescript
catch (error: any) {
    console.error(`Failed to send WhatsApp...`, error.message);
    // Continues without throwing
}
```

**Problem:**
- Factory doesn't get notified
- PO created but no one knows
- No flag indicating notification failed

---

### Issue #2: No Phone Validation
**File:** `src/services/warehouse.service.ts`
**Lines:** 131-133

```typescript
if (!factory.phone_number) {
    console.warn(`Factory has no phone number...`);
    return;
}
```

**Problem:** Should either:
- Throw error (critical notification)
- Return error in response
- Log as auditable event

---

## Type Safety Issues

### Excessive Use of `any` Type

**Locations:**
- warehouse.service.ts:105 - `_calculateBulkShipping(factory: any, product: any, ...)`
- warehouse.service.ts:130 - `_sendWhatsAppToFactory(factory: any, product: any, ...)`
- warehouse.service.ts:227 - `const inventoryMap = new Map<string, any>()`
- All catch blocks - `catch (error: any)`

**Recommendation:** Create proper interfaces

---

## Missing Implementations

### TODO #1: Audit Logging
**Status:** ❌ NOT IMPLEMENTED
**Required:** warehouse_audit_log table + logic
**Impact:** No compliance, no tracking

### TODO #2: Cycle Counting
**Status:** ❌ NOT IMPLEMENTED
**Impact:** No physical inventory verification

### TODO #3: Discrepancy Tracking
**Status:** ❌ NOT IMPLEMENTED
**Impact:** Cannot identify/resolve inventory issues

---

## Database Schema Reference

### warehouse_inventory
```prisma
model warehouse_inventory {
  id                 String @id
  product_id         String
  variant_id         String?
  quantity           Int @default(0)
  available_quantity Int @default(0)
  reserved_quantity  Int @default(0)
  location           String?
  last_restocked_at  DateTime?
  created_at         DateTime @default(now())
  updated_at         DateTime @default(now())

  @@unique([product_id, variant_id])
}
```

### warehouse_purchase_orders
```prisma
model warehouse_purchase_orders {
  id                    String @id
  factory_id            String
  product_id            String
  variant_id            String?
  quantity              Int
  unit_cost             Decimal
  total_cost            Decimal
  status                String @db.VarChar(20)
  created_at            DateTime @default(now())
  updated_at            DateTime @default(now())
  expected_delivery_at  DateTime?
  received_at           DateTime?  // ⚠️ NOT received_date
  notes                 String?
}
```

---

## Recommendations

### Priority 1 (Fix Immediately):
1. ❌ Fix invalid Prisma API call (Bug #1) - Line 27
2. ❌ Fix database field name (Bug #2) - Line 452
3. ❌ Fix package.json (Bug #4)
4. ❌ Fix variant_id null handling (use proper null, not string)
5. ❌ Add authentication to all admin endpoints
6. ❌ Fix status enum mismatch (Bug #3)

### Priority 2 (Fix Soon):
1. ⚠️ Add transaction support for inventory updates
2. ⚠️ Fix N+1 query problems
3. ⚠️ Add PO status transition validation
4. ⚠️ Add received quantity validation
5. ⚠️ Fix Swagger configuration (Bug #5)
6. ⚠️ Implement audit logging

### Priority 3 (Improve):
1. 💡 Add factory capacity checking
2. 💡 Add WhatsApp retry mechanism
3. 💡 Add reservation expiry
4. 💡 Replace `any` types with proper interfaces
5. 💡 Implement cycle counting
6. 💡 Implement discrepancy tracking
7. 💡 Add comprehensive test suite

---

## Files Modified in Review

| File | Lines | Status | Critical Bugs |
|------|-------|--------|---------------|
| src/index.ts | 29 | ⚠️ | CORS too permissive |
| src/controllers/admin.controller.ts | 582 | ❌ | 2 critical bugs |
| src/controllers/warehouse.controller.ts | 47 | ✅ | None |
| src/services/warehouse.service.ts | 487 | ⚠️ | Type safety issues |
| src/repositories/warehouse.repository.ts | 41 | ⚠️ | Status mismatch |
| src/routes/admin.routes.ts | 467 | ✅ | Good validation |
| src/routes/warehouse.routes.ts | 125 | ✅ | Good |
| src/config/swagger.ts | 27 | ❌ | Wrong config |
| package.json | 34 | ❌ | Wrong file |

**Total Lines Reviewed:** ~1,840

---

## Testing Status

**Unit Tests:** ❌ None
**Integration Tests:** ❌ None
**Bundle Logic Tests:** ❌ None

---

## Conclusion

**Overall Status:** ❌ CRITICAL BUGS - DO NOT DEPLOY

The Warehouse Service has excellent bundle-based fulfillment logic but **5 critical bugs** that will cause runtime errors. The service also lacks authentication, proper error handling, and audit trails.

**Estimated Fix Time:** 6-8 hours for Priority 1 items

**Deploy Readiness:** ❌ NOT READY - Fix critical bugs first
