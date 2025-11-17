# COMPREHENSIVE BACKEND FLOW SUMMARY

**Date:** November 17, 2025
**Status:** Complete Backend Logic Flow Documentation
**Branch:** `claude/review-backend-logic-flow-011CV2AXqzc32N6rccnM3qhF`

---

## TABLE OF CONTENTS

### Core Business Flows
1. [Business Model Overview](#business-model-overview)
2. [Two-Entity Structure](#two-entity-structure)
3. [Regular Product Order Flow](#1-regular-product-order-flow)
4. [Group Buying Flow - Happy Path](#2-group-buying-flow---happy-path-moq-reached)
5. [Group Buying Flow - Failure Path](#3-group-buying-flow---failure-path-moq-not-reached)
6. [Bot Participant Logic](#4-bot-participant-logic)
7. [Grosir Allocation System](#5-grosir-allocation-system)
8. [Warehouse Integration Flow](#6-warehouse-integration-flow)

### Product & Factory Management
9. [Product Management Flow](#9-product-management-flow)
10. [Category Management Flow](#10-category-management-flow)
11. [Factory Registration & Verification Flow](#11-factory-registration--verification-flow)

### Customer & Address Management
12. [Address Management Flow](#12-address-management-flow)

### Financial & Payment Flows
13. [Payment & Escrow Flow](#13-payment--escrow-flow)
14. [Refund Processing Flow](#14-refund-processing-flow)
15. [Transaction Ledger & Financial Tracking](#15-transaction-ledger--financial-tracking)
16. [Wallet Management Flow](#16-wallet-management-flow)

### Logistics & Notifications
17. [Shipping & Logistics Flow](#17-shipping--logistics-flow)
18. [Notification System Flow](#18-notification-system-flow)

### System Architecture
19. [Service Communication Map](#19-service-communication-map)
20. [Critical Fixes Applied](#20-critical-fixes-applied)
21. [Implementation Status Summary](#21-implementation-status-summary)

---

## BUSINESS MODEL OVERVIEW

### Dual Business Model

Your platform operates **TWO distinct business models**:

#### 1. Factory Group Buying (Make-to-Order)
```
Customers → Join Group Session → Pay Upfront (Escrow)
           ↓
Warehouse → Orders from Factory → Pays Factory
           ↓
Factory → Produces After MOQ → Ships to Warehouse
           ↓
Warehouse → Holds Inventory → Ships to Customers
           ↓
Platform → "Buys" from Warehouse → Releases Escrow to Warehouse
```

**Key Features:**
- Tiered pricing (25%, 50%, 75%, 100% MOQ fill = different prices)
- Escrow payment (held until session completes)
- Bot auto-join to guarantee 25% minimum viability
- Grosir bundle-based allocation
- Warehouse handles all inventory risk

#### 2. Seller Inventory (Traditional) - NOT YET IMPLEMENTED
```
Sellers → Maintain Own Inventory → Sell Directly
         ↓
Customers → Buy Immediately → Direct Payment
```

---

## TWO-ENTITY STRUCTURE

### **Entity 1: Laku Warehouse**
- Legal entity that owns/manages inventory
- Orders from factories proactively during sessions
- Pays factories upfront for grosir units (12, 24, 36, etc.)
- Keeps excess inventory for future sales
- Absorbs inventory risk

### **Entity 2: Laku Platform**
- Legal entity that runs e-commerce platform
- Collects payments from customers (escrow)
- "Buys" from Laku Warehouse when orders are fulfilled
- Releases escrow payments to Laku Warehouse
- No inventory risk

### Financial Flow:
```
Customer pays Platform (escrow) → Session completes → Platform "buys" from Warehouse → Platform releases escrow to Warehouse
```

---

## 1. REGULAR PRODUCT ORDER FLOW

**Trigger:** User clicks "Buy Now" on product

### Step-by-Step Flow:

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: ORDER CREATION                                          │
└─────────────────────────────────────────────────────────────────┘

User → Frontend: POST /api/orders
{
  userId: "uuid",
  items: [{ productId, variantId?, quantity }],
  shippingAddress: { name, phone, address, city, ... },
  discountAmount?: number
}
       ↓
Order Service: createOrder()
  1. Validates items exist
  2. Validates shipping address complete
  3. Gets product prices from Product Service
  4. Groups items by factory_id
  5. Calculates:
     - subtotal = sum of (price × quantity)
     - total_amount = subtotal + shipping + tax - discount
  6. Creates order records (one per factory)
  7. Order status = 'pending_payment'

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: PAYMENT CREATION                                        │
└─────────────────────────────────────────────────────────────────┘

Order Service → Payment Service: POST /api/payments
{
  orderId: "uuid",
  userId: "uuid",
  amount: order.total_amount,  // ✅ FIXED: was subtotal
  paymentMethod: "bank_transfer",
  expiresAt: "24h from now",
  factoryId: "uuid"
}
       ↓
Payment Service: createPayment()
  1. Creates Xendit invoice
  2. Generates payment_code: PAY-YYYYMMDD-XXXXXX
  3. Saves payment record (status: 'pending')
  4. Returns payment_url for user
       ↓
Returns to Frontend: {
  payment_url: "https://invoice.xendit.co/...",
  payment_code: "PAY-20251116-ABC123",
  expires_at: "timestamp"
}

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: USER PAYMENT                                            │
└─────────────────────────────────────────────────────────────────┘

User → Xendit Payment Page
  1. Selects payment method (bank transfer, e-wallet, etc.)
  2. Completes payment
       ↓
Xendit → Payment Service: Webhook
POST /api/webhooks/xendit/invoice
{
  id: "invoice_id",
  status: "PAID",
  amount: 120000,
  paid_at: "timestamp",
  ...
}

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: WEBHOOK PROCESSING                                      │
└─────────────────────────────────────────────────────────────────┘

Payment Service: handleXenditCallback()
  1. Verifies webhook signature (HMAC-SHA256)
  2. Checks webhook_events table for duplicates
     INSERT ON CONFLICT DO NOTHING (prevents double-processing)
  3. If duplicate: Return 200 OK, stop processing
  4. If new: Continue processing in transaction
       ↓
  5. Updates payment:
     - payment_status = 'paid'
     - paid_at = now
  6. Updates order:
     - order.status = 'paid'
     - order.paid_at = now
  7. Records transaction ledger:
     - transaction_type: 'payment_received'
     - factory_id, amount, order_id
  8. Marks webhook as processed
       ↓
  9. Sends notification:
     POST /api/notifications
     { type: 'payment_success', userId, message }

┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: SHIPPING (Triggered Separately)                         │
│ ⚠️ NOT YET AUTOMATED - Requires manual admin action             │
└─────────────────────────────────────────────────────────────────┘

Admin/System → Logistics Service: POST /api/shipments
{
  orderId: "uuid",
  origin: { factory address },
  destination: { customer address },
  items: [...]
}
       ↓
Logistics Service: createShipment()
  1. Calls Biteship API for rates
  2. Creates shipment booking
  3. Gets tracking number
  4. Saves shipment record
  5. Updates order.status = 'processing'
       ↓
Biteship sends tracking webhooks
       ↓
Logistics Service: Updates shipment status
  - picked_up → in_transit → delivered
```

**Final State:**
- Order created and paid
- Shipment booked
- Customer receives tracking number
- Order progresses through fulfillment

---

## 2. GROUP BUYING FLOW - HAPPY PATH (MOQ Reached)

**Trigger:** Users join group buying session

### Phase 1: Users Join Session

```
┌─────────────────────────────────────────────────────────────────┐
│ USER JOINS GROUP BUYING SESSION                                 │
└─────────────────────────────────────────────────────────────────┘

User → Frontend: POST /api/group-buying/:sessionId/join
{
  userId: "uuid",
  variantId: "uuid",  // Size/color/etc
  quantity: 5,
  unitPrice: 200000,  // Must match session.group_price
  totalPrice: 1000000,
  selectedShipping: {
    courierId: "jne",
    price: 15000,
    estimatedDays: 3
  }
}
       ↓
Group Buying Service: joinSession()

STEP 1: Validate Session
  - Session status must be 'forming' or 'active'
  - Session not expired
  - Unit price matches session.group_price

STEP 2: Check Grosir Variant Availability
  getVariantAvailability(sessionId, variantId)
    ↓
  1. Get grosir_bundle_config for product
     Example: 2S + 5M + 4L + 1XL per bundle

  2. Get warehouse tolerance
     Example: S max_excess=20, M max_excess=50

  3. Count current orders for this variant (REAL participants only)
     - Excludes bot participants

  4. Calculate bundles needed per variant:
     bundlesNeeded = ceil(ordered / units_per_bundle)

  5. Find max bundles across all variants

  6. Check tolerance constraints:
     If excess > max_tolerance: Lock variant

  7. Return:
     {
       available: number,
       isLocked: boolean,
       maxAllowed: number,
       constrainingVariant: string
     }
    ↓
  If locked: throw "Variant locked - other sizes need to catch up"
  If quantity > available: throw "Only X units available"

STEP 3: Calculate Shipping Costs
  Two-leg shipping model:

  Leg 1 (Factory → Warehouse):
    = session.bulk_shipping_cost_per_unit × quantity
    (Pre-calculated: bulkShippingCost / targetMoq)

  Leg 2 (Warehouse → Customer):
    = selectedShipping.price
    (User's chosen courier/service)

  Gateway Fee:
    = productPrice × 3%

  Total Payment:
    = productPrice + leg1 + leg2 + gatewayFee

STEP 4: Create Participant Record
  Creates: group_participants
  {
    group_session_id,
    user_id,
    variant_id,
    quantity,
    unit_price: session.group_price,
    total_price: quantity × unit_price,
    is_bot_participant: false
  }

STEP 5: Create Escrow Payment
  Group Buying → Payment Service: POST /api/payments/escrow
  {
    userId,
    groupSessionId,
    participantId,
    amount: totalPayment,
    factoryId
  }
       ↓
  Payment Service:
    1. Creates Xendit invoice
    2. Saves payment:
       - is_in_escrow: true
       - payment_status: 'pending'
    3. Returns payment_url
       ↓
  User pays via Xendit
       ↓
  Webhook marks payment as 'paid' but keeps in escrow

STEP 6: Session Monitoring
  After each join:
    - Updates participant count
    - Checks variant availability for next joins
    - No intermediate MOQ notifications (session only ends when timer expires or admin terminates)
```

### Phase 2: Near-Expiration (10 minutes before end)

```
┌─────────────────────────────────────────────────────────────────┐
│ CRON JOB: processSessionsNearingExpiration()                    │
│ Runs every 1-2 minutes                                          │
└─────────────────────────────────────────────────────────────────┘

For each session expiring in 8-10 minutes:

  Calculate real fill percentage:
    realParticipants = participants.filter(!is_bot_participant)
    realQuantity = sum(realParticipants.quantity)
    fillPercentage = (realQuantity / targetMoq) × 100

  ✅ AUTO-RENEWAL FOR ALL SESSIONS:
    After processing ANY expired session (success/failure/pending_stock):
    → Create identical session for next day starting at midnight

    Purpose: Ensure product always available for continuous purchases

    New session details:
    - Start time: Next day 00:00:00
    - End time: Next day 23:59:59
    - Copies all pricing tiers
    - Copies MOQ and product settings
    - New session code generated

  CASE 2: < 25% Fill
    Calculate bot quantity needed:
      botQuantity = ceil(targetMoq × 0.25) - realQuantity

    Create bot participant:
      {
        user_id: BOT_USER_ID (from env),
        quantity: botQuantity,
        unit_price: session.group_price,
        is_bot_participant: true,
        is_platform_order: true
      }

    ✅ Create bot payment (for MOQ counting):
      {
        payment_method: 'platform_bot',
        payment_status: 'paid',
        order_amount: 0,  // No real money
        total_amount: 0,  // Bot is illusion
        is_in_escrow: false
      }

    Update session:
      bot_participant_id = bot.id
      platform_bot_quantity = botQuantity

  CASE 3: >= 25% Fill
    No action needed
```

### Phase 3: Session Expiration (MOQ Reached)

```
┌─────────────────────────────────────────────────────────────────┐
│ CRON JOB: processExpiredSessions()                              │
│ Runs every 5-10 minutes                                         │
└─────────────────────────────────────────────────────────────────┘

For each session where end_time <= now:

STEP 1: Atomic Status Claim
  UPDATE sessions SET status='moq_reached'
  WHERE id=xxx AND status NOT IN ('moq_reached', 'success', 'failed')

  If no rows updated: Already being processed, skip

STEP 2: Get Full Session Data
  Loads with all participants, payments, factory, product details

STEP 3: Check Bot Existence & Create if Needed
  Check if bot already exists from near-expiration job

  If NOT exists AND realFillPercentage < 25%:
    Create bot in transaction:
      - Create bot participant
      - ✅ Create bot payment (amount=0)
      - Update session with bot_participant_id

  Else if bot exists:
    Log: "Bot already exists, skipping creation"

STEP 4: Warehouse Stock Check
  ✅ Exclude bot from demand calculation:

  realParticipants = participants.filter(!is_bot_participant)

  Group by variant:
    variantDemands = [
      { variantId: "S-uuid", quantity: 20 },
      { variantId: "M-uuid", quantity: 38 },
      ...
    ]

  Group Buying → Warehouse Service:
  POST /api/warehouse/fulfill-bundle-demand
  {
    productId,
    sessionId,
    variantDemands  // Only REAL participant demand
  }
       ↓
  Warehouse Service: (see Warehouse Flow section)
    - Checks bundle configs
    - Checks warehouse tolerance
    - Checks current inventory
    - If stock available: Reserves it
    - If no stock: Creates PO to factory + WhatsApp
    - Returns: { hasStock, bundlesOrdered, ... }
       ↓
  If !hasStock:
    Update session: status = 'pending_stock'
    Stop here (wait for factory to produce)
    ❌ Orders NOT created yet

  If hasStock:
    Continue to next step

STEP 5: Calculate Final Tier
  Based on ALL participant fill percentage (INCLUDING bot):

  allParticipants = participants // Includes bot if exists
  totalQuantity = sum(allParticipants.quantity)
  fillPercentage = (totalQuantity / targetMoq) × 100

  Tiers:
    >= 100% → tier = 100, price = price_tier_100
    >= 75%  → tier = 75,  price = price_tier_75
    >= 50%  → tier = 50,  price = price_tier_50
    >= 25%  → tier = 25,  price = price_tier_25

  ✅ Bot IS included in calculation

  Why: This gives customers tier discounts even with low participation.
  Example: 1 real customer (10 units) + bot (15 units) = 25% fill
           → Customer gets tier 25% pricing discount

  Trade-off: Customers get "undeserved" discounts, but improves conversion

STEP 6: Issue Tier-Based Refunds to Wallet
  If final price < base price:
    refundPerUnit = basePrice - finalPrice

    For each REAL participant:
      totalRefund = refundPerUnit × quantity

      Group Buying → Wallet Service:
      POST /api/wallet/credit
      {
        userId,
        amount: totalRefund,
        description: "Group buying tier refund"
      }

STEP 7: Delete Bot Participant
  ✅ Bot removed before creating orders:

  If bot exists:
    DELETE FROM group_participants WHERE id = bot_participant_id
    DELETE FROM payments WHERE participant_id = bot_participant_id

  Purpose: Bot doesn't get real order

STEP 8: Create Orders for Real Participants
  ✅ Filter out bot participants:

  realParticipants = participants.filter(!is_bot_participant)

  Group Buying → Order Service:
  POST /api/orders/bulk
  {
    groupSessionId,
    participants: realParticipants.map(p => ({
      userId: p.user_id,
      productId: session.product_id,
      variantId: p.variant_id,
      quantity: p.quantity,
      unitPrice: finalPrice,  // Tier price, not base price
      totalPrice: p.quantity × finalPrice
    }))
  }
       ↓
  Order Service: createBulkOrders()
    For each participant:
      1. Gets default address from Address Service
      2. Creates order with status = 'paid'
      3. Links to group_participants.order_id
      4. NO payment creation (already in escrow)

    Returns: { ordersCreated: count }

STEP 9: Release Escrow
  Group Buying → Payment Service:
  POST /api/payments/release-escrow
  { groupSessionId }
       ↓
  Payment Service: releaseEscrow()
    In transaction:
      1. Finds all paid escrow payments for session
      2. Updates each:
         - is_in_escrow = false
         - escrow_released_at = now
      3. Records in transaction ledger
         - factory_id
         - amount
         - transaction_type: 'escrow_released'

    Returns: { paymentsReleased: count, totalAmount }

STEP 10: Update Session Status
  status = 'success'
  final_tier = tier
  completed_at = now

STEP 11: Notifications
  To participants (excluding bot):
    "Session successful! Orders created at tier X price"

  To factory owner:
    "Start production - X orders created for session Y"
```

**Final State:**
- Session marked as 'success'
- Orders created for real participants only
- Escrow released to warehouse
- Bot deleted (no trace in orders)
- Warehouse has reserved inventory OR factory notified

---

## 3. GROUP BUYING FLOW - FAILURE PATH

**Note:** With the bot system in place, MOQ failure is extremely rare. Failure only occurs when:
1. **Zero participants joined** (no one joined the session)
2. **Admin manually cancels** the session

```
┌─────────────────────────────────────────────────────────────────┐
│ CRON JOB: processExpiredSessions() - Session Failed             │
└─────────────────────────────────────────────────────────────────┘

Failure triggers:
- 0 participants joined (session empty)
- Admin manually cancelled session

STEP 1: Mark Session as Failed
  status = 'failed'
  cancelled_at = now

STEP 2: Refund All Participants
  Group Buying → Payment Service:
  POST /api/payments/refund-session
  { groupSessionId, reason: 'group_failed_moq' }
       ↓
  Payment Service: refundSession()
    Finds all PAID payments for session

    For each payment:
      1. Creates refund record:
         - refund_status = 'processing' (auto-approved)
         - refund_reason = 'group_failed_moq'
         - refund_amount = full payment amount

      2. Triggers auto-processing (100ms delay):
         setTimeout(() => processRefund(refundId), 100)

      3. processRefund():
         a. Calls Xendit API to process refund
         b. Updates refund_status = 'completed'
         c. Updates payment_status = 'refunded'
         d. Updates order status = 'cancelled'
         e. Records in transaction ledger
         f. Sends notification to user

STEP 3: Delete Bot (if exists)
  DELETE FROM group_participants WHERE is_bot_participant=true
  DELETE FROM payments WHERE payment_method='platform_bot'

STEP 4: Notifications
  To all participants:
    "Session failed to reach MOQ. Full refund processed."

  To factory:
    "Session cancelled - insufficient participants"
```

**Final State:**
- Session marked as 'failed'
- All participants refunded via Xendit
- No orders created
- Bot deleted

---

## 4. BOT PARTICIPANT LOGIC

### Purpose: "Generous Discount Provider"

Bot exists to:
- ✅ Make UI show 25% minimum fill (makes session look viable)
- ✅ Count toward MOQ calculation (allows session to complete)
- ✅ **Count toward tier pricing calculation** (gives customers tier discounts)

Bot does NOT:
- ❌ Trigger warehouse to order inventory (only real demand counts)
- ❌ Get real order created
- ❌ Involve any real money (payment = $0)
- ❌ Appear in any reports/analytics
- ❌ Get notifications

**Business Impact:**
- 1 customer orders 10 units (10% of MOQ 100)
- Bot adds 15 units to reach 25%
- Customer gets tier 25% pricing (discounted price)
- This is intentional to improve conversion rates

### Implementation Details:

```
BOT CREATION (Near-Expiration or Expiration):
  group_participants:
    quantity: calculated to reach 25%
    is_bot_participant: true
    is_platform_order: true
    unit_price: session.group_price

  payments:
    payment_method: 'platform_bot'
    payment_status: 'paid'
    order_amount: 0         ✅ No real money
    total_amount: 0         ✅ No real money
    is_in_escrow: false
    gateway_response: {
      type: 'bot_payment',
      auto_paid: true,
      note: 'Virtual payment - bot participant for MOQ fill'
    }

WHERE BOT IS INCLUDED:
  ✅ Tier pricing calculation (gives customers discounts)
  ✅ MOQ validation (allows session to proceed)
  ✅ UI participant count (makes session look viable)

WHERE BOT IS EXCLUDED:
  ✅ Line 897:  fulfillWarehouseDemand() excludes bot (no excess inventory)
  ✅ Line 1654: Refunds issued to real participants only (bot has no money)
  ✅ Line 1704: Bot deleted before creating orders (no bot order)
  ✅ Line 1721: Orders created for real participants only
  ✅ Multiple:  Notifications sent to real participants only

BOT LIFECYCLE:
  Created at T-10min OR expiration (if <25% fill)
       ↓
  Helps session reach MOQ
       ↓
  Session expires successfully
       ↓
  Bot DELETED before orders created
       ↓
  No trace in final orders/payments
```

### Why Bot Payment Record Exists:

```typescript
// MOQ calculation in repository (line 473):
const paidParticipants = participants.filter(p =>
  p.payments && p.payments.length > 0 &&
  p.payments.some(payment => payment.payment_status === 'paid')
);

// Without payment record:
// Bot would NOT count → Session would fail

// With payment record (amount=0):
// Bot DOES count → Session succeeds → Bot deleted → Clean state
```

---

## 5. GROSIR ALLOCATION SYSTEM

### Problem: Factory Bundle Constraints

Factories ship products in fixed bundles (grosir units):

**Example:**
```
Factory Bundle: 2S + 5M + 4L + 1XL = 12 units/bundle

Orders so far:
  S: 8 units
  M: 35 units  ← Drives production
  L: 12 units
  XL: 3 units

M needs: ceil(35/5) = 7 bundles

If factory ships 7 bundles:
  S: 7×2 = 14 produced (8 ordered → 6 excess)
  M: 7×5 = 35 produced (35 ordered → 0 excess) ✓
  L: 7×4 = 28 produced (12 ordered → 16 excess)
  XL: 7×1 = 7 produced (3 ordered → 4 excess)

Total excess: 26 units (warehouse must absorb)
```

### Solution: Warehouse Tolerance System

**Database Schema:**

```sql
-- Bundle composition per product
grosir_bundle_config:
  product_id, variant_id, units_per_bundle
  Example: (shirt-123, M-uuid, 5)  -- 5 M per bundle

-- Warehouse tolerance per variant
grosir_warehouse_tolerance:
  product_id, variant_id, max_excess_units
  Example: (shirt-123, M-uuid, 50)  -- Max 50 excess M units OK
```

### Algorithm (in getVariantAvailability):

```typescript
// Called when user tries to join session with variant

STEP 1: Get bundle config for this variant
  bundleConfig = { units_per_bundle: 5 }

STEP 2: Get warehouse tolerance
  tolerance = { max_excess_units: 50 }

STEP 3: Count current orders for this variant (REAL participants only)
  currentOrdered = 35

STEP 4: Calculate bundles needed for THIS variant
  bundlesNeededForMe = ceil(35 / 5) = 7

STEP 5: Get bundles needed for ALL other variants
  S needs: ceil(8/2) = 4
  M needs: ceil(35/5) = 7
  L needs: ceil(12/4) = 3
  XL needs: ceil(3/1) = 3

  maxBundlesNeeded = max(4,7,3,3) = 7

STEP 6: Calculate excess if we produce 7 bundles
  willProduce = 7 × 5 = 35 (for M)
  excess = 35 - 35 = 0

  If excess > 50: Lock variant
  Else: Allow ordering

STEP 7: Calculate how much user can order
  maxCanProduce = maxBundles × units_per_bundle
  available = maxCanProduce - currentOrdered

  Return: {
    available: number,
    isLocked: boolean,
    maxAllowed: number
  }
```

### User Experience:

```
User A wants 40 M shirts:
  Current M orders: 35
  Bundle size: 5
  Tolerance: 50

  Will need: ceil(75/5) = 15 bundles
  Will produce: 15×5 = 75 M
  Excess: 75-75 = 0 ✓

  Check other variants for tolerance violations...
  If all OK: Allow
  If any locked: "Variant locked - other sizes need to catch up"
```

---

## 6. WAREHOUSE INTEGRATION FLOW

### Trigger: Session Expires with MOQ Reached

```
┌─────────────────────────────────────────────────────────────────┐
│ GROUP BUYING → WAREHOUSE: fulfill-bundle-demand                 │
└─────────────────────────────────────────────────────────────────┘

Request:
  POST /api/warehouse/fulfill-bundle-demand
  {
    productId: "uuid",
    sessionId: "uuid",
    variantDemands: [
      { variantId: "S-uuid", quantity: 20 },  // REAL participants only
      { variantId: "M-uuid", quantity: 38 },
      { variantId: "L-uuid", quantity: 25 },
      { variantId: "XL-uuid", quantity: 5 }
    ]
  }

Warehouse Service: fulfillBundleDemand()

STEP 1: Get Bundle Configuration
  Query grosir_bundle_config:
    S:  2 units/bundle
    M:  5 units/bundle
    L:  4 units/bundle
    XL: 1 unit/bundle

STEP 2: Get Warehouse Tolerance
  Query grosir_warehouse_tolerance:
    S:  max 20 excess
    M:  max 50 excess
    L:  max 40 excess
    XL: max 30 excess

STEP 3: Check Current Inventory
  Query warehouse_inventory:
    S:  0 available, 0 reserved
    M:  10 available, 0 reserved
    L:  0 available, 0 reserved
    XL: 2 available, 0 reserved

STEP 4: Calculate Net Demand
  S:  20 - 0 = 20 needed
  M:  38 - 10 = 28 needed
  L:  25 - 0 = 25 needed
  XL: 5 - 2 = 3 needed

STEP 5: Calculate Bundles Needed Per Variant
  S:  ceil(20/2) = 10 bundles
  M:  ceil(28/5) = 6 bundles
  L:  ceil(25/4) = 7 bundles
  XL: ceil(3/1) = 3 bundles

  maxBundlesNeeded = max(10,6,7,3) = 10 bundles

STEP 6: Check Tolerance Constraints
  If we produce 10 bundles:
    S:  10×2=20 produced, 20 demand → 0 excess ✓ (≤20)
    M:  10×5=50 produced, 38 demand → 12 excess ✓ (≤50)
    L:  10×4=40 produced, 25 demand → 15 excess ✓ (≤40)
    XL: 10×1=10 produced, 5 demand → 5 excess ✓ (≤30)

  All within tolerance!

STEP 7a: IF ALL IN STOCK
  Reserve inventory:
    UPDATE warehouse_inventory
    SET available_quantity -= demand,
        reserved_quantity += demand

  Response:
    {
      hasStock: true,
      bundlesOrdered: 0,
      variantsReserved: [...]
    }

STEP 7b: IF STOCK INSUFFICIENT (Current Case)
  Create Purchase Order:
    {
      po_number: "PO-20251116-XXXXX",
      factory_id: factory.id,
      product_id: product.id,
      quantity: 10 × 12 = 120 total units,
      unit_cost: calculated,
      total_cost: quantity × unit_cost,
      status: 'pending'
    }

  Send WhatsApp to Factory:
    "🏭 New Bundle Purchase Order

    PO Number: PO-20251116-XXXXX
    Product: Premium T-Shirt

    Bundle Order: 10 complete bundles
    Each bundle: 2S + 5M + 4L + 1XL

    Total Units: 120
    Total Value: Rp 12,000,000

    Delivery to: Laku Warehouse
    Address: [warehouse address]"

  Response:
    {
      hasStock: false,
      bundlesOrdered: 10,
      totalUnitsOrdered: 120,
      constrainingVariant: null,
      purchaseOrder: { id, po_number, ... },
      inventoryAdditions: [
        { variantId: "S", willReceive: 20, demand: 20, excess: 0 },
        { variantId: "M", willReceive: 50, demand: 38, excess: 12 },
        ...
      ]
    }
```

### Warehouse Ordering Timeline:

```
SESSION ACTIVE:
├─ User 1 joins (1 unit) → Warehouse sees demand
├─ Warehouse checks stock: 0 available
└─ Warehouse orders 1 grosir (12 units)
    └─ Warehouse pays factory
    └─ Inventory will be: 12 units

SESSION CONTINUES:
├─ Users 2-13 join (total 13 units)
├─ Warehouse sees demand: 13 units
└─ Warehouse orders 2nd grosir (another 12 units)
    └─ Inventory will be: 24 units

SESSION EXPIRES:
├─ MOQ reached with 13 real participants
├─ Warehouse already has 24 units (from earlier orders)
├─ Warehouse reserves 13 units
├─ Platform creates 13 orders
├─ Warehouse ships 13 units
└─ Warehouse keeps 11 units (24-13) for future sales
```

---

## 9. PRODUCT MANAGEMENT FLOW

### Overview

Products are created by factories and can include variants (sizes, colors, etc.). Products go through a lifecycle: draft → active → inactive.

### Create Product Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ FACTORY CREATES PRODUCT                                         │
└─────────────────────────────────────────────────────────────────┘

Factory Owner → Frontend: POST /api/products
{
  factoryId: "uuid",
  categoryId: "uuid",
  name: "Premium Batik Shirt",
  description: "Traditional Indonesian batik...",
  basePrice: 150000,
  moq: 100,
  productionDays: 14,

  // Group buying prices (tiered)
  groupBuyingEnabled: true,
  groupPrice: 200000,         // Base price for group buying
  priceTier25: 175000,        // Price if 25% MOQ reached
  priceTier50: 140000,        // Price if 50% MOQ reached
  priceTier75: 125000,        // Price if 75% MOQ reached
  priceTier100: 110000,       // Price if 100% MOQ reached

  // Bulk shipping from factory to warehouse
  bulkShippingCost: 500000,   // Total cost to ship MOQ quantity

  // Product details
  weight: 250,                // grams
  dimensions: { length: 50, width: 30, height: 5 },
  sku: "BAT-SHT-001",

  status: "draft"
}
       ↓
Product Service: createProduct()

  STEP 1: Generate slug from name
    slug = slugify("Premium Batik Shirt") → "premium-batik-shirt"

  STEP 2: Validate factory exists
    Query: factories WHERE id = factoryId
    If not found: throw "Factory not found"

  STEP 3: Validate category exists
    Query: categories WHERE id = categoryId
    If not found: throw "Category not found"

  STEP 4: Create product record
    INSERT INTO products:
      - All product data
      - status = 'draft'
      - created_at = now
      - Generated column: bulk_shipping_cost_per_unit
        = bulkShippingCost / moq

  STEP 5: Return product
    Returns complete product object with calculated fields
```

### Add Product Variants

```
┌─────────────────────────────────────────────────────────────────┐
│ ADD VARIANTS (Sizes, Colors, etc.)                              │
└─────────────────────────────────────────────────────────────────┘

Factory → POST /api/products/:id/variants
{
  productId: "product-uuid",
  variantType: "size",
  variantValue: "M",
  sku: "BAT-SHT-001-M",
  additionalPrice: 0,        // No extra cost for M
  stockQuantity: 0           // Will be managed by warehouse
}
       ↓
Product Service: createVariant()

  1. Validates product exists
  2. Creates variant record
  3. Links to product via product_id
  4. Returns variant object

Repeat for each variant:
  - Size S, M, L, XL, XXL
  - Color variations (if applicable)
  - Other attributes
```

### Configure Grosir Bundle

```
┌─────────────────────────────────────────────────────────────────┐
│ CONFIGURE FACTORY BUNDLE COMPOSITION                            │
└─────────────────────────────────────────────────────────────────┘

Factory → POST /api/warehouse/grosir-bundle-config
{
  productId: "uuid",
  bundleSize: 12,            // Total units per grosir
  variantComposition: [
    { variantId: "S-uuid", unitsPerBundle: 2 },
    { variantId: "M-uuid", unitsPerBundle: 5 },
    { variantId: "L-uuid", unitsPerBundle: 4 },
    { variantId: "XL-uuid", unitsPerBundle: 1 }
  ]
}
       ↓
Warehouse Service: Creates bundle configuration
       ↓
Also configure warehouse tolerance:
POST /api/warehouse/tolerance
{
  productId: "uuid",
  variantTolerances: [
    { variantId: "S-uuid", maxExcessUnits: 20 },
    { variantId: "M-uuid", maxExcessUnits: 50 },
    { variantId: "L-uuid", maxExcessUnits: 40 },
    { variantId: "XL-uuid", maxExcessUnits: 30 }
  ]
}
```

### Add Product Images

```
Factory → POST /api/products/:id/images
{
  images: [
    { imageUrl: "https://cdn.../img1.jpg", sortOrder: 1 },
    { imageUrl: "https://cdn.../img2.jpg", sortOrder: 2 },
    { imageUrl: "https://cdn.../img3.jpg", sortOrder: 3 }
  ]
}
       ↓
Product Service: addProductImages()
  Creates image records linked to product
  Orders by sortOrder for display
```

### Publish Product

```
Factory → PATCH /api/products/:id/publish
       ↓
Product Service: publishProduct()

  STEP 1: Validate product is complete
    - Has at least 1 image
    - Has at least 1 variant (if applicable)
    - Has all required fields
    - Factory is verified and active

  STEP 2: Update status
    UPDATE products
    SET status = 'active', published_at = now
    WHERE id = productId

  STEP 3: Return updated product
    Product now visible to customers
```

### Product Listing & Search

```
┌─────────────────────────────────────────────────────────────────┐
│ CUSTOMER BROWSES PRODUCTS                                        │
└─────────────────────────────────────────────────────────────────┘

Customer → GET /api/products?
  categoryId=uuid&
  search=batik&
  status=active&
  page=1&
  limit=20
       ↓
Product Service: getProducts()

  Builds query with filters:
    - WHERE status = 'active' (only show published)
    - AND category_id = categoryId (if provided)
    - AND (name ILIKE '%batik%' OR description ILIKE '%batik%')
    - ORDER BY created_at DESC
    - LIMIT 20 OFFSET 0

  Includes relations:
    - factory (name, logo, rating)
    - category (name, slug)
    - images (ordered by sortOrder)
    - variants (all available variants)
    - _count (orders, reviews)

  Returns:
    {
      products: [...],
      pagination: {
        total: 150,
        page: 1,
        limit: 20,
        totalPages: 8
      }
    }
```

### Product Detail Page

```
Customer → GET /api/products/:slug
       ↓
Product Service: getProductBySlug()

  Loads complete product:
    - Product details
    - All variants with availability
    - All images
    - Factory info (name, location, rating, verification status)
    - Category breadcrumb
    - Active group buying sessions (if any)
    - Recent reviews
    - Related products (same category)

  Returns full product object for detail page
```

---

## 10. CATEGORY MANAGEMENT FLOW

### Overview

Categories organize products hierarchically. Categories can have parent categories (subcategories).

### Category Structure

```
Electronics (parent_id: null)
  ├─ Smartphones (parent_id: electronics_id)
  ├─ Laptops (parent_id: electronics_id)
  └─ Accessories (parent_id: electronics_id)

Fashion (parent_id: null)
  ├─ Men's Clothing (parent_id: fashion_id)
  │   ├─ Shirts (parent_id: mens_clothing_id)
  │   └─ Pants (parent_id: mens_clothing_id)
  ├─ Women's Clothing (parent_id: fashion_id)
  └─ Accessories (parent_id: fashion_id)
```

### Create Category

```
Admin → POST /api/categories
{
  name: "Batik & Textiles",
  description: "Traditional Indonesian fabrics and clothing",
  parentId: null,              // Root category
  iconUrl: "https://cdn.../batik-icon.svg",
  displayOrder: 1,
  isActive: true
}
       ↓
Category Service:

  1. Generate slug: "batik-textiles"
  2. Check slug uniqueness
  3. Validate parent category exists (if parentId provided)
  4. Create category record
  5. Return category with counts
```

### Get Categories

```
Customer → GET /api/categories/root
       ↓
Returns only top-level categories:
  [
    {
      id: "uuid",
      name: "Batik & Textiles",
      slug: "batik-textiles",
      iconUrl: "...",
      displayOrder: 1,
      _count: {
        products: 45,
        subcategories: 3
      }
    },
    ...
  ]

---

Customer → GET /api/categories/:id
       ↓
Returns category with subcategories:
  {
    id: "uuid",
    name: "Batik & Textiles",
    subcategories: [
      { id: "uuid", name: "Traditional Batik", ... },
      { id: "uuid", name: "Modern Batik", ... }
    ],
    parent: null,
    _count: { products: 45 }
  }
```

---

## 11. FACTORY REGISTRATION & VERIFICATION FLOW

### Overview

Factories register on the platform and go through a verification process before they can sell products.

### Factory Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ FACTORY OWNER REGISTERS                                          │
└─────────────────────────────────────────────────────────────────┘

Factory Owner → POST /api/factories
{
  ownerId: "user-uuid",              // Factory owner's user ID
  factoryCode: "FACT-PKL-001",       // Unique factory code
  factoryName: "Batik Pekalongan Premium",

  // Business details
  businessLicenseNumber: "NIB-1234567890",
  businessLicensePhotoUrl: "https://cdn.../license.jpg",
  taxId: "01.234.567.8-901.000",     // NPWP

  // Contact info
  phoneNumber: "081234567890",
  email: "factory@batik.com",

  // Address
  province: "Jawa Tengah",
  city: "Pekalongan",
  district: "Pekalongan Barat",
  postalCode: "51111",
  addressLine: "Jl. Batik Raya No. 123",

  // Optional
  logoUrl: "https://cdn.../logo.png",
  description: "Premium batik manufacturer since 1985"
}
       ↓
Factory Service: createFactory()

  STEP 1: Validate owner exists
    Query: users WHERE id = ownerId

  STEP 2: Check factory code uniqueness
    Query: factories WHERE factory_code = factoryCode
    If exists: throw "Factory code already exists"

  STEP 3: Create factory record
    INSERT INTO factories:
      - All factory data
      - status = 'pending'                    // Needs admin review
      - verification_status = 'unverified'    // Needs verification
      - created_at = now

  STEP 4: Send notification to admin
    POST /api/notifications
    {
      type: 'factory_registration',
      title: 'New Factory Registration',
      message: 'Batik Pekalongan Premium has registered'
    }

  STEP 5: Send confirmation to factory owner
    POST /api/notifications
    {
      userId: ownerId,
      type: 'registration_received',
      message: 'Your factory registration is under review'
    }

  Returns: Factory object with status 'pending'
```

### Admin Verification Process

```
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN VERIFIES FACTORY                                           │
└─────────────────────────────────────────────────────────────────┘

Admin reviews:
  - Business license documents
  - Tax ID (NPWP) validity
  - Factory address verification
  - Owner background check
  - Production capacity

Admin → PATCH /api/factories/:id/verify
{
  verificationStatus: "verified",    // or "rejected"
  verifiedBy: "admin-user-uuid",
  notes: "All documents verified"
}
       ↓
Factory Service: verifyFactory()

  1. Update factory:
     - verification_status = 'verified'
     - verified_by = admin-user-uuid
     - verified_at = now

  2. Send notification to factory owner:
     "Your factory has been verified! You can now add products."

  Returns: Updated factory object
```

### Activate Factory

```
Admin → PATCH /api/factories/:id/status
{
  status: "active"
}
       ↓
Factory Service: updateFactoryStatus()

  Validates:
    - Factory must be verified first
    - Cannot activate unverified factory

  Updates:
    - status = 'active'
    - activated_at = now

  Factory can now:
    - Create products
    - Manage inventory
    - Receive orders
```

### Factory Status Lifecycle

```
Registration → pending (unverified)
             ↓
Admin Review → verified (pending activation)
             ↓
Activation   → active (can sell)
             ↓
Operations   → suspended (temporary hold)
             → inactive (stopped operations)
```

### Get Factory Profile

```
Customer → GET /api/factories/:id
       ↓
Returns:
  {
    id: "uuid",
    factoryCode: "FACT-PKL-001",
    factoryName: "Batik Pekalongan Premium",
    status: "active",
    verificationStatus: "verified",
    logoUrl: "...",
    description: "...",

    // Address
    city: "Pekalongan",
    province: "Jawa Tengah",

    // Stats
    _count: {
      products: 25,
      activeGroupSessions: 3,
      completedOrders: 1250
    },

    // Ratings (from orders/reviews)
    averageRating: 4.7,
    totalReviews: 450,

    // Products
    products: [...] // Active products only
  }
```

---

## 12. ADDRESS MANAGEMENT FLOW

### Overview

Users can manage multiple shipping addresses. One address can be set as default for quick checkout.

### Create Address

```
┌─────────────────────────────────────────────────────────────────┐
│ USER ADDS SHIPPING ADDRESS                                       │
└─────────────────────────────────────────────────────────────────┘

User → POST /api/addresses
{
  userId: "user-uuid",
  label: "Home",                      // Home, Office, etc.
  recipientName: "John Doe",
  phoneNumber: "081234567890",

  // Full address
  province: "DKI Jakarta",
  city: "Jakarta Selatan",
  district: "Kebayoran Baru",
  postalCode: "12345",
  addressLine: "Jl. Sudirman No. 123, Apt 45",

  // Optional
  landmark: "Near Plaza Senayan",
  notes: "Ring bell twice",

  isDefault: true                     // Set as default address
}
       ↓
Address Service: createAddress()

  STEP 1: Validate required fields
    - userId, recipientName, phoneNumber required
    - province, city, district, postalCode required
    - addressLine required

  STEP 2: Handle default address logic
    If isDefault = true:
      // Unset other default addresses for this user
      UPDATE addresses
      SET is_default = false
      WHERE user_id = userId AND is_default = true

  STEP 3: Create address record
    INSERT INTO addresses:
      - All address data
      - is_default = true/false
      - created_at = now

  Returns: Address object
```

### Get User Addresses

```
User → GET /api/addresses/user/:userId
       ↓
Address Service: getUserAddresses()

  Query:
    SELECT * FROM addresses
    WHERE user_id = userId
    ORDER BY is_default DESC, created_at DESC

  Returns: Array of addresses (default first)
```

### Get Default Address

```
Order Service needs default address →
POST /api/addresses/user/:userId/default
       ↓
Address Service: getDefaultAddress()

  Query:
    SELECT * FROM addresses
    WHERE user_id = userId AND is_default = true
    LIMIT 1

  If not found:
    // Return first address as fallback
    SELECT * FROM addresses
    WHERE user_id = userId
    ORDER BY created_at ASC
    LIMIT 1

  If still not found:
    throw "No address found for user"

  Returns: Address object
```

### Set Default Address

```
User → POST /api/addresses/:id/set-default
{
  userId: "user-uuid"    // For authorization
}
       ↓
Address Service: setDefaultAddress()

  In transaction:
    1. Unset all default addresses for user:
       UPDATE addresses
       SET is_default = false
       WHERE user_id = userId

    2. Set this address as default:
       UPDATE addresses
       SET is_default = true
       WHERE id = addressId AND user_id = userId

  Returns: Updated address
```

### Update Address

```
User → PATCH /api/addresses/:id
{
  recipientName: "Jane Doe",    // Changed name
  phoneNumber: "082345678901",   // Changed phone
  // Other fields...
}
       ↓
Address Service: updateAddress()

  1. Finds address by ID
  2. Validates user owns this address
  3. Updates fields
  4. Returns updated address
```

### Delete Address

```
User → DELETE /api/addresses/:id
{
  userId: "user-uuid"    // For authorization
}
       ↓
Address Service: deleteAddress()

  Validates:
    1. Address belongs to user
    2. User has other addresses (cannot delete only address)

  If address is default AND user has other addresses:
    // Set another address as default
    UPDATE addresses
    SET is_default = true
    WHERE user_id = userId AND id != addressId
    LIMIT 1

  Delete address:
    DELETE FROM addresses WHERE id = addressId

  Returns: 204 No Content
```

---

## 13. PAYMENT & ESCROW FLOW

### Regular Payment Flow:

```
Order created → Payment Service creates Xendit invoice
             → User pays → Xendit webhook
             → Payment marked 'paid'
             → Order marked 'paid'
             → Transaction ledger recorded
```

### Escrow Payment Flow:

```
CREATION:
  Group participant joins → Payment created:
    is_in_escrow: true
    payment_status: 'pending'

  User pays → Webhook:
    payment_status: 'paid'
    is_in_escrow: true  (still held)

  Money held by Xendit, not released to merchant

HOLDING PERIOD:
  Payment exists in 'paid' but 'in_escrow' state
  Order NOT created yet
  Money NOT accessible by warehouse

RELEASE (MOQ Success):
  Session completes → releaseEscrow():
    In transaction:
      1. Find all escrow payments for session
      2. Update: is_in_escrow = false
      3. Update: escrow_released_at = now
      4. Record in transaction ledger

  Money released to merchant (warehouse)
  Orders already created (in same flow)

REFUND (MOQ Failure):
  Session fails → refundSession():
    For each payment:
      1. Create refund record
      2. Call Xendit refund API
      3. Update: payment_status = 'refunded'
      4. Update: is_in_escrow = false
      5. Record in ledger

  Money returned to customer
  No orders created
```

### Transaction Ledger:

Every financial event recorded:

```
payment_received:
  - Customer pays order
  - Escrow released to warehouse
  - Bot payment (amount=0)

refund_issued:
  - MOQ failure refund
  - Order cancellation refund

escrow_released:
  - Group buying session success

settlement_paid:
  - Factory payout
  - Seller payout
```

---

## 8. SHIPPING & LOGISTICS FLOW

### Two-Leg Shipping Model:

```
┌─────────────────────────────────────────────────────────────────┐
│ LEG 1: Factory → Warehouse (Bulk Shipping)                      │
└─────────────────────────────────────────────────────────────────┘

When: Factory produces and ships to warehouse
Cost: Bulk shipping cost / number of units
Paid by: Laku Warehouse (to factory or logistics)
Charged to: Customers (as bulk_shipping_cost_per_unit)

Calculation:
  bulkShippingCost = totalCostToShipFromFactoryToWarehouse
  perUnitCost = bulkShippingCost / targetMoq

  Stored in: session.bulk_shipping_cost_per_unit (generated column)

  Each participant pays:
    leg1Cost = bulk_shipping_cost_per_unit × quantity

┌─────────────────────────────────────────────────────────────────┐
│ LEG 2: Warehouse → Customer (Individual Shipping)               │
└─────────────────────────────────────────────────────────────────┘

When: User joins session
How: User selects courier and service level
Cost: Variable per user (based on destination)
Paid by: Customer directly

Flow:
  1. User joins → Frontend calls Logistics Service
     POST /api/rates
     {
       origin: warehouse postal code,
       destination: user postal code,
       items: [{ weight, dimensions }]
     }

  2. Logistics Service → Biteship API
     Returns available couriers:
       [
         { id: "jne-reg", name: "JNE Regular", price: 15000, etd: "3-4 days" },
         { id: "jne-yes", name: "JNE YES", price: 25000, etd: "1-2 days" },
         ...
       ]

  3. User selects option → Stored in join request:
     selectedShipping: { courierId, price, estimatedDays }

Total Shipping Cost Per User:
  = leg1Cost + leg2Cost
```

### Shipment Creation Flow:

```
After order paid:
  Admin/System → Logistics Service: POST /api/shipments
  {
    orderId,
    origin: { warehouse address },
    destination: { customer address },
    courier: selectedCourier,
    items: [...]
  }
       ↓
  Logistics Service:
    1. Calls Biteship /orders endpoint
    2. Books shipment
    3. Gets tracking number
    4. Saves shipment record
    5. Returns tracking info
       ↓
  Biteship sends tracking webhooks:
    - picked_up
    - in_transit
    - delivered
       ↓
  Logistics Service updates shipment status
       ↓
  Updates order status accordingly
```

---

## 9. WALLET & REFUND FLOW

### Wallet Credit Flow (Tier Refunds):

```
Session completes with Tier 50% (better than base price):
  basePrice = 200000
  tier50Price = 135000
  refundPerUnit = 200000 - 135000 = 65000

For each REAL participant (bot excluded):
  User A: 10 units → 650000 refund
  User B: 15 units → 975000 refund

  Group Buying → Wallet Service:
  POST /api/wallet/credit
  {
    userId,
    amount: refundAmount,
    description: "Group buying tier refund - Session X (Tier 50%)",
    reference: "GROUP_REFUND_sessionId_participantId",
    metadata: {
      sessionId,
      participantId,
      basePricePerUnit,
      finalPricePerUnit,
      refundPerUnit,
      quantity
    }
  }
       ↓
  Wallet Service:
    In transaction:
      1. Get/create user wallet
      2. Save balance_before
      3. Increment: wallet.balance += amount
      4. Increment: wallet.total_earned += amount
      5. Create wallet_transaction record
         - type: 'credit'
         - balance_before
         - balance_after
         - description

    Returns: transaction record
```

### Wallet Usage:

```
User can use wallet balance for:
  - Future purchases (discount at checkout)
  - Withdrawal to bank account
```

### Withdrawal Flow:

```
User → Wallet Service: POST /api/withdrawals/request
{
  userId,
  amount: 500000,
  bank_code: "bca",
  account_number: "1234567890",
  account_name: "John Doe"
}
       ↓
Wallet Service: requestWithdrawal()
  In transaction:
    1. Check wallet.balance >= amount + WITHDRAWAL_FEE (2500)
    2. Decrement balance atomically:
       UPDATE wallets
       SET balance = balance - amount
       WHERE user_id = userId AND balance >= amount

       If no rows updated: throw "Insufficient balance"

    3. Create wallet_withdrawals:
       - status: 'pending'
       - amount: 500000
       - withdrawal_fee: 2500
       - net_amount: 497500

    4. Create wallet_transaction (negative amount)
       ↓
Admin approves:
  ⚠️ CRITICAL: NOT YET IMPLEMENTED
  Should call Xendit disbursement API
  Currently just marks as 'processing' without sending money
```

### Full Refund Flow (Payment Method):

```
MOQ fails or Order cancelled:
  Payment Service → Xendit Refund API
  {
    invoice: payment.gateway_transaction_id,
    reason: 'group_failed_moq',
    amount: payment.order_amount
  }
       ↓
  Xendit processes refund:
    - E-wallet: Instant refund
    - Bank transfer: 1-3 business days
       ↓
  Update refund:
    refund_status: 'completed'
    completed_at: now
       ↓
  Update payment:
    payment_status: 'refunded'
    refunded_at: now
       ↓
  Update order:
    status: 'cancelled'
    cancelled_at: now
       ↓
  Send notification to user
```

---

## 14. REFUND PROCESSING FLOW

### Overview

Refunds can be triggered by MOQ failures, order cancellations, or customer requests. The system handles both automatic and manual refund processing.

### Refund Creation

```
┌─────────────────────────────────────────────────────────────────┐
│ CREATE REFUND REQUEST                                            │
└─────────────────────────────────────────────────────────────────┘

Trigger sources:
  1. Group buying MOQ failure (automatic)
  2. Order cancellation (manual/automatic)
  3. Customer request (manual admin approval)

Payment Service: createRefund()
{
  paymentId: "uuid",
  orderId: "uuid",
  userId: "uuid",
  reason: "group_failed_moq",
  description: "Group session failed to reach MOQ",
  amount: 1000000
}
       ↓
Refund Service: createRefund()

  STEP 1: Validate payment exists and is paid
    Query: payments WHERE id = paymentId
    If payment_status != 'paid': throw "Cannot refund unpaid payment"

  STEP 2: Check for existing refunds
    Query: refunds WHERE payment_id = paymentId
           AND refund_status IN ('pending', 'processing', 'completed')
    If exists: throw "Payment already has a pending or completed refund"

  STEP 3: Create refund record
    INSERT INTO refunds:
      refund_code: "REF-20251117-XXXXXX"
      payment_id: paymentId
      order_id: orderId
      user_id: userId
      refund_amount: amount
      refund_reason: reason
      reason_description: description
      refund_status: 'processing'    // Auto-approved for MOQ failures
      requested_at: now

  STEP 4: Auto-process if MOQ failure
    If reason === 'group_failed_moq':
      setTimeout(() => processRefund(refundId), 100ms)
    Else:
      // Wait for admin approval
      refund_status = 'pending'

  Returns: Refund object
```

### Refund Processing

```
┌─────────────────────────────────────────────────────────────────┐
│ PROCESS REFUND VIA XENDIT                                        │
└─────────────────────────────────────────────────────────────────┘

Refund Service: processRefund(refundId)

  STEP 1: Load refund with payment data
    Query: refunds + payments

  STEP 2: Validate refund status
    If status NOT IN ('pending', 'processing'):
      throw "Refund cannot be processed from current status"

  STEP 3: Mark as processing
    UPDATE refunds SET refund_status = 'processing'

  STEP 4: Call Xendit Refund API
    Based on payment method:

    E-Wallet Refund:
      POST https://api.xendit.co/ewallets/:charge_id/refunds
      {
        amount: refund.refund_amount,
        reason: refund.refund_reason
      }
      Response:
        {
          id: "ewallet_refund_xxx",
          status: "SUCCEEDED",
          refund_fee: 0
        }

    Bank Transfer/Virtual Account Refund:
      POST https://api.xendit.co/refunds
      {
        invoice_id: payment.gateway_transaction_id,
        amount: refund.refund_amount,
        reason: refund.refund_reason
      }
      Response:
        {
          id: "refund_xxx",
          status: "PENDING",  // May take 1-3 business days
          refund_fee_amount: 2500
        }

  STEP 5: Mark refund as completed
    UPDATE refunds:
      refund_status = 'completed'
      completed_at = now
      gateway_refund_id = gatewayResponse.id
      gateway_response = JSON.stringify(gatewayResponse)

  STEP 6: Update payment record
    UPDATE payments:
      payment_status = 'refunded'
      refunded_at = now
      refunded_amount += refund.refund_amount

  STEP 7: Update order record
    UPDATE orders:
      status = 'cancelled'
      cancelled_at = now
      cancellation_reason = refund.refund_reason

  STEP 8: Record in transaction ledger
    Transaction Ledger Service:
    recordRefund(
      refundId,
      paymentId,
      orderId,
      amount,
      reason,
      metadata: {
        refund_code,
        gateway_refund_id,
        refund_fee
      }
    )

  STEP 9: Send notification to user
    Notification Service:
    POST /api/notifications
    {
      userId,
      type: 'refund_completed',
      title: 'Refund Processed',
      message: `Your refund of Rp ${amount} has been processed`,
      actionUrl: `/orders/${orderId}`
    }

  Returns: { success: true, refund }
```

### Batch Refund for Group Buying Session

```
┌─────────────────────────────────────────────────────────────────┐
│ REFUND ALL PARTICIPANTS IN FAILED SESSION                        │
└─────────────────────────────────────────────────────────────────┘

Group Buying Service → Payment Service:
POST /api/payments/refund-session
{
  groupSessionId: "session-uuid",
  reason: "group_failed_moq"
}
       ↓
Refund Service: refundSession(groupSessionId)

  STEP 1: Find all paid payments for session
    Query:
      SELECT * FROM payments
      WHERE group_session_id = groupSessionId
        AND payment_status = 'paid'
        AND is_bot_participant = false    // Exclude bot

  STEP 2: Create refund for each payment
    For each payment:
      Try {
        createRefund({
          paymentId: payment.id,
          orderId: payment.order_id,
          userId: payment.user_id,
          reason: 'group_failed_moq',
          description: `Group session ${groupSessionId} failed to reach MOQ`,
          amount: payment.order_amount
        })
        → Auto-processes after 100ms
        results.push({ paymentId, status: 'success', refundId })
      } Catch (error) {
        results.push({ paymentId, status: 'failed', error })
      }

  STEP 3: Return batch results
    Returns:
      {
        totalPayments: 25,
        successfulRefunds: 24,
        failedRefunds: 1,
        results: [...]
      }
```

### Refund Failure Handling

```
If Xendit API fails:
  ↓
  STEP 1: Mark refund as failed
    UPDATE refunds:
      refund_status = 'failed'
      failed_at = now
      failure_reason = error.message

  STEP 2: Send notification to admin
    POST /api/notifications (admin channel)
    {
      type: 'refund_failed',
      title: 'Refund Processing Failed',
      message: `Refund ${refundCode} failed: ${error.message}`,
      actionUrl: `/admin/refunds/${refundId}`
    }

  STEP 3: Send notification to user
    POST /api/notifications
    {
      userId,
      type: 'refund_failed',
      title: 'Refund Issue',
      message: 'We encountered an issue processing your refund. Our team is investigating.',
      actionUrl: `/orders/${orderId}`
    }

  STEP 4: Admin manual intervention required
    Admin can retry refund or process manually
```

---

## 15. TRANSACTION LEDGER & FINANCIAL TRACKING

### Overview

Every financial transaction is recorded in the transaction ledger for audit trail, reconciliation, and reporting.

### Transaction Types

```
payment_received:
  - Customer pays for order
  - Escrow payment received (held)
  - Recorded when payment status = 'paid'

escrow_released:
  - Group buying session succeeds
  - Escrow payments released to warehouse
  - Recorded when is_in_escrow changes to false

refund_issued:
  - MOQ failure refunds
  - Order cancellation refunds
  - Customer request refunds

settlement_paid:
  - Platform pays factory for completed orders
  - Periodic payouts (weekly/monthly)
  - NOT YET IMPLEMENTED

wallet_credit:
  - Tier-based refunds to wallet
  - Promotional credits

wallet_debit:
  - User spends wallet balance
  - Withdrawal requests
```

### Recording Transactions

```
┌─────────────────────────────────────────────────────────────────┐
│ PAYMENT RECEIVED                                                 │
└─────────────────────────────────────────────────────────────────┘

Payment Service → Transaction Ledger Service:
recordPaymentReceived(
  paymentId,
  orderId,
  factoryId,
  amount,
  orderNumber,
  options: {
    gatewayFee: 3% of amount,
    isEscrow: true/false
  }
)
       ↓
INSERT INTO transaction_ledger:
  transaction_code: "TXN-20251117-XXXXXX"
  transaction_type: "payment_received"
  payment_id: paymentId
  order_id: orderId
  factory_id: factoryId
  amount: amount
  currency: "IDR"
  gateway_fee: options.gatewayFee
  is_escrow: options.isEscrow
  transaction_status: "completed"
  created_at: now
  metadata: {
    order_number: orderNumber,
    payment_method: payment.payment_method
  }
```

```
┌─────────────────────────────────────────────────────────────────┐
│ ESCROW RELEASED                                                  │
└─────────────────────────────────────────────────────────────────┘

Group Buying Service → Payment Service → Ledger:
recordEscrowRelease(
  paymentId,
  orderId,
  amount,
  groupSessionId
)
       ↓
INSERT INTO transaction_ledger:
  transaction_type: "escrow_released"
  payment_id: paymentId
  order_id: orderId
  amount: amount
  metadata: {
    group_session_id: groupSessionId,
    session_code: session.session_code
  }
```

```
┌─────────────────────────────────────────────────────────────────┐
│ REFUND ISSUED                                                    │
└─────────────────────────────────────────────────────────────────┘

Refund Service → Ledger:
recordRefund(
  refundId,
  paymentId,
  orderId,
  amount,
  reason,
  metadata
)
       ↓
INSERT INTO transaction_ledger:
  transaction_type: "refund_issued"
  refund_id: refundId
  payment_id: paymentId
  order_id: orderId
  amount: -amount          // Negative amount
  metadata: {
    refund_code: refundCode,
    refund_reason: reason,
    gateway_refund_id: gatewayRefundId
  }
```

### Factory Financial Summary

```
Admin → GET /api/transactions/factory/:factoryId/summary?
  startDate=2025-11-01&
  endDate=2025-11-30
       ↓
Transaction Ledger Service: getFactoryTransactionSummary()

  Calculates:
    1. Total payments received (payment_received)
    2. Total escrow released (escrow_released)
    3. Total refunds issued (refund_issued)
    4. Total settlements paid (settlement_paid)
    5. Pending balance = received - settled - refunds

  Returns:
    {
      factoryId,
      period: { startDate, endDate },

      totalReceived: 50000000,      // All payments
      totalEscrowReleased: 45000000,// Escrow → warehouse
      totalRefunded: 2000000,        // Refunds
      totalSettled: 30000000,        // Paid to factory

      pendingSettlement: 18000000,   // Not yet paid to factory

      paymentCount: 125,
      orderCount: 100,
      refundCount: 5,
      settlementCount: 2,

      transactions: [...]            // Detailed list
    }
```

### Platform Financial Summary

```
Admin → GET /api/transactions/summary?
  startDate=2025-11-01&
  endDate=2025-11-30
       ↓
Transaction Ledger Service: getTransactionSummary()

  Aggregates across all factories:
    - Total revenue (all payments)
    - Total refunds
    - Total gateway fees paid
    - Total settlements due/paid
    - Platform commission (revenue - settlements - fees)

  Breakdown by:
    - Transaction type
    - Factory
    - Date (daily/weekly/monthly)
    - Payment method

  Returns comprehensive financial report
```

---

## 16. WALLET MANAGEMENT FLOW

### Overview

Users have digital wallets that can receive tier refunds, promotional credits, and can be used for purchases or withdrawn to bank accounts.

### Wallet Structure

```
wallets table:
  user_id: "uuid"
  balance: decimal(15,2)           // Current available balance
  total_earned: decimal(15,2)      // Lifetime earnings
  total_spent: decimal(15,2)       // Lifetime spending
  total_withdrawn: decimal(15,2)   // Lifetime withdrawals
  created_at, updated_at

wallet_transactions table:
  wallet_id: "uuid"
  transaction_type: 'credit' | 'debit'
  amount: decimal(15,2)
  balance_before: decimal(15,2)
  balance_after: decimal(15,2)
  description: text
  reference_type: 'group_refund' | 'promo' | 'purchase' | 'withdrawal'
  reference_id: "uuid"
  created_at
```

### Credit Wallet (Tier Refunds)

Already documented in section 2 (Group Buying Flow - Happy Path, Step 6)

### Use Wallet for Purchase

```
┌─────────────────────────────────────────────────────────────────┐
│ USER PAYS WITH WALLET BALANCE                                    │
└─────────────────────────────────────────────────────────────────┘

Customer checkout:
  Cart Total: Rp 500,000
  Wallet Balance: Rp 200,000
  User applies wallet: Rp 150,000
       ↓
Order Service → Wallet Service:
POST /api/wallet/debit
{
  userId,
  amount: 150000,
  description: "Payment for order ORD-12345",
  referenceType: "purchase",
  referenceId: orderId
}
       ↓
Wallet Service: debit()

  In transaction:
    1. Lock wallet:
       SELECT * FROM wallets
       WHERE user_id = userId
       FOR UPDATE

    2. Validate balance:
       IF balance < amount:
         throw "Insufficient wallet balance"

    3. Deduct balance:
       UPDATE wallets
       SET balance = balance - amount,
           total_spent = total_spent + amount
       WHERE user_id = userId

    4. Record transaction:
       INSERT INTO wallet_transactions:
         type: 'debit'
         amount: -150000
         balance_before: 200000
         balance_after: 50000
         description: "Payment for order ORD-12345"

  Final payment:
    Wallet: Rp 150,000 (deducted)
    Gateway: Rp 350,000 (via Xendit)
    Total: Rp 500,000
```

### Withdraw to Bank

```
┌─────────────────────────────────────────────────────────────────┐
│ USER WITHDRAWS WALLET BALANCE                                    │
└─────────────────────────────────────────────────────────────────┘

User → POST /api/wallet/withdrawals/request
{
  userId,
  amount: 500000,
  bankCode: "bca",
  accountNumber: "1234567890",
  accountName: "John Doe"
}
       ↓
Wallet Service: requestWithdrawal()

  STEP 1: Validate minimum amount
    If amount < 50000:
      throw "Minimum withdrawal is Rp 50,000"

  STEP 2: Calculate fees
    WITHDRAWAL_FEE = 2500
    totalDeduction = amount + WITHDRAWAL_FEE
    netAmount = amount - WITHDRAWAL_FEE

  STEP 3: Check balance
    In transaction:
      SELECT * FROM wallets
      WHERE user_id = userId
      FOR UPDATE

      IF balance < totalDeduction:
        throw "Insufficient balance (including Rp 2,500 fee)"

  STEP 4: Deduct balance
      UPDATE wallets
      SET balance = balance - totalDeduction
      WHERE user_id = userId

  STEP 5: Create withdrawal request
      INSERT INTO wallet_withdrawals:
        user_id: userId
        amount: 500000
        withdrawal_fee: 2500
        net_amount: 497500
        bank_code: "bca"
        account_number: "1234567890"
        account_name: "John Doe"
        status: 'pending'              // Awaits admin approval
        requested_at: now

  STEP 6: Record wallet transaction
      INSERT INTO wallet_transactions:
        type: 'debit'
        amount: -500000
        description: "Withdrawal request WD-12345"
        reference_type: 'withdrawal'

  STEP 7: Notify user
      "Your withdrawal request is being processed"

  Returns: Withdrawal object with status 'pending'
```

### Admin Processes Withdrawal

```
⚠️ CRITICAL: NOT YET IMPLEMENTED

Admin → PATCH /api/wallet/withdrawals/:id/approve
       ↓
Should call Xendit Disbursement API:
  POST https://api.xendit.co/disbursements
  {
    external_id: withdrawal.id,
    bank_code: "BCA",
    account_holder_name: "John Doe",
    account_number: "1234567890",
    amount: 497500,           // Net amount after fee
    description: "Wallet withdrawal"
  }
       ↓
  Xendit processes:
    - Deducts from platform balance
    - Transfers to user's bank account
    - Returns disbursement ID
       ↓
  Update withdrawal:
    status: 'completed'
    completed_at: now
    gateway_disbursement_id: xenditResponse.id
       ↓
  Notify user:
    "Your withdrawal of Rp 500,000 has been sent to your bank account"

⚠️ CURRENT STATE:
  Admin can only mark as 'processing' without actually sending money
  Xendit disbursement integration missing
```

---

## 17. SHIPPING & LOGISTICS FLOW

### Two-Leg Shipping Model:

Already documented in section 8 (original numbering) - See above for complete details.

Key points:
- Leg 1: Factory → Warehouse (bulk shipping, split per unit)
- Leg 2: Warehouse → Customer (individual courier selection)
- Integration with Biteship API for rates and tracking
- Webhook updates for shipment status

---

## 18. NOTIFICATION SYSTEM FLOW

### Overview

The notification service provides real-time updates to users about order status, payments, refunds, group buying sessions, and system events.

### Notification Types

```
Order & Payment:
  - order_created: "Your order has been created"
  - payment_success: "Payment received for order X"
  - payment_failed: "Payment failed for order X"
  - order_confirmed: "Your order has been confirmed"
  - order_shipped: "Your order is on the way"
  - order_delivered: "Your order has been delivered"

Refunds:
  - refund_completed: "Your refund has been processed"
  - refund_failed: "Issue processing your refund"

Group Buying:
  - session_joined: "You've joined group buying session"
  - moq_reached: "Session MOQ reached! Closing soon"
  - session_success: "Session successful - orders created"
  - session_failed: "Session failed - refund initiated"
  - tier_refund: "Tier discount credited to wallet"

Wallet:
  - wallet_credited: "Funds added to your wallet"
  - wallet_debited: "Wallet used for purchase"
  - withdrawal_requested: "Withdrawal request received"
  - withdrawal_completed: "Withdrawal sent to bank"

Factory:
  - factory_registration: "New factory registered"
  - factory_verified: "Your factory is verified"
  - new_order: "New order received"
  - production_request: "Start production for session X"

System:
  - general_announcement
  - maintenance_alert
  - promotion_alert
```

### Create Notification

```
┌─────────────────────────────────────────────────────────────────┐
│ SERVICE CREATES NOTIFICATION                                     │
└─────────────────────────────────────────────────────────────────┘

Any Service → Notification Service:
POST /api/notifications
{
  userId: "user-uuid",
  type: "payment_success",
  title: "Payment Received",
  message: "We've received your payment of Rp 1,000,000 for order ORD-12345",
  actionUrl: "/orders/order-uuid",
  relatedId: "order-uuid"       // For linking to related entity
}
       ↓
Notification Service: createNotification()

  STEP 1: Validate user exists
    Optional - can skip for system notifications

  STEP 2: Create notification record
    INSERT INTO notifications:
      user_id: userId
      type: type
      title: title
      message: message
      action_url: actionUrl
      related_id: relatedId
      is_read: false
      created_at: now

  STEP 3: (Future) Trigger real-time delivery
    - WebSocket push to connected clients
    - FCM push notification (mobile)
    - Email notification (for important events)
    ⚠️ Currently only saves to database

  Returns: Notification object
```

### User Reads Notifications

```
┌─────────────────────────────────────────────────────────────────┐
│ USER VIEWS NOTIFICATIONS                                         │
└─────────────────────────────────────────────────────────────────┘

User → GET /api/notifications/user/:userId?
  page=1&
  limit=20&
  unreadOnly=true
       ↓
Notification Service: getUserNotifications()

  Query:
    SELECT * FROM notifications
    WHERE user_id = userId
    AND (unreadOnly ? is_read = false : true)
    ORDER BY created_at DESC
    LIMIT 20 OFFSET 0

  Returns:
    {
      notifications: [...],
      pagination: {
        total,
        unread_count,
        page,
        limit
      }
    }
```

### Mark as Read

```
User clicks notification →
PATCH /api/notifications/:id/read
{
  userId: "user-uuid"    // For authorization
}
       ↓
Notification Service: markAsRead()

  UPDATE notifications
  SET is_read = true, read_at = now
  WHERE id = notificationId AND user_id = userId

  Returns: Updated notification
```

### Mark All as Read

```
User → PATCH /api/notifications/read-all
{
  userId: "user-uuid"
}
       ↓
Notification Service: markAllAsRead()

  UPDATE notifications
  SET is_read = true, read_at = now
  WHERE user_id = userId AND is_read = false

  Returns: { updated_count }
```

### Delete Notification

```
User → DELETE /api/notifications/:id
{
  userId: "user-uuid"
}
       ↓
Notification Service: deleteNotification()

  DELETE FROM notifications
  WHERE id = notificationId AND user_id = userId

  Returns: 204 No Content
```

### Notification Flow Examples

```
EXAMPLE 1: Order Payment Flow
  Payment received →
    Notification: "Payment successful for order X"
  Order confirmed →
    Notification: "Your order has been confirmed"
  Shipment created →
    Notification: "Your order is being prepared"
  Shipment picked up →
    Notification: "Your order is on the way"
  Shipment delivered →
    Notification: "Your order has been delivered"

EXAMPLE 2: Group Buying Flow
  User joins →
    Notification: "You've joined session X"
  MOQ reached →
    Notification (all participants): "MOQ reached!"
  Session expires (success) →
    Notification: "Session successful - order created"
    Notification: "Rp X credited to wallet (tier discount)"
  Session expires (failure) →
    Notification: "Session failed - refund processed"

EXAMPLE 3: Refund Flow
  Refund requested →
    Notification: "Refund request received"
  Refund processing →
    Notification: "Refund is being processed"
  Refund completed →
    Notification: "Refund of Rp X sent to your account"
```

---

## 19. SERVICE COMMUNICATION MAP

```
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE DEPENDENCY GRAPH                     │
└─────────────────────────────────────────────────────────────────┘

USER/FRONTEND
    │
    ├──→ PRODUCT SERVICE (3002)
    │    ├─→ FACTORY SERVICE (validate factory)
    │    ├─→ CATEGORY SERVICE (validate category)
    │    └─→ Database (products, variants, images)
    │
    ├──→ CATEGORY SERVICE (3002)
    │    └─→ Database (categories hierarchy)
    │
    ├──→ FACTORY SERVICE (3003)
    │    ├─→ NOTIFICATION SERVICE (registration, verification)
    │    └─→ Database (factories, verification status)
    │
    ├──→ ORDER SERVICE (3005)
    │    ├─→ PRODUCT SERVICE (get prices, factory info)
    │    ├─→ ADDRESS SERVICE (get default address)
    │    ├─→ PAYMENT SERVICE (create payment)
    │    └─→ NOTIFICATION SERVICE (order created)
    │
    ├──→ GROUP BUYING SERVICE (3004)
    │    ├─→ PAYMENT SERVICE (escrow, release, refund)
    │    ├─→ WAREHOUSE SERVICE (fulfill demand)
    │    ├─→ WALLET SERVICE (tier refunds)
    │    ├─→ ORDER SERVICE (bulk create)
    │    └─→ NOTIFICATION SERVICE (all events)
    │
    ├──→ PAYMENT SERVICE (3006)
    │    ├─→ TRANSACTION LEDGER SERVICE (record all transactions)
    │    ├─→ REFUND SERVICE (process refunds)
    │    ├─→ NOTIFICATION SERVICE (payment success/failure)
    │    ├─→ WALLET SERVICE (refund to wallet option)
    │    └─→ Xendit API (invoices, refunds)
    │
    ├──→ LOGISTICS SERVICE (3008)
    │    ├─→ Biteship API (rates, create shipment, tracking)
    │    ├─→ ORDER SERVICE (update status)
    │    └─→ NOTIFICATION SERVICE (shipment updates)
    │
    ├──→ WALLET SERVICE (3010)
    │    ├─→ NOTIFICATION SERVICE (wallet updates)
    │    └─→ Xendit Disbursement API (withdrawals - ⚠️ NOT IMPLEMENTED)
    │
    ├──→ ADDRESS SERVICE (3009)
    │    └─→ Database (user addresses)
    │
    └──→ NOTIFICATION SERVICE (3007)
         ├─→ Database (notifications)
         └─→ (Future) WebSocket/FCM (real-time push)

WAREHOUSE SERVICE (3011)
    ├─→ LOGISTICS SERVICE (calculate shipping costs)
    ├─→ WHATSAPP SERVICE (notify factory of POs)
    └─→ Database (inventory, purchase orders, grosir config)

WHATSAPP SERVICE (3012)
    └─→ Baileys WhatsApp Client (send messages - ⚠️ PARTIALLY IMPLEMENTED)

TRANSACTION LEDGER SERVICE (within Payment Service)
    └─→ Database (financial audit trail)

REFUND SERVICE (within Payment Service)
    ├─→ Xendit Refund API
    ├─→ TRANSACTION LEDGER SERVICE
    └─→ NOTIFICATION SERVICE

EXTERNAL WEBHOOKS:
    Xendit → PAYMENT SERVICE (payment/refund updates)
    Biteship → LOGISTICS SERVICE (shipment tracking)

NOT IMPLEMENTED:
    ❌ SETTLEMENT SERVICE (factory payouts)
    ❌ SELLER SERVICE (direct seller inventory)
    ❌ REVIEW SERVICE (product reviews)
```

### Critical Service Dependencies:

**Group Buying Service** depends on:
- Payment Service (critical - can't operate without)
- Warehouse Service (critical - can't fulfill without)
- Order Service (critical - can't complete without)
- Wallet Service (important - for tier refunds)
- Notification Service (nice to have)

**Order Service** depends on:
- Payment Service (critical - can't accept orders without)
- Product Service (critical - for pricing)
- Address Service (important - for shipping)

**Warehouse Service** depends on:
- Logistics Service (important - for shipping costs)
- WhatsApp Service (nice to have - for factory notifications)

---

## 11. CRITICAL FIXES APPLIED

### Fix #1: ORDER SERVICE - Payment Amount Bug

**File:** `services/order-service/src/services/order.service.ts:88`

**Problem:**
```typescript
// BEFORE (❌ WRONG):
const totalAmount = Number(order.subtotal || 0);
```

**Impact:**
- Payment only included item subtotal
- Shipping, tax, discounts NOT included
- Platform losing money on every order

**Fix:**
```typescript
// AFTER (✅ FIXED):
const totalAmount = Number(order.total_amount || 0);
```

**Result:**
- Payment now includes full amount: subtotal + shipping + tax - discount
- Financial accuracy restored

---

### Fix #2: GROUP BUYING - Double Bot Creation

**File:** `services/group-buying- service/src/services/group.buying.service.ts:1542`

**Problem:**
- Bot created at T-10min by `processSessionsNearingExpiration()`
- Bot created again at expiration by `processExpiredSessions()`
- Result: Two bots, wrong MOQ calculation

**Fix:**
```typescript
// Check if bot already exists (from near-expiration processing)
const existingBot = fullSession.group_participants.find(p => p.is_bot_participant);

// If < 25%, create bot to fill to 25% (only if doesn't already exist)
if (realFillPercentage < 25 && !existingBot) {
  // Create bot
} else if (existingBot) {
  logger.info('Bot already exists from near-expiration processing, skipping creation');
}
```

**Result:**
- Only one bot per session
- Accurate MOQ calculations

---

### Fix #3: GROUP BUYING - Bot Payment Record

**Files:**
- `services/group-buying- service/src/services/group.buying.service.ts:1397`
- `services/group-buying- service/src/services/group.buying.service.ts:1590`

**Problem:**
- Bot participant created WITHOUT payment record
- MOQ calculation only counts participants with paid payments
- Bot never counted toward MOQ
- Sessions failed even with bot

**Fix:**
```typescript
// CRITICAL FIX: Create payment record for bot so it's counted in MOQ
// Bot payment amount is 0 since no real money is paid (bot is just illusion)
await prisma.payments.create({
  data: {
    user_id: botUserId,
    group_session_id: session.id,
    participant_id: botParticipant.id,
    payment_method: 'platform_bot',
    payment_status: 'paid',
    order_amount: 0,  // No real money
    total_amount: 0,  // No real money
    currency: 'IDR',
    payment_code: `BOT-${session.session_code}-${Date.now()}`,
    is_in_escrow: false,
    paid_at: new Date(),
    gateway_response: JSON.stringify({
      type: 'bot_payment',
      auto_paid: true,
      note: 'Virtual payment - bot participant for MOQ fill'
    })
  }
});
```

**Result:**
- Bot now counts toward MOQ (has 'paid' payment)
- Bot payment amount = 0 (no financial impact)
- Sessions complete correctly with bot

---

### Fix #4: GROUP BUYING - Warehouse Excludes Bot

**File:** `services/group-buying- service/src/services/group.buying.service.ts:897`

**Problem:**
- Warehouse demand calculation included bot
- Warehouse would order inventory for bot units
- Bot units would create excess inventory

**Fix:**
```typescript
// Get all variant quantities from REAL participants who have PAID (exclude bot)
const participants = await prisma.group_participants.findMany({
  where: {
    group_session_id: sessionId,
    is_bot_participant: false,  // ✅ Exclude bot
    payments: {
      some: {
        payment_status: 'paid'
      }
    }
  }
});
```

**Result:**
- Warehouse only orders for real participant demand
- Bot truly "just illusion" - no inventory impact

---

## 21. IMPLEMENTATION STATUS SUMMARY

### ✅ FULLY IMPLEMENTED & WORKING

#### Core Business Logic
- **Regular Product Orders**: Complete flow from creation to payment to fulfillment
- **Group Buying Sessions**: Full lifecycle including joining, MOQ validation, expiration handling
- **Bot Participant System**: Automatic 25% fill guarantee, proper cleanup, no financial impact
- **Grosir Bundle Allocation**: Variant balancing, tolerance checking, availability calculation
- **Warehouse Integration**: Bundle demand fulfillment, PO creation, inventory management
- **Tiered Pricing**: Dynamic pricing based on MOQ fill percentage
- **Escrow System**: Payment holding, conditional release, proper refund handling

#### Product & Factory Management
- **Product CRUD**: Create, read, update, delete products
- **Product Variants**: Size, color, and other variant management
- **Product Publishing**: Draft → Active lifecycle
- **Product Search & Filtering**: Category, search, status filters with pagination
- **Image Management**: Multiple images per product with ordering
- **Category Management**: Hierarchical categories with parent-child relationships
- **Factory Registration**: Complete onboarding flow
- **Factory Verification**: Admin approval process
- **Factory Status Management**: Pending → Verified → Active lifecycle

#### Payment & Financial
- **Xendit Integration**: Invoice creation, payment webhooks
- **Payment Processing**: Multiple payment methods (bank transfer, e-wallet, etc.)
- **Escrow Management**: Hold funds until session completion
- **Refund Processing**: Automatic and manual refunds via Xendit
- **Transaction Ledger**: Complete audit trail of all financial transactions
- **Webhook Handling**: Xendit payment/refund status updates
- **Duplicate Prevention**: webhook_events table prevents double-processing

#### Customer Management
- **Address Management**: CRUD operations for shipping addresses
- **Default Address**: Automatic default handling
- **Address Validation**: Complete field validation

#### Wallet System
- **Wallet Creation**: Auto-create on first use
- **Balance Management**: Credit/debit with atomic operations
- **Tier Refunds**: Automatic credits for group buying discounts
- **Transaction History**: Complete wallet transaction log
- **Withdrawal Requests**: Create and track withdrawal requests

#### Logistics & Shipping
- **Biteship Integration**: Rate calculation and shipment booking
- **Two-Leg Shipping**: Factory→Warehouse + Warehouse→Customer
- **Tracking**: Shipment status tracking via webhooks
- **Cost Calculation**: Per-unit bulk shipping + individual delivery

#### Notifications
- **Notification Creation**: All services can create notifications
- **Notification Types**: Order, payment, refund, group buying, wallet, factory events
- **Notification Management**: Mark read, delete, read all
- **User Notifications**: Paginated list with unread count

### ⚠️ PARTIALLY IMPLEMENTED

#### WhatsApp Service (60% Complete)
**Working:**
- Message queue system
- WhatsApp client initialization
- Message records in database

**Missing:**
- Baileys WhatsApp client not actually sending messages
- Messages saved to DB but not delivered
- No QR code authentication flow
- No connection management

**Impact:** Factory notifications for purchase orders not sent

#### Wallet Withdrawals (80% Complete)
**Working:**
- Withdrawal request creation
- Balance deduction
- Fee calculation
- Admin approval UI flow

**Missing:**
- Xendit Disbursement API integration
- Actual money transfer to bank accounts
- Admin can only mark as 'processing' without sending funds

**Impact:** Users cannot actually withdraw wallet balance to bank

### ❌ NOT IMPLEMENTED

#### Settlement Service (0% Complete)
**Purpose:** Pay factories for completed orders

**Missing:**
- Periodic payout calculation (weekly/monthly)
- Factory earnings aggregation
- Payout schedule management
- Bank transfer to factories
- Settlement reports

**Impact:** Manual process required to pay factories

**Notes:**
- Transaction ledger tracks all data needed
- `recordSettlement()` method exists but unused
- API endpoints don't exist
- Service directory doesn't exist

#### Seller Service (5% Complete)
**Purpose:** Traditional seller inventory (not group buying)

**Status:**
- Only package.json exists
- No source code
- Part of "Dual Business Model" but not prioritized

**Notes:**
- Platform currently focuses on factory group buying
- Seller inventory model planned for future
- Would allow sellers to list pre-made inventory

#### Review Service (0% Complete)
**Purpose:** Product reviews and ratings

**Status:**
- Empty directory with only .gitkeep
- No code written
- No database schema

**Missing:**
- Review CRUD operations
- Rating system
- Review moderation
- Review display on products

#### Real-Time Notifications (0% Complete)
**Missing:**
- WebSocket server for live updates
- FCM (Firebase Cloud Messaging) for mobile push
- Email notifications
- SMS notifications

**Current:** Notifications only saved to database

### 🐛 KNOWN ISSUES & FIXES NEEDED

#### Critical Fixes Already Applied (✅ Fixed)
1. ✅ **Order Service Payment Amount Bug** - Was charging subtotal only, now charges total_amount
2. ✅ **Group Buying Double Bot Creation** - Bot now created only once
3. ✅ **Bot Payment Record Missing** - Bot now has $0 payment to count toward MOQ
4. ✅ **Warehouse Including Bot Demand** - Warehouse now excludes bot from inventory calculations

#### Outstanding Issues

**1. Pending Stock Webhook (Medium Priority)**
- **Issue:** Sessions stuck in 'pending_stock' status
- **Cause:** Warehouse orders from factory, no callback when stock arrives
- **Solution Needed:** Factory webhook or admin manual completion
- **Workaround:** Admin manually updates session status

**2. Warehouse Audit Log (Compliance)**
- **Issue:** No tracking of who modified inventory
- **Impact:** Cannot audit inventory changes
- **Solution Needed:** Add audit_log table or use transaction ledger

**3. Cron Job Reliability**
- **Current:** Node cron for session expiration
- **Risk:** Single point of failure, no retry mechanism
- **Recommendation:** Move to dedicated job scheduler (BullMQ, Agenda)

### 📊 SERVICE COMPLETENESS MATRIX

| Service | Implementation | Tests | Documentation |
|---------|---------------|-------|---------------|
| Product Service | 100% | ❌ | ✅ (Swagger) |
| Category Service | 100% | ❌ | ✅ (Swagger) |
| Factory Service | 100% | ❌ | ✅ (Swagger) |
| Order Service | 100% | ❌ | ✅ (Swagger) |
| Group Buying Service | 100% | ❌ | ✅ (Swagger) |
| Payment Service | 100% | ❌ | ✅ (Swagger) |
| Refund Service | 100% | ❌ | ✅ (Inline) |
| Transaction Ledger | 100% | ❌ | ✅ (Inline) |
| Warehouse Service | 95% | ❌ | ✅ (Swagger) |
| Logistics Service | 100% | ❌ | ✅ (Swagger) |
| Address Service | 100% | ❌ | ✅ (Swagger) |
| Wallet Service | 80% | ❌ | ✅ (Swagger) |
| Notification Service | 100% | ❌ | ✅ (Swagger) |
| WhatsApp Service | 60% | ❌ | ⚠️ (Partial) |
| Auth Service | 100% | ❌ | ✅ (Swagger) |
| Settlement Service | 0% | ❌ | ❌ |
| Seller Service | 5% | ❌ | ❌ |
| Review Service | 0% | ❌ | ❌ |

**Legend:**
- ✅ Complete
- ⚠️ Partial
- ❌ Missing/None

### 🎯 RECOMMENDED PRIORITIES

#### High Priority (Critical for Operations)
1. **Wallet Withdrawals** - Implement Xendit disbursement
2. **WhatsApp Integration** - Complete Baileys client setup
3. **Settlement Service** - Build factory payout system

#### Medium Priority (Important for Scalability)
4. **Pending Stock Webhook** - Auto-complete sessions
5. **Warehouse Audit Log** - Compliance requirement
6. **Cron Job Migration** - Move to BullMQ/Agenda

#### Low Priority (Future Features)
7. **Review Service** - Build rating system
8. **Seller Service** - Traditional inventory model
9. **Real-Time Notifications** - WebSocket/FCM
10. **Email Notifications** - Important events

---

**Document Version:** 2.0
**Last Updated:** November 17, 2025
**Author:** Claude Code Assistant
**Branch:** `claude/review-backend-logic-flow-011CV2AXqzc32N6rccnM3qhF`
**Scope:** Complete Backend Logical Flow (excluding Auth, WhatsApp details, Security implementations)
