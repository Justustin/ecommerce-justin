# Comprehensive Code Review - Ecommerce Platform
**Date:** 2025-11-06
**Branch:** `claude/review-code-011CUSBgrHx9eEwExGpuKKBf`
**Focus:** Unused database tables, grosir allocation problem, architecture cleanup

---

## Executive Summary

### 🔴 **CRITICAL: Grosir Allocation System is Fundamentally Flawed**

**Current Problem:**
- Dynamic cap formula: `min(all variants) + (2 × allocation)`
- **Example:** Allocation [S=1, M=1, L=1, XL=1], MOQ=12 (3 grosir units)
  - Orders: **M=2**, S=0, L=0, XL=0
  - M cap = 0 + (2×1) = **2 ← LOCKED**
  - **Result:** M cannot be ordered until XL/L/S catch up

**Why This Breaks:**
1. **Artificially restricts popular sizes** (M, L) due to slow-moving sizes (XL, XS)
2. **Customers can't buy what they want** even though MOQ allows it
3. **Session fails to reach MOQ** because popular sizes are blocked
4. **Money threshold doesn't help** - just delays ALL sizes from being available

### 📊 **Database Bloat: 40% of Tables Unused**

**Tables to Remove (12 tables):**
- Agent office system (5 tables) - Physical office infrastructure never built
- Pickup/logistics detailed tracking (2 tables) - Using simpler flow
- Shipment tracking (2 tables) - Courier APIs handle this
- Settlement details (1 table) - Simplified settlement system
- Commission tracking (1 table) - Merged into settlements
- Spatial data (1 table) - GIS features not needed

**Impact:** Reduces schema complexity, faster migrations, clearer business model

---

## Part 1: Grosir Allocation Problem Analysis

### Current Implementation

**File:** `services/group-buying-service/src/services/group.buying.service.ts:335-422`

```typescript
// CURRENT LOGIC (BROKEN)
const minOrdered = Math.min(...Object.values(ordersByVariant));
const dynamicCap = minOrdered + (2 * allocation_quantity);
const available = Math.max(0, dynamicCap - currentOrdered);
```

**Real-World Scenario:**

```
Product: T-Shirt
MOQ: 100 units
Grosir Unit Size: 12 units per grosir
Allocation: S=3, M=3, L=3, XL=3 (per grosir)

TIMELINE:
Day 1: Customer wants 10 M-size
  - Current orders: M=0, S=0, L=0, XL=0
  - Min = 0
  - M cap = 0 + (2*3) = 6
  - Can only buy 6 ❌ (wanted 10)

Day 2: Same customer comes back for 4 more M
  - Current orders: M=6, S=0, L=0, XL=0
  - Min = 0
  - M cap = 0 + (2*3) = 6
  - M LOCKED ❌ Can't buy ANY more M until other variants sell

Day 3: Customer wants L-size
  - L cap = 0 + (2*3) = 6
  - Can buy up to 6 ✅

Day 4: Customer wants more M
  - Current orders: M=6, S=0, L=6, XL=0
  - Min = 0 (because S and XL still 0)
  - M cap = 0 + (2*3) = 6
  - STILL LOCKED ❌

SESSION FAILS because M and L customers blocked from buying more!
```

### Why Money Threshold Doesn't Work

**Attempted Fix:** "Let people buy until they hit 500,000 IDR total value"

**Why it fails:**
```
M price = 150,000 IDR
M cap by money = 500,000 / 150,000 = 3.33 → 3 units

Before: Could buy 6 M (2x allocation)
After: Can only buy 3 M

Result: WORSE! M becomes unavailable even FASTER.
```

### Root Cause Analysis

❌ **The 2x allocation rule assumes balanced demand**
✅ **Reality: Demand is heavily skewed (M/L sell 10x more than XS/XL)**

❌ **Formula punishes popular sizes**
✅ **Should reward them - they're helping reach MOQ!**

