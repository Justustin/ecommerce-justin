# Business Logic Implementation - Order Flows

## Overview

This document explains the business logic and implementation for:
1. Regular Product Orders
2. Group Buying Orders (with Grosir Allocation System)

---

## 1. REGULAR PRODUCT ORDER

### Business Logic

User buys a product directly from the catalog at regular price.

### Implementation Flow

```
USER ACTION: Click "Buy Now" on Product
  ↓
FRONTEND: POST /api/orders
  ↓
ORDER SERVICE: createOrder()
  │
  ├─ Validates items and address
  ├─ Gets product prices from database
  ├─ Groups items by factory
  ├─ Creates order records in database
  │
  └─ Calls: PAYMENT SERVICE
      POST /api/payments
      {
        orderId: "uuid",
        userId: "uuid",
        amount: 100000,
        paymentMethod: "bank_transfer"
      }
  ↓
PAYMENT SERVICE: createPayment()
  │
  ├─ Creates Xendit invoice
  ├─ Saves payment record (status: pending)
  │
  └─ Returns payment URL to frontend
  ↓
USER: Pays via Xendit
  ↓
XENDIT: Sends webhook
  POST /api/webhooks/xendit
  ↓
PAYMENT SERVICE: handlePaidCallback()
  │
  ├─ Marks payment as paid
  ├─ Updates order status to 'paid' (database)
  ├─ Records transaction in ledger
  │
  └─ Calls: NOTIFICATION SERVICE
      POST /api/notifications
      { type: 'payment_success', userId, message }
  ↓
LOGISTICS SERVICE: (triggered separately)
  createShipment()
  │
  └─ Creates shipment via Biteship API
```

### Key Functions Called

**Order Service:**
- `createOrder(data)` - Main entry point
- `OrderUtils.getProductPrice()` - Gets product pricing
- `OrderRepository.createOrder()` - Saves to database

**Payment Service:**
- `createPayment(data)` - Creates Xendit invoice
- `handlePaidCallback(callbackData)` - Processes webhook
- `TransactionLedgerService.recordPaymentReceived()` - Audit trail

**Notification Service:**
- `sendNotification()` - Sends push notification

---

## 2. GROUP BUYING ORDER

### Business Logic

Users join a group buying session. When MOQ (minimum order quantity) is reached:
1. Check if warehouse has stock
2. If yes → Reserve stock, create orders
3. If no → Warehouse creates purchase order and sends WhatsApp to factory, wait for stock

### Implementation Flow - User Joins Group

```
USER ACTION: Click "Join Group Buying"
  ↓
FRONTEND: POST /api/group-sessions/:id/join
  ↓
GROUP BUYING SERVICE: joinSession()
  │
  ├─ Validates session is active
  ├─ Validates variant availability (GROSIR CHECK)
  │   │
  │   └─ getVariantAvailability(sessionId, variantId)
  │       │
  │       ├─ Queries grosir_variant_allocations table
  │       ├─ Counts existing orders for this variant
  │       ├─ Calculates: maxAllowed = allocation × 2
  │       ├─ Calculates: available = maxAllowed - totalOrdered
  │       │
  │       └─ Returns: { available, isLocked }
  │
  ├─ If variant locked → Throw error
  ├─ Creates group participant record
  │
  └─ Calls: PAYMENT SERVICE
      POST /api/payments/escrow
      {
        userId: "uuid",
        groupSessionId: "uuid",
        participantId: "uuid",
        amount: 50000,
        factoryId: "uuid"
      }
  ↓
PAYMENT SERVICE: createEscrowPayment()
  │
  ├─ Creates Xendit invoice
  ├─ Saves payment (is_in_escrow: true)
  │
  └─ Returns payment URL
  ↓
USER: Pays via Xendit
  ↓
XENDIT: Sends webhook
  ↓
PAYMENT SERVICE: handlePaidCallback()
  │
  ├─ Marks payment as paid
  ├─ Keeps is_in_escrow: true (money held)
  │
  └─ Does NOT create order yet (escrow held)
```

### Implementation Flow - MOQ Reached (Cron Job)

