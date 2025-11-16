# COMPREHENSIVE BACKEND FLOW SUMMARY

**Date:** November 16, 2025
**Status:** After Critical Fixes Applied
**Branch:** `claude/review-backend-logic-flow-011CV2AXqzc32N6rccnM3qhF`

---

## TABLE OF CONTENTS

1. [Business Model Overview](#business-model-overview)
2. [Two-Entity Structure](#two-entity-structure)
3. [Regular Product Order Flow](#1-regular-product-order-flow)
4. [Group Buying Flow - Happy Path](#2-group-buying-flow---happy-path-moq-reached)
5. [Group Buying Flow - Failure Path](#3-group-buying-flow---failure-path-moq-not-reached)
6. [Bot Participant Logic](#4-bot-participant-logic)
7. [Grosir Allocation System](#5-grosir-allocation-system)
8. [Warehouse Integration Flow](#6-warehouse-integration-flow)
9. [Payment & Escrow Flow](#7-payment--escrow-flow)
10. [Shipping & Logistics Flow](#8-shipping--logistics-flow)
11. [Wallet & Refund Flow](#9-wallet--refund-flow)
12. [Service Communication Map](#10-service-communication-map)
13. [Critical Fixes Applied](#11-critical-fixes-applied)

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

STEP 6: Check if MOQ Reached
  After each join, checks:
    currentQuantity = sum of all REAL paid participants
    if (currentQuantity >= targetMoq):
      Send notification: "MOQ reached! Session closing soon"
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

  CASE 1: Zero Participants
    Mark as 'failed'
    Create identical session for tomorrow (midnight start)
    Purpose: Ensure product always available

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
  Based on REAL participant fill percentage:

  realQuantity = sum(realParticipants.quantity)
  fillPercentage = (realQuantity / targetMoq) × 100

  Tiers:
    >= 100% → tier = 100, price = price_tier_100
    >= 75%  → tier = 75,  price = price_tier_75
    >= 50%  → tier = 50,  price = price_tier_50
    >= 25%  → tier = 25,  price = price_tier_25

  (Bot NOT included in calculation)

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

## 3. GROUP BUYING FLOW - FAILURE PATH (MOQ Not Reached)

```
┌─────────────────────────────────────────────────────────────────┐
│ CRON JOB: processExpiredSessions() - MOQ Failed                 │
└─────────────────────────────────────────────────────────────────┘

Session expired but currentQuantity < targetMoq

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

### Purpose: "Just Illusion"

Bot exists ONLY to:
- ✅ Make UI show 25% minimum fill (makes session look viable)
- ✅ Count toward MOQ calculation (allows session to complete)

Bot does NOT:
- ❌ Trigger warehouse to order inventory
- ❌ Get real order created
- ❌ Involve any real money (payment = $0)
- ❌ Appear in any reports/analytics
- ❌ Get notifications

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

FILTERING BOT:
  ✅ Line 897:  fulfillWarehouseDemand() excludes bot
  ✅ Line 1528: Tier calculation uses real participants only
  ✅ Line 1654: Refunds issued to real participants only
  ✅ Line 1704: Bot deleted before creating orders
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

## 7. PAYMENT & ESCROW FLOW

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

## 10. SERVICE COMMUNICATION MAP

```
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE DEPENDENCY GRAPH                     │
└─────────────────────────────────────────────────────────────────┘

USER/FRONTEND
    │
    ├──→ PRODUCT SERVICE (3002)
    │    └─→ Database (products, variants, images)
    │
    ├──→ ORDER SERVICE (3005)
    │    ├─→ PRODUCT SERVICE (get prices, factory info)
    │    ├─→ ADDRESS SERVICE (get default address)
    │    └─→ PAYMENT SERVICE (create payment)
    │
    ├──→ GROUP BUYING SERVICE (3004)
    │    ├─→ PAYMENT SERVICE (escrow, release, refund)
    │    ├─→ WAREHOUSE SERVICE (fulfill demand)
    │    ├─→ WALLET SERVICE (tier refunds)
    │    ├─→ ORDER SERVICE (bulk create)
    │    └─→ NOTIFICATION SERVICE (all events)
    │
    ├──→ PAYMENT SERVICE (3006)
    │    ├─→ NOTIFICATION SERVICE (payment success/failure)
    │    ├─→ WALLET SERVICE (refund to wallet option)
    │    └─→ Transaction Ledger (audit trail)
    │
    ├──→ LOGISTICS SERVICE (3008)
    │    ├─→ Biteship API (rates, create shipment, tracking)
    │    ├─→ ORDER SERVICE (update status)
    │    └─→ NOTIFICATION SERVICE (shipment updates)
    │
    ├──→ WALLET SERVICE (3010)
    │    └─→ Xendit Disbursement API (withdrawals - NOT IMPLEMENTED)
    │
    └──→ ADDRESS SERVICE (3009)
         └─→ Database (user addresses)

WAREHOUSE SERVICE (3011)
    ├─→ LOGISTICS SERVICE (calculate shipping costs)
    ├─→ WHATSAPP SERVICE (notify factory of POs)
    └─→ Database (inventory, purchase orders)

WHATSAPP SERVICE (3012)
    └─→ Baileys WhatsApp Client (send messages - PARTIALLY IMPLEMENTED)

PAYMENT SERVICE WEBHOOKS
    ← Xendit (payment status updates)

LOGISTICS SERVICE WEBHOOKS
    ← Biteship (shipment tracking updates)
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

## SUMMARY

### What Works Correctly:

✅ **Regular Orders:** Create → Pay → Ship → Deliver
✅ **Group Buying:** Join → Escrow → MOQ → Orders → Release
✅ **Bot Logic:** Ensures 25% minimum, deleted after use, no financial/inventory impact
✅ **Grosir Allocation:** Prevents variant imbalance via warehouse tolerance
✅ **Warehouse Integration:** Bundle-based ordering, tolerance checking, PO creation
✅ **Payment & Escrow:** Secure holding, release on success, refund on failure
✅ **Two-Leg Shipping:** Factory→Warehouse + Warehouse→Customer costs tracked
✅ **Tier-Based Refunds:** Better fill % = lower price, difference refunded to wallet

### What Needs Work:

⚠️ **Wallet Withdrawals:** Admin approval doesn't actually send money (Xendit integration missing)
⚠️ **WhatsApp Sending:** Messages saved to DB but not actually sent (Baileys integration incomplete)
⚠️ **Warehouse Audit Log:** No tracking of who changed inventory (compliance issue)
⚠️ **Pending Stock Webhook:** Sessions stuck in pending_stock need webhook to complete
⚠️ **Seller Service:** Not implemented (95% missing)
⚠️ **Review Service:** Not implemented (0% complete)

---

**Generated:** November 16, 2025
**Author:** Claude Code Assistant
**Branch:** `claude/review-backend-logic-flow-011CV2AXqzc32N6rccnM3qhF`