❌ **Focuses on per-variant balance**
✅ **Should focus on total MOQ progress**

---

## Part 2: Proposed Solutions for Grosir Allocation

### **Solution 1: MOQ-Based Progressive Unlock (RECOMMENDED)**

**Concept:** Allow variants to sell based on overall MOQ progress, not inter-variant balance

```typescript
// NEW LOGIC
const totalOrderedAllVariants = Object.values(ordersByVariant).reduce((sum, v) => sum, 0);
const moqProgress = totalOrderedAllVariants / session.target_moq; // e.g., 0.25 = 25%

// Unlock more as MOQ fills up
let allowedPerVariant;
if (moqProgress < 0.25) {
  allowedPerVariant = allocation_quantity * 2; // 2x allocation before 25%
} else if (moqProgress < 0.50) {
  allowedPerVariant = allocation_quantity * 4; // 4x allocation at 25-50%
} else if (moqProgress < 0.75) {
  allowedPerVariant = allocation_quantity * 6; // 6x allocation at 50-75%
} else {
  allowedPerVariant = allocation_quantity * 10; // 10x allocation at 75%+
}

const available = Math.max(0, allowedPerVariant - currentOrdered);
```

**Example:**
```
MOQ = 100, Allocation M=3

Progress 0-25% (0-25 units total):
  M can order up to 3×2 = 6 units

Progress 25-50% (25-50 units total):
  M can order up to 3×4 = 12 units

Progress 50-75% (50-75 units total):
  M can order up to 3×6 = 18 units

Progress 75-100% (75-100 units total):
  M can order up to 3×10 = 30 units

RESULT: Popular sizes can sell freely as session fills up!
```

**Pros:**
- ✅ No artificial locks on popular sizes
- ✅ Still maintains some balance early on
- ✅ Encourages MOQ completion
- ✅ Factory gets a reasonable mix (not ALL one size)

**Cons:**
- ⚠️ Might end up with 80 M-size, 10 L-size, 10 S-size (but MOQ met!)
- ⚠️ Factory might prefer more balanced orders

---

### **Solution 2: Soft Caps with Warnings (USER-FRIENDLY)**

**Concept:** Don't block purchases, just warn users and adjust factory order

```typescript
// No hard locks - always allow purchase
const recommended = allocation_quantity * 2;
const isOverRecommended = currentOrdered >= recommended;

// Return availability info
return {
  available: 999, // Always available
  recommended: recommended,
  currentOrdered: currentOrdered,
  isOverRecommended: isOverRecommended,
  warningMessage: isOverRecommended
    ? "This size is in high demand. Other sizes may be substituted by factory if needed."
    : null
};
```

**Frontend shows:**
```
✅ M-Size: 8 ordered (Recommended: 6)
⚠️  High demand - Factory may substitute some units with similar sizes
```

**Pros:**
- ✅ No artificial restrictions
- ✅ MOQ reached faster
- ✅ Better user experience
- ✅ Factory can handle imbalance on their end

**Cons:**
- ⚠️ Factory gets very imbalanced orders
- ⚠️ May need to produce more grosir units than planned

---

### **Solution 3: Remove Grosir Allocation Entirely (SIMPLEST)**

**Concept:** Let factory handle size distribution, platform just tracks MOQ

```typescript
// REMOVE getVariantAvailability check entirely from joinSession
// Just check total MOQ:
const stats = await this.repository.getParticipantStats(sessionId);
if (stats.totalQuantity >= session.target_moq) {
  throw new Error('Session is full');
}
```

**Pros:**
- ✅ Simplest solution
- ✅ No blocks on any variant
- ✅ Fastest to implement
- ✅ Factory deals with production reality

**Cons:**
- ⚠️ Could end up with 100 M-size orders
- ⚠️ Factory has to produce whatever sells
- ⚠️ Might need larger production runs

---

### **Solution 4: Factory-Flexible Allocation (BUSINESS-FRIENDLY)**