```
CRON JOB: Every hour, check expired sessions
  ↓
GROUP BUYING SERVICE: processExpiredSessions()
  │
  ├─ Finds sessions where end_time <= now
  ├─ Checks if MOQ reached
  │
  └─ For each successful session:
      │
      ├─ Atomic status update to 'moq_reached'
      │
      └─ fulfillWarehouseDemand(sessionId)
          │
          ├─ Gets all participant orders grouped by variant
          │
          └─ Calls: WAREHOUSE SERVICE (for each variant)
              POST /api/warehouse/fulfill-demand
              {
                productId: "uuid",
                variantId: "uuid",
                quantity: 24,
                wholesaleUnit: 12
              }
              ↓
              WAREHOUSE SERVICE: fulfillDemand()
                │
                ├─ Queries warehouse_inventory for stock
                │
                ├─ IF STOCK AVAILABLE:
                │   │
                │   ├─ Updates inventory:
                │   │   available_quantity -= quantity
                │   │   reserved_quantity += quantity
                │   │
                │   └─ Returns: { hasStock: true, reserved: 24 }
                │
                └─ IF STOCK INSUFFICIENT:
                    │
                    ├─ Calculates needed = quantity - currentStock
                    ├─ Rounds to wholesale: factoryOrderQty = ceil(needed/12) × 12
                    │
                    ├─ Calls: LOGISTICS SERVICE
                    │   POST /api/rates
                    │   (calculates shipping cost)
                    │
                    ├─ Creates purchase order in database
                    │
                    ├─ Calls: WHATSAPP SERVICE
                    │   POST /api/whatsapp/send
                    │   {
                    │     phoneNumber: factory.phone_number,
                    │     message: "PO-xxx: Need 24 units..."
                    │   }
                    │
                    └─ Returns: {
                        hasStock: false,
                        grosirUnitsNeeded: 2,
                        purchaseOrder: {...}
                      }
          ↓
          GROUP BUYING SERVICE: (continues)
            │
            ├─ Checks results from all variants
            │
            ├─ IF ALL IN STOCK:
            │   │
            │   └─ Calls: ORDER SERVICE
            │       POST /api/orders/bulk
            │       {
            │         groupSessionId: "uuid",
            │         participants: [
            │           { userId, productId, variantId, quantity },
            │           ...
            │         ]
            │       }
            │       ↓
            │       ORDER SERVICE: createBulkOrders()
            │         │
            │         ├─ Creates order for each participant
            │         ├─ Does NOT create payments (already exist in escrow)
            │         │
            │         └─ Returns: { ordersCreated: 15 }
            │       ↓
            │       GROUP BUYING SERVICE: (continues)
            │         │
            │         └─ Calls: PAYMENT SERVICE
            │             POST /api/payments/release-escrow
            │             { groupSessionId: "uuid" }
            │             ↓
            │             PAYMENT SERVICE: releaseEscrow()
            │               │
            │               ├─ Finds all escrow payments for session
            │               ├─ Updates: is_in_escrow = false
            │               ├─ Updates: escrow_released_at = now
            │               ├─ Records in transaction ledger
            │               │
            │               └─ Returns: { paymentsReleased: 15 }
            │
            └─ IF STOCK INSUFFICIENT:
                │
                ├─ Updates session: status = 'pending_stock'
                ├─ Updates: factory_whatsapp_sent = true
                │
                └─ Waits for factory to send stock
                    (Orders NOT created yet)
```

### Implementation Flow - MOQ Failed

```
CRON JOB: Checks expired sessions
  ↓
GROUP BUYING SERVICE: processExpiredSessions()
  │
  ├─ Session expired but MOQ not reached
  │
  └─ Calls: PAYMENT SERVICE
      POST /api/payments/refund-session
      { groupSessionId: "uuid" }
      ↓
      PAYMENT SERVICE: refundSession()
        │
        ├─ Finds all paid payments for session
        │
        └─ For each payment:
            │
            ├─ Creates refund record
            ├─ Processes refund via Xendit
            ├─ Updates payment: status = 'refunded'
            ├─ Records in transaction ledger
            │
            └─ Calls: NOTIFICATION SERVICE
                POST /api/notifications
                {
                  type: 'group_failed',
                  message: 'Refund processed'
                }
```

---

## 3. GROSIR ALLOCATION SYSTEM

### Business Logic

Products sold in "grosir" (wholesale) units with specific variant distribution.

**Example:** Shirt sold in grosir of 12
- 4 Small + 4 Medium + 4 Large + 4 XL = 12 total

**Rule:** Each variant can only be ordered up to 2× its allocation
- Small allocation = 4 → Max allowed = 8
- If 8 Small already ordered → Small is LOCKED
- Unlocks when other variants catch up

### Database Schema

```sql
-- Table: grosir_variant_allocations
CREATE TABLE grosir_variant_allocations (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL,
  variant_id UUID,
  allocation_quantity INT NOT NULL,  -- e.g., 4

  UNIQUE(product_id, variant_id)
);

-- Example data:
INSERT INTO grosir_variant_allocations VALUES
  ('...', 'shirt-123', 'small-id',  4),
  ('...', 'shirt-123', 'medium-id', 4),
  ('...', 'shirt-123', 'large-id',  4),
  ('...', 'shirt-123', 'xl-id',     4);

-- Table: products (new column)
ALTER TABLE products ADD COLUMN grosir_unit_size INT;
-- Example: 12 (total units per grosir)
```

### Implementation

**Function:** `GroupBuyingService.getVariantAvailability(sessionId, variantId)`

```typescript
async getVariantAvailability(sessionId: string, variantId: string | null) {
  // 1. Get allocation for this variant
  const allocation = await prisma.grosir_variant_allocations.findUnique({
    where: {
      product_id_variant_id: {
        product_id: session.product_id,
        variant_id: variantId
      }
    }
  });
  // allocation_quantity = 4 (for example)

  // 2. Count how many already ordered
  const participants = await prisma.group_participants.findMany({
    where: {
      group_session_id: sessionId,
      variant_id: variantId
    }
  });

  const totalOrdered = participants.reduce((sum, p) => sum + p.quantity, 0);
  // totalOrdered = 5 (for example)

  // 3. Calculate availability
  const maxAllowed = allocation.allocation_quantity * 2;  // 4 × 2 = 8
  const available = maxAllowed - totalOrdered;            // 8 - 5 = 3

  // 4. Return result
  return {
    allocation: 4,
    maxAllowed: 8,
    totalOrdered: 5,
    available: 3,
    isLocked: false  // (available > 0)
  };
}
```