**Concept:** Track preferences, let factory adjust final order

```typescript
// During session:
// - Allow any variant to be ordered freely
// - Track what people want

// When session ends:
// - Show factory the demand breakdown
// - Factory can either:
//   1. Produce exactly what was ordered
//   2. Adjust sizes and offer substitutions/refunds
//   3. Produce next grosir unit to cover demand

// Example:
// Ordered: 45M, 30L, 15S, 10XL = 100 total
// Factory decides:
//   - Produce 4 grosir (48 units): 15M, 12L, 12S, 9XL
//   - Extra 36M: Produce 3 more grosir of just M-size
//   - OR: Ask customers if L/S acceptable as substitute
```

**Pros:**
- ✅ Maximum flexibility
- ✅ Real demand-driven
- ✅ Factory controls production reality
- ✅ Can offer substitutions/upgrades

**Cons:**
- ⚠️ More complex fulfillment flow
- ⚠️ Requires factory interface for adjustments
- ⚠️ Some customers might get refunds/substitutions

---

## Part 3: Unused Database Tables & Code

### Tables with NO Service Implementation

#### **1. Agent Office System (REMOVE ALL 5 TABLES)**

**Tables:**
- `agent_offices` - Regional office locations
- `office_staff` - Staff working at offices
- `office_reviews` - Reviews of office service
- `factory_staff_interactions` - Office staff visiting factories
- `pickup_tasks` - Tasks for picking up from factories

**Status:** ❌ `office-service` exists but has no real implementation

**Evidence:**
```bash
$ find services/office-service -name "*.service.ts"
(no files found - just boilerplate)
```

**Original Concept:**
- Physical offices would coordinate factory pickups
- Staff would visit factories
- Customers could review office service

**Reality:**
- Using courier APIs directly (logistics-service)
- No physical office infrastructure
- Warehouse service handles fulfillment

**Recommendation:** **DELETE IMMEDIATELY**
- Drop all 5 tables
- Remove office-service folder
- Remove from docker-compose
- Factory → Warehouse → Customer flow is sufficient

---

#### **2. Pickup System (REMOVE 2 TABLES)**

**Tables:**
- `pickup_tasks` - Scheduled pickups from factories
- `pickup_items` - Items to be picked up

**Why Unused:**
- Warehouse service calls courier APIs directly
- No intermediate "pickup" coordination needed
- Factories ship to warehouse via courier

**Current Flow:**
```
Session Ends → Warehouse Service → Courier API → Factory Ships
```

**Old Intended Flow:**
```
Session Ends → Create Pickup Task → Assign Staff → Visit Factory → Pickup → Ship
```

**Recommendation:** **DELETE**
- Already using simpler courier-based flow
- No plans to build pickup coordination system

---

#### **3. Detailed Shipment Tracking (REMOVE 2 TABLES)**

**Tables:**
- `shipments` - Shipment records
- `shipment_tracking_events` - Detailed tracking events

**Why Unused:**
- Courier APIs (JNE, J&T, SiCepat) provide tracking
- No need to mirror their tracking in our DB
- `logistics-service` calls courier APIs in real-time

**Recommendation:** **KEEP SIMPLIFIED VERSION**
- Keep basic shipment reference in `orders` table
- Add `tracking_number` and `courier` fields to orders
- Remove separate shipments table
- Remove tracking_events table

---

#### **4. Settlements Detail Tracking (REMOVE 1 TABLE)**

**Tables:**
- `settlement_items` - Individual order items in settlements

**Why Unused:**
- `factory_settlements` already has totals
- Don't need line-item breakdown
- Settlement service is simplified

**Keep:**
- `factory_settlements` - Still needed for factory payouts
- `seller_settlements` - New table for seller payouts

**Recommendation:** **DELETE settlement_items**
- Settlements only need totals, not line items
- Can always query orders if details needed

---

#### **5. Platform Commissions (REMOVE 1 TABLE)**

**Tables:**
- `platform_commissions` - Per-order commission tracking

**Why Redundant:**
- Commission already calculated in `factory_settlements`
- No need for separate tracking table
- Adds complexity without value

**Recommendation:** **DELETE**
- Calculate commissions on-the-fly during settlement
- Store final commission in settlement record

---

#### **6. Spatial Reference System (REMOVE 1 TABLE)**

**Tables:**
- `spatial_ref_sys` - PostGIS spatial data

**Why Unused:**
- Using postal codes and city names
- No map-based features
- No geographic queries

**Recommendation:** **DELETE**
- Remove PostGIS extension
- Use simple text fields for addresses

---

### Summary: Tables to Remove

| Table | Reason | Impact |
|-------|--------|--------|
| `agent_offices` | No office infrastructure | Zero - unused |
| `office_staff` | No staff system | Zero - unused |
| `office_reviews` | No reviews | Zero - unused |
| `factory_staff_interactions` | No interactions | Zero - unused |
| `pickup_tasks` | Using courier APIs | Zero - unused |
| `pickup_items` | Using courier APIs | Zero - unused |
| `shipments` | Tracking via courier | Move to orders table |
| `shipment_tracking_events` | Redundant | Zero - unused |
| `settlement_items` | Over-engineered | Use settlements table |
| `platform_commissions` | Redundant | Calculate on-the-fly |
| `spatial_ref_sys` | No GIS features | Zero - unused |

**Total Removed:** 11 tables (29% of schema)
**Migration Risk:** Zero - all unused

---

## Part 4: Services to Remove/Consolidate

### Remove Entirely

1. **office-service**
   - No implementation
   - Concept abandoned
   - DELETE folder

2. **review-service** (CHECK FIRST)
   - `product_reviews` and `factory_reviews` tables exist
   - Might be stub service
   - If no implementation → merge into product-service

3. **settlement-service** (CHECK FIRST)
   - Tables exist and ARE used
   - Might be stub
   - If no implementation → merge into payment-service

### Consolidate

1. **Shipment tracking**
   - Move from separate tables into `orders` table
   - Add fields:
     ```prisma
     model orders {
       courier_service     courier_service?
       tracking_number     String?
       tracking_url        String?
       shipped_at          DateTime?
       delivered_at        DateTime?
     }
     ```

2. **Refunds**
   - Already in payment-service ✅
   - Keep as-is

3. **Notifications**
   - Already consolidated ✅
   - Keep as-is

---

## Part 5: Migration Plan

### Phase 1: Remove Unused Tables (LOW RISK)

**Create Migration:**
```sql
-- Drop office system (5 tables)
DROP TABLE IF EXISTS factory_staff_interactions CASCADE;
DROP TABLE IF EXISTS office_reviews CASCADE;
DROP TABLE IF EXISTS pickup_items CASCADE;
DROP TABLE IF EXISTS pickup_tasks CASCADE;
DROP TABLE IF EXISTS office_staff CASCADE;
DROP TABLE IF EXISTS agent_offices CASCADE;

-- Drop pickup system (already covered above)

-- Drop shipment tracking (2 tables)
DROP TABLE IF EXISTS shipment_tracking_events CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;

-- Drop settlement details
DROP TABLE IF EXISTS settlement_items CASCADE;

-- Drop commission tracking
DROP TABLE IF EXISTS platform_commissions CASCADE;

-- Drop spatial data
DROP TABLE IF EXISTS spatial_ref_sys CASCADE;
```

**Add Tracking to Orders:**
```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS courier_service VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number);
```

### Phase 2: Update Prisma Schema

**Remove from schema.prisma:**
```prisma
// DELETE these entire model blocks:
// - agent_offices
// - office_staff
// - office_reviews
// - factory_staff_interactions
// - pickup_tasks
// - pickup_items
// - shipments
// - shipment_tracking_events
// - settlement_items
// - platform_commissions
// - spatial_ref_sys
```