**Called From:** `joinSession()` before allowing user to join

```typescript
async joinSession(data: JoinGroupDTO) {
  // ...validation...

  // GROSIR CHECK
  if (data.variantId) {
    const variantAvail = await this.getVariantAvailability(
      data.groupSessionId,
      data.variantId
    );

    if (variantAvail.isLocked) {
      throw new Error('Variant is currently locked');
    }

    if (data.quantity > variantAvail.available) {
      throw new Error(`Only ${variantAvail.available} units available`);
    }
  }

  // Continue with join...
}
```

### User Experience Example

**Scenario:** T-Shirt group buying (grosir = 12, allocation per size = 4)

```
User A: Orders 5 Medium
  → getVariantAvailability() → available: 3 (8-5)
  → ✅ Success

User B: Orders 4 Medium
  → getVariantAvailability() → available: 3
  → ❌ Error: "Only 3 units available"

User B: Orders 3 Medium
  → getVariantAvailability() → available: 3
  → ✅ Success
  → totalOrdered = 8, available = 0
  → isLocked = true

User C: Orders 1 Medium
  → getVariantAvailability() → isLocked: true
  → ❌ Error: "Variant is currently locked, other sizes need to catch up"

User C: Orders 5 Small
  → getVariantAvailability(Small) → available: 8 (no orders yet)
  → ✅ Success
  → Now Small has 5, Medium has 8 (Medium unlocked!)

User D: Orders 1 Medium
  → getVariantAvailability() → available: 0 (8-8)
  → ❌ Still locked (Small needs to reach 8 first)
```

---

## 4. KEY DIFFERENCES: Regular vs Group Buying

| Aspect | Regular Order | Group Buying |
|--------|--------------|--------------|
| **Payment** | Direct payment | Escrow payment (held) |
| **Order Creation** | Immediately after payment | Only after MOQ reached |
| **Pricing** | Regular base_price | Discounted group_price |
| **Inventory Check** | At order time | At MOQ time (warehouse) |
| **Variant Limits** | No limits | 2× allocation limit |
| **Refund** | Manual only | Automatic if MOQ fails |

---

## 5. CRITICAL FUNCTION CALL CHAINS

### Regular Order
```
Frontend
  → OrderService.createOrder()
    → PaymentService.createPayment()
      → Xendit creates invoice
        → User pays
          → PaymentService.handlePaidCallback()
            → NotificationService.sendNotification()
```

### Group Buying - Success Path
```
Frontend
  → GroupBuyingService.joinSession()
    → GroupBuyingService.getVariantAvailability()
      → PaymentService.createEscrowPayment()
        → User pays (escrow held)
          → (Cron job runs)
            → GroupBuyingService.processExpiredSessions()
              → GroupBuyingService.fulfillWarehouseDemand()
                → WarehouseService.fulfillDemand()
                  → [if no stock] WhatsAppService.send()
                  → [if has stock] reserves inventory
                    → OrderService.createBulkOrders()
                      → PaymentService.releaseEscrow()
```

### Group Buying - Failure Path
```
(Cron job runs)
  → GroupBuyingService.processExpiredSessions()
    → MOQ not reached
      → PaymentService.refundSession()
        → RefundService.createRefund()
          → RefundService.processRefund()
            → NotificationService.sendNotification()
```

---

## 6. WAREHOUSE INTEGRATION (KEY DETAIL)

**When MOQ is reached**, Group Buying doesn't check stock directly.
It delegates to Warehouse Service:

```
GroupBuyingService.fulfillWarehouseDemand()
  │
  └─ For each variant ordered:
      │
      └─ POST /api/warehouse/fulfill-demand
          {
            productId: "uuid",
            variantId: "uuid",
            quantity: 24,
            wholesaleUnit: 12
          }

WarehouseService.fulfillDemand() handles EVERYTHING:
  1. Checks inventory
  2. Reserves stock if available
  3. Creates purchase order if insufficient
  4. Sends WhatsApp to factory if insufficient
  5. Returns result
```

**Group Buying Service** just:
- Calls warehouse
- Checks if all variants have stock
- Creates orders if yes, waits if no

**Warehouse Service** is responsible for:
- Inventory management
- Factory communication
- Purchase order creation

---

## Summary

**Regular Order:** Simple, direct payment → order → ship

**Group Buying:**
1. Users join (variant limits checked)
2. Payments held in escrow
3. MOQ reached → Warehouse checks stock
4. Stock available → Orders created, escrow released
5. Stock insufficient → Factory notified, wait
6. MOQ failed → Automatic refunds

**Grosir System:** Enforces 2× allocation limit per variant to maintain balanced wholesale orders

---

**Last Updated:** 2025-11-03