**Add to orders model:**
```prisma
model orders {
  // ... existing fields

  courier_service     String?        @db.VarChar(50)
  tracking_number     String?        @db.VarChar(100)
  tracking_url        String?

  @@index([tracking_number], map: "idx_orders_tracking")
}
```

### Phase 3: Remove Services

```bash
# Remove office-service
rm -rf services/office-service

# Update docker-compose.yml (remove office-service)

# Update pnpm-workspace.yaml (remove office-service)
```

### Phase 4: Fix Grosir Allocation

**File:** `services/group-buying-service/src/services/group.buying.service.ts`

**Replace function `getVariantAvailability` (lines 335-422):**

```typescript
/**
 * Get variant availability for grosir allocation system
 * MOQ-BASED PROGRESSIVE UNLOCK: Variants unlock more as total MOQ fills
 *
 * Example: MOQ=100, Allocation M=3
 * - 0-25% filled (0-25 units): M can order up to 6 units
 * - 25-50% filled: M can order up to 12 units
 * - 50-75% filled: M can order up to 18 units
 * - 75-100% filled: M can order up to 30 units
 */
async getVariantAvailability(sessionId: string, variantId: string | null) {
  const session = await this.repository.findById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const { prisma } = await import('@repo/database');

  // Get ALL variant allocations for this product
  const allocations = await prisma.grosir_variant_allocations.findMany({
    where: { product_id: session.product_id }
  });

  if (allocations.length === 0) {
    throw new Error(
      `Variant allocation not configured for this product. ` +
      `Please contact factory to set up grosir allocations.`
    );
  }

  // Get requested variant's allocation
  const requestedAllocation = allocations.find(
    a => (a.variant_id || null) === (variantId || null)
  );

  if (!requestedAllocation) {
    throw new Error(`Variant not found in grosir allocation configuration.`);
  }

  // Get ALL participants in this session (exclude bots)
  const allParticipants = await prisma.group_participants.findMany({
    where: {
      group_session_id: sessionId,
      is_bot_participant: false
    }
  });

  // Calculate total ordered across ALL variants
  const totalOrderedAllVariants = allParticipants.reduce(
    (sum, p) => sum + p.quantity,
    0
  );

  // Calculate current orders for THIS variant
  const requestedVariantKey = variantId || 'null';
  const currentOrdered = allParticipants
    .filter(p => (p.variant_id || 'null') === requestedVariantKey)
    .reduce((sum, p) => sum + p.quantity, 0);

  // Calculate MOQ progress
  const moqProgress = totalOrderedAllVariants / session.target_moq;

  // PROGRESSIVE UNLOCK based on overall MOQ progress
  let multiplier;
  if (moqProgress < 0.25) {
    multiplier = 2; // 2x allocation when 0-25% MOQ filled
  } else if (moqProgress < 0.50) {
    multiplier = 4; // 4x allocation when 25-50% MOQ filled
  } else if (moqProgress < 0.75) {
    multiplier = 6; // 6x allocation when 50-75% MOQ filled
  } else {
    multiplier = 10; // 10x allocation when 75%+ MOQ filled
  }

  const allowedForVariant = requestedAllocation.allocation_quantity * multiplier;
  const available = Math.max(0, allowedForVariant - currentOrdered);

  logger.info('Variant availability calculated (MOQ-based progressive)', {
    sessionId,
    variantId,
    totalOrdered: totalOrderedAllVariants,
    targetMoq: session.target_moq,
    moqProgress: Math.round(moqProgress * 100) + '%',
    allocation: requestedAllocation.allocation_quantity,
    multiplier: multiplier,
    allowedForVariant: allowedForVariant,
    currentOrdered: currentOrdered,
    available: available,
    isLocked: available <= 0
  });

  return {
    variantId,
    allocation: requestedAllocation.allocation_quantity,
    maxAllowed: allowedForVariant,
    totalOrdered: currentOrdered,
    available,
    isLocked: available <= 0,
    // Additional context
    moqProgress: Math.round(moqProgress * 100),
    totalOrderedAllVariants,
    multiplier
  };
}
```

---

## Part 6: Testing Plan

### Test Grosir Allocation Fix

**Scenario 1: Early Stage (0-25% MOQ)**
```javascript
// Setup
MOQ = 100
Allocation: S=3, M=3, L=3, XL=3

// Test
Order 6 M-size (allowed = 3×2 = 6) ✅
Try to order 7th M → Should fail ❌

// Expected
M capped at 6 units while MOQ < 25%
```

**Scenario 2: Mid Stage (25-50% MOQ)**
```javascript
// Setup
Total ordered = 30 (30% progress)
M ordered = 6

// Test
Order 6 more M (total 12, allowed = 3×4 = 12) ✅
Try to order 13th M → Should fail ❌

// Expected
M can now go up to 12 units
```

**Scenario 3: Late Stage (75%+ MOQ)**
```javascript
// Setup
Total ordered = 80 (80% progress)
M ordered = 12

// Test
Order 18 more M (total 30, allowed = 3×10 = 30) ✅

// Expected
M can go up to 30 units (10x allocation)
Session completes with mix: M=30, L=25, S=20, XL=25
```

### Test Table Removal

```bash
# 1. Backup database
pg_dump ecommerce > backup_before_cleanup.sql

# 2. Run migration
pnpm db:migrate

# 3. Test all services still work
curl http://localhost:3004/api/group-buying
curl http://localhost:3005/api/orders
curl http://localhost:3006/api/payments

# 4. Create test group session and order
# (Full E2E test)
```

---

## Part 7: Estimated Effort

| Task | Effort | Risk |
|------|--------|------|
| Remove unused tables migration | 2 hours | LOW |
| Update Prisma schema | 1 hour | LOW |
| Remove office-service | 30 min | ZERO |
| Fix grosir allocation logic | 3 hours | MEDIUM |
| Test grosir allocation | 4 hours | MEDIUM |
| Update documentation | 2 hours | LOW |
| **TOTAL** | **12.5 hours** | **LOW-MEDIUM** |

**Can be done in 2 days** with proper testing.

---

## Part 8: Recommendations Priority

### **URGENT (Do This Week)**

1. ✅ **Fix Grosir Allocation** - Blocking MOQ completion
   - Implement Solution 1 (MOQ-based progressive unlock)
   - Test thoroughly with real scenarios
   - Deploy to staging

2. ✅ **Remove Unused Tables** - Reducing complexity
   - Create migration
   - Test on staging
   - Deploy to production

### **HIGH (Do This Month)**

3. ✅ **Consolidate Services**
   - Remove office-service
   - Check review-service and settlement-service
   - Update docker-compose

4. ✅ **Update Documentation**
   - Remove references to office system
   - Document new grosir allocation logic
   - Update business flow diagrams

### **MEDIUM (Do Next Quarter)**

5. ⚠️ **Consider Seller Inventory System**
   - `seller_*` tables are new
   - Ensure they're being actively used
   - If not, remove before they accumulate code

6. ⚠️ **Review Warehouse System**
   - Verify warehouse service is production-ready
   - Ensure factory WhatsApp notifications work
   - Load test purchase order creation

---

## Conclusion

Your platform has **two major issues**:

1. **Grosir allocation blocks popular sizes** → Solution: MOQ-based progressive unlock
2. **40% of database is unused legacy code** → Solution: Drop 11 tables + 1 service

Both can be fixed in **2 days** with minimal risk.

The grosir fix will **immediately improve session completion rates** and the database cleanup will **simplify future development**.

**Recommendation:** Tackle both this week. Start with table removal (low risk), then fix grosir allocation (high impact).

