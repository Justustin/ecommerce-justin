# Group Buying Service Documentation

## Overview

The Group Buying Service enables collective purchasing where multiple customers pool orders to reach Minimum Order Quantities (MOQ) set by factories. This service implements dynamic tiered pricing, two-leg shipping cost allocation, and automated session lifecycle management.

**Port:** `3004`
**Base URL:** `http://localhost:3004/api/group-buying`
**Documentation:** `http://localhost:3004/api-docs`

---

## Core Business Logic

### 1. Tiered Pricing System

Group buying sessions use **dynamic pricing** that decreases as more real users join, incentivizing participation:

- **Tier 25%**: Price when 25% of MOQ is filled by real users (highest price)
- **Tier 50%**: Price when 50% of MOQ is filled
- **Tier 75%**: Price when 75% of MOQ is filled
- **Tier 100%**: Price when 100% of MOQ is filled (lowest price)

**Example:**
```javascript
// Session with targetMoq = 100
priceTier25: 150000   // When 25 real users join (25%)
priceTier50: 135000   // When 50 real users join (50%)
priceTier75: 120000   // When 75 real users join (75%)
priceTier100: 105000  // When 100 real users join (100%)
```

**Important Rules:**
- Tier prices must be in **descending order** (tier25 ≥ tier50 ≥ tier75 ≥ tier100)
- Bot participants are NOT counted toward tier progression
- Only **paid participants** count toward MOQ and tier calculation
- Price automatically updates when tier thresholds are crossed

---

### 2. Bot Auto-Join System

To ensure minimum viability, a **bot automatically joins sessions 10 minutes before expiration** if needed:

```javascript
// If targetMoq = 100 and real participants = 15 (15%)
botQuantity = Math.ceil(targetMoq * 0.25) - realQuantity  // 25 - 15 = 10 units
```

**Bot Behavior:**
- **NOT created during session creation** (sessions start at 0%)
- Created **10 minutes before expiration** by `/process-nearing-expiration` cron job
- Only created if:
  - At least 1 real participant exists
  - Real participant quantity < 25% of MOQ
  - Bot fills gap to exactly 25% MOQ
- Uses system bot user: `platform-bot@system.internal`
- Pays `price_tier_25` (not base price)
- Does NOT count toward tier progression
- Marked with `is_bot_participant: true` and `is_platform_order: true`
- Removed before order creation (no real order for bot)

**Special Case - Zero Participants:**
If session reaches 10 minutes before expiration with **zero participants**:
- Session marked as `failed`
- New identical session automatically created for next day (midnight start)
- This ensures continuous product availability

---

### 3. Two-Leg Shipping System

Shipping costs are split into two legs to handle bulk factory shipments:

#### **Leg 1: Factory → Warehouse (Bulk Shipping)**
- Admin enters **total bulk shipping cost** when creating session
- Cost is divided equally: `bulk_shipping_cost_per_unit = bulk_shipping_cost / target_moq`
- This column is **auto-calculated by database** (GENERATED COLUMN)
- Each user pays their share: `leg1Cost = bulk_shipping_cost_per_unit × quantity`

#### **Leg 2: Warehouse → Customer (Individual Shipping)**
- Calculated in real-time via Biteship API
- Based on user's shipping address and selected courier
- User chooses from 3 speed categories: `sameDay`, `express`, `regular`

#### **Total Shipping Cost**
```javascript
totalShipping = leg1Cost + leg2Cost
```

**Example:**
```javascript
// Session: targetMoq = 100, bulkShippingCost = 500,000
bulk_shipping_cost_per_unit = 500000 / 100 = 5000  // Auto-calculated

// User orders 10 units:
leg1Cost = 5000 × 10 = 50,000          // Factory → Warehouse share
leg2Cost = 15,000                       // Warehouse → User (from Biteship)
totalShipping = 50,000 + 15,000 = 65,000
```

---

### 4. Session Lifecycle

```
┌─────────────┐
│   forming   │  Initial state, accepting participants
└──────┬──────┘
       │
       ├──> (MOQ reached) ──────> moq_reached
       │
       └──> (Time expired)
              │
              ├──> (MOQ reached) ──> success → pending_stock → stock_received
              │
              └──> (MOQ not reached) ──> failed (refunds issued)

```

**Status Definitions:**

| Status | Description |
|--------|-------------|
| `forming` | Session is active, accepting participants |
| `moq_reached` | MOQ achieved before expiration, awaiting production |
| `pending_stock` | Production completed, goods in transit to warehouse |
| `stock_received` | Goods received at warehouse, ready for fulfillment |
| `success` | All orders fulfilled and delivered |
| `failed` | MOQ not reached at expiration, refunds issued |
| `cancelled` | Manually cancelled by admin |

---

## Payment Flow

### Join Session Payment Breakdown

When a user joins a session, payment includes:

```javascript
productPrice = unitPrice × quantity  // Always group_price (base price)
leg1Shipping = bulk_shipping_cost_per_unit × quantity
leg2Shipping = selectedShipping.price
gatewayFee = productPrice × 0.03  // 3% Xendit fee
totalAmount = productPrice + leg1Shipping + leg2Shipping + gatewayFee
```

**Example Payment:**
```json
{
  "productPrice": 500000,
  "leg1Shipping": 50000,
  "leg2Shipping": 15000,
  "gatewayFee": 15000,
  "totalAmount": 580000
}
```

**Critical:** Users ALWAYS pay `group_price` (base price) when joining. Price validation ensures:
```typescript
if(unitPrice !== session.group_price) {
    throw new Error('Invalid unit price'); // Prevents price manipulation
}
```

---

### Escrow Payment System

All payments are held in **escrow** until session is confirmed:

1. **Payment Creation:**
   ```json
   {
     "userId": "uuid",
     "groupSessionId": "uuid",
     "participantId": "uuid",
     "amount": 580000,
     "isEscrow": true,
     "factoryId": "uuid"
   }
   ```

2. **Escrow Hold Period:**
   - Payment status: `paid`
   - Money held by payment gateway (Xendit)
   - Cannot be transferred to factory yet
   - Factory ID tagged for later release

3. **Escrow Release (on production complete):**
   - Endpoint: `POST /api/payments/release-escrow`
   - Called from: `completeProduction()` method
   - Money transferred from escrow to factory account
   - Includes retry logic (3 attempts)

4. **Escrow Refund (on session failed/cancelled):**
   - Endpoint: `POST /api/payments/refund-session`
   - Called from: `cancelSession()` or `processExpiredSessions()`
   - Money returned to original payment method
   - Includes retry logic (3 attempts)

---

### Tier-Based Wallet Refund System

After session expires successfully, users receive **wallet refunds** based on final tier:

**Flow:**
1. User pays **base price** (e.g., 100,000 per unit) → held in escrow
2. Session expires with 75% MOQ reached
3. Final tier = 75%, tier price = 85,000 per unit
4. **Wallet refund issued**: 100,000 - 85,000 = 15,000 per unit

**Refund Calculation:**
```javascript
// In processExpiredSessions()
const basePrice = Number(session.group_price);  // What user paid
const finalPrice = determineFinalTier(realFillPercentage);  // Tier price
const refundPerUnit = basePrice - finalPrice;  // Cashback amount

// Issue to wallet
await walletService.credit({
    userId: participant.user_id,
    amount: refundPerUnit × participant.quantity,
    description: `Group buying refund - Session ${sessionCode} (Tier ${finalTier}%)`,
    reference: `GROUP_REFUND_${sessionId}_${participantId}`
});
```

**Example Refund:**
```json
{
  "basePricePerUnit": 100000,
  "finalPricePerUnit": 85000,
  "refundPerUnit": 15000,
  "quantity": 10,
  "totalRefund": 150000
}
```

**Important Notes:**
- Wallet refunds ONLY for successful sessions (MOQ reached)
- Failed sessions get FULL refund to original payment method (via escrow refund)
- Bot participants do NOT receive wallet refunds
- Refund failures logged but don't block session processing
- Orders always record `unitPrice` = base price (what was actually paid)

---

## API Endpoints

### Session Management

#### `POST /api/group-buying`
Create a new group buying session with tiered pricing.

**Required Fields:**
```json
{
  "productId": "uuid",
  "factoryId": "uuid",
  "targetMoq": 100,
  "groupPrice": 150000,
  "priceTier25": 150000,
  "priceTier50": 135000,
  "priceTier75": 120000,
  "priceTier100": 105000,
  "endTime": "2025-12-31T23:59:59Z",
  "warehouseId": "uuid",           // Optional, uses factory default
  "bulkShippingCost": 500000       // Leg 1 shipping cost
}
```

**Validation:**
- `targetMoq` ≥ 2
- `groupPrice` > 0
- `endTime` must be future
- Tier prices in descending order
- Factory must have assigned warehouse

**Response:**
```json
{
  "message": "Group buying session created successfully",
  "data": {
    "id": "uuid",
    "sessionCode": "GB-20251111-XYZ12",
    "status": "forming",
    "botParticipantId": "uuid",
    "bulk_shipping_cost_per_unit": 5000,
    "currentTier": 25,
    ...
  }
}
```

---

#### `GET /api/group-buying`
List all sessions with filtering and pagination.

**Query Parameters:**
- `status`: Filter by status (`forming`, `moq_reached`, `success`, `failed`, `cancelled`)
- `factoryId`: Filter by factory
- `productId`: Filter by product
- `activeOnly`: Show only active sessions (not expired, status `forming` or `moq_reached`)
- `search`: Search by session code or product name
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

#### `GET /api/group-buying/:id`
Get session details by ID, including participants and warehouse info.

**Response includes:**
- Session details with all tier pricing
- Product information and images
- Factory details
- **Warehouse information** (for Leg 1 shipping origin)
- List of all participants with payment status
- Participant count and stats

---

#### `GET /api/group-buying/code/:code`
Get session by unique code (e.g., `GB-20251111-XYZ12`).

---

#### `PATCH /api/group-buying/:id`
Update session details (only allowed in `forming` status).

**Updatable Fields:**
```json
{
  "endTime": "2025-12-31T23:59:59Z",
  "groupPrice": 140000,
  "targetMoq": 120,
  "estimatedCompletionDate": "2026-01-15T00:00:00Z"
}
```

**Restrictions:**
- Only sessions with status `forming` can be updated
- `endTime` must be future
- `targetMoq` ≥ 2

---

#### `DELETE /api/group-buying/:id`
Delete a session (typically only for cleanup/testing).

---

### Participant Management

#### `GET /api/group-buying/:id/shipping-options`
**⚠️ MUST BE CALLED BEFORE JOINING**

Get available shipping options for Leg 2 (Warehouse → User).

**Query Parameters:**
```
userId: User UUID (to fetch default shipping address)
quantity: Quantity to order
variantId: Optional product variant ID
```

**Response:**
```json
{
  "message": "Shipping options retrieved successfully",
  "data": {
    "sameDay": null,
    "express": {
      "type": "express",
      "courier_name": "JNE",
      "courier_service_name": "YES",
      "price": 25000,
      "duration": "1-2 days",
      "leg1Cost": 50000,
      "leg2Cost": 25000,
      "totalShipping": 75000
    },
    "regular": {
      "type": "regular",
      "courier_name": "SiCepat",
      "courier_service_name": "REG",
      "price": 15000,
      "duration": "2-3 days",
      "leg1Cost": 50000,
      "leg2Cost": 15000,
      "totalShipping": 65000
    },
    "productPrice": 500000,
    "gatewayFeePercentage": 3,
    "breakdown": {
      "leg1PerUnit": 5000,
      "leg1Total": 50000,
      "warehouseName": "Jakarta Central Warehouse",
      "warehouseCity": "Jakarta"
    }
  }
}
```

**Shipping Speed Categories:**
- `sameDay`: Same-day delivery (0 days)
- `express`: Fast delivery (1-2 days)
- `regular`: Standard delivery (2-3+ days)

Each category shows the **cheapest courier option** available.

---

#### `POST /api/group-buying/:id/join`
Join a session with selected shipping option.

**Required Fields:**
```json
{
  "userId": "uuid",
  "quantity": 5,
  "variantId": "uuid",  // Optional
  "unitPrice": 100000,
  "totalPrice": 500000,
  "selectedShipping": {
    "type": "express",
    "courierName": "JNE",
    "courierService": "YES",
    "price": 25000,
    "duration": "1-2 days"
  }
}
```

**Validation:**
- `selectedShipping.type` must be `sameDay`, `express`, or `regular`
- Must match values from `/shipping-options` response
- User must have default shipping address set

**Response:**
```json
{
  "message": "Successfully joined session",
  "data": {
    "participant": {...},
    "payment": {...},
    "paymentUrl": "https://xendit.co/payment/...",
    "invoiceId": "invoice-123",
    "breakdown": {
      "productPrice": 500000,
      "leg1Shipping": 50000,
      "leg2Shipping": 25000,
      "gatewayFee": 15000,
      "totalAmount": 590000,
      "selectedCourier": {
        "name": "JNE",
        "service": "YES",
        "duration": "1-2 days",
        "type": "express"
      }
    }
  }
}
```

**Payment Flow:**
1. Participant record created with `pending` payment
2. Payment record created via Payment Service
3. Xendit invoice generated with `paymentUrl`
4. User redirects to `paymentUrl` to complete payment
5. Webhook updates payment status to `paid`
6. Tier pricing recalculated based on paid participants

---

#### `DELETE /api/group-buying/:id/leave`
Leave a session (only allowed if no order created yet).

**Request Body:**
```json
{
  "userId": "uuid"
}
```

**Restrictions:**
- Can only leave if no order has been created
- Cannot leave after payment is completed

---

#### `GET /api/group-buying/:id/participants`
Get all participants in a session.

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "quantity": 5,
    "unitPrice": 100000,
    "totalPrice": 500000,
    "isBotParticipant": false,
    "joinedAt": "2025-11-11T10:00:00Z",
    "users": {
      "firstName": "John",
      "lastName": "Doe",
      "avatarUrl": "..."
    },
    "payments": [{
      "paymentStatus": "paid",
      "paidAt": "2025-11-11T10:05:00Z"
    }]
  }
]
```

---

#### `GET /api/group-buying/:id/stats`
Get session statistics.

**Response:**
```json
{
  "totalParticipants": 75,      // Only PAID participants
  "totalQuantity": 350,          // Only from PAID participants
  "pendingParticipants": 5,      // Unpaid participants
  "totalRevenue": 35000000,
  "moqProgress": 350,            // Total quantity (including bot)
  "moqProgressPercent": 87.5     // (350 / 400) * 100
}
```

**Important:**
- Statistics only count **PAID participants**
- Bot participant is included in `moqProgress`
- Used for tier price calculation

---

### Production Management

#### `POST /api/group-buying/:id/start-production`
Factory owner marks production as started.

**Request Body:**
```json
{
  "factoryOwnerId": "uuid"
}
```

**Authorization:**
- Only factory owner can call this endpoint
- Session must be in `moq_reached` status

**Sets:** `production_started_at` timestamp

---

#### `POST /api/group-buying/:id/complete-production`
Factory owner marks production as completed.

**Request Body:**
```json
{
  "factoryOwnerId": "uuid"
}
```

**Authorization:**
- Only factory owner can call this endpoint
- Production must have been started

**Updates:**
- Status: `moq_reached` → `pending_stock`
- Sets: `production_completed_at` timestamp

---

#### `POST /api/group-buying/:id/cancel`
Cancel a session.

**Request Body:**
```json
{
  "reason": "Insufficient participants"  // Optional
}
```

**Effects:**
- Status changes to `cancelled`
- Refunds issued to all paid participants
- Email notifications sent

---

### Session Processing

#### `POST /api/group-buying/process-expired`
**Cron job endpoint** - Process all expired sessions.

**Should run:** Every 5-15 minutes via cron

**Processing Logic:**
```
For each expired session:
  IF moqProgress >= targetMoq:
    → Calculate final tier based on real participant %
    → Issue wallet refunds (basePrice - tierPrice)
    → Create bot if < 25% (fill to exactly 25%)
    → Remove bot before order creation
    → Check warehouse stock via fulfillDemand()
    → Create orders for paid real participants
    → Notify factory owner to start production
    → Notify participants session confirmed
    → Status: moq_reached
  ELSE:
    → Status: failed
    → Issue full refunds to original payment method
    → Notify participants session failed
    → Notify factory session failed
```

**Response:**
```json
{
  "message": "Processed 5 expired sessions",
  "data": {
    "processed": 5,
    "successful": 3,
    "failed": 2
  }
}
```

---

#### `POST /api/group-buying/process-nearing-expiration` ⭐ NEW
**Cron job endpoint** - Process sessions 10 minutes before expiration for bot auto-join.

**Should run:** Every 1-2 minutes via cron

**Processing Logic:**
```
For each session with 8-10 minutes remaining:
  IF no real participants:
    → Mark session as 'failed'
    → Create new identical session for next day (midnight start)
    → Ensures continuous product availability
  ELSE IF realQuantity < 25% of MOQ:
    → Create/find platform bot user
    → Calculate botQuantity = ceil(MOQ × 0.25) - realQuantity
    → Create bot participant with:
        • quantity: botQuantity
        • unit_price: price_tier_25
        • is_bot_participant: true
        • is_platform_order: true
    → Update session with bot_participant_id
  ELSE:
    → No action needed (already >= 25%)
```

**Response:**
```json
{
  "message": "Near-expiring sessions processed",
  "data": {
    "processed": 3
  }
}
```

**Important:**
- This endpoint implements the bot auto-join system
- Must run MORE frequently than `/process-expired` to catch 10-minute window
- Bot ensures minimum 25% MOQ reached for viable sessions
- Auto-renewal prevents products from becoming unavailable

---

#### `POST /api/group-buying/:id/manual-expire`
**Testing only** - Manually expire and process a session immediately.

**Use Case:**
- Testing session expiration without waiting
- Debugging expiration logic

**Effects:**
- Sets `end_time` to past
- Immediately processes session (success/failed)

---

### Variant Availability (Grosir System)

#### `GET /api/group-buying/:sessionId/variant-availability/:variantId`
**Diagnostic endpoint** - Check variant availability for grosir allocation system.

**Use Case:**
- Products with variants use factory bundle system
- Helps debug why certain variants are locked

**Response:**
```json
{
  "message": "Variant availability checked",
  "data": {
    "variantId": "uuid",
    "allocation": 50,              // Factory bundle allocation
    "maxAllowed": 60,              // allocation + tolerance
    "totalOrdered": 45,            // Current orders
    "available": 15,               // maxAllowed - totalOrdered
    "isLocked": false,             // true if variant is unavailable
    "minOrderedAcrossVariants": 40,
    "ordersByVariant": {
      "variant-1": 45,
      "variant-2": 40
    }
  }
}
```

---

## Database Schema

### Key Tables

#### `group_buying_sessions`
```sql
id                          UUID PRIMARY KEY
product_id                  UUID NOT NULL
factory_id                  UUID NOT NULL
warehouse_id                UUID  -- TWO-LEG SHIPPING
session_code                VARCHAR(20) UNIQUE
target_moq                  INTEGER NOT NULL
group_price                 DECIMAL(15,2)
price_tier_25               DECIMAL(15,2)
price_tier_50               DECIMAL(15,2)
price_tier_75               DECIMAL(15,2)
price_tier_100              DECIMAL(15,2)
current_tier                INTEGER DEFAULT 25
bot_participant_id          UUID
bulk_shipping_cost          DECIMAL(12,2) DEFAULT 0  -- Leg 1 total
bulk_shipping_cost_per_unit DECIMAL(12,2) GENERATED  -- Auto-calculated
start_time                  TIMESTAMP NOT NULL
end_time                    TIMESTAMP NOT NULL
estimated_completion_date   TIMESTAMP
status                      ENUM('forming', 'moq_reached', 'pending_stock',
                                 'stock_received', 'success', 'failed', 'cancelled')
moq_reached_at              TIMESTAMP
production_started_at       TIMESTAMP
production_completed_at     TIMESTAMP
created_at                  TIMESTAMP DEFAULT NOW()
updated_at                  TIMESTAMP DEFAULT NOW()
```

**Important:**
- `bulk_shipping_cost_per_unit` is a **GENERATED COLUMN** calculated as `bulk_shipping_cost / target_moq`
- Cannot insert values into `bulk_shipping_cost_per_unit` directly

---

#### `group_participants`
```sql
id                    UUID PRIMARY KEY
group_session_id      UUID NOT NULL
user_id               UUID NOT NULL
quantity              INTEGER NOT NULL
unit_price            DECIMAL(15,2) NOT NULL
total_price           DECIMAL(15,2) NOT NULL
variant_id            UUID
order_id              UUID
is_bot_participant    BOOLEAN DEFAULT FALSE
joined_at             TIMESTAMP DEFAULT NOW()
```

---

## Integration with Other Services

### 1. Payment Service
- Creates payment records via `POST /api/payments/create-invoice`
- Receives webhook updates for payment status
- Handles refunds for failed/cancelled sessions

### 2. Logistics Service
- Calls `POST /api/rates` to get Leg 2 shipping options
- Parameters: `originPostalCode` (warehouse), `userId`, `productId`, `quantity`
- Returns grouped shipping options by speed

### 3. Order Service
- Creates orders when session expires successfully
- One order per paid participant
- Includes two-leg shipping cost breakdown

### 4. Warehouse Service
- Retrieves warehouse details for Leg 1 shipping origin
- Used in shipping options calculation

### 5. Notification Service ✅ FULLY IMPLEMENTED
**Endpoint:** `POST /api/notifications`

Sends in-app notifications for all critical events:

**Notification Types:**

1. **MOQ Reached** (`moq_reached`)
   - Recipient: Factory owner
   - Trigger: When session reaches target MOQ
   - Message: "Your group buying session has reached MOQ! Start production in your dashboard"

2. **Group Confirmed** (`group_confirmed`)
   - Recipient: All participants
   - Trigger: When MOQ is reached
   - Message: "The group has been confirmed! Production will start soon"

3. **Production Started** (`production_started`)
   - Recipient: All participants
   - Trigger: Factory calls `/start-production`
   - Message: "Production has started. Factory is manufacturing your order"

4. **Production Completed** (`production_completed`)
   - Recipient: All participants
   - Trigger: Factory calls `/complete-production`
   - Message: "Your order is complete and ready for shipping"

5. **Session Confirmed** (`session_confirmed`)
   - Recipient: All participants
   - Trigger: Session expires successfully
   - Message: "Your session has been confirmed! Orders have been created"

6. **Start Production** (`start_production`)
   - Recipient: Factory owner
   - Trigger: Session expires successfully
   - Message: "Session confirmed. Please start production"

7. **Session Failed** (`session_failed`)
   - Recipient: All participants
   - Trigger: Session expires without reaching MOQ
   - Message: "Session didn't reach MOQ. Your payment will be refunded"

8. **Session Failed (Factory)** (`session_failed_factory`)
   - Recipient: Factory owner
   - Trigger: Session expires without reaching MOQ
   - Message: "Session failed to reach MOQ"

9. **Session Cancelled** (`session_cancelled`)
   - Recipient: All participants
   - Trigger: Admin cancels session
   - Message: "Session has been cancelled. Your payment will be refunded"

10. **Session Cancelled (Factory)** (`session_cancelled_factory`)
    - Recipient: Factory owner
    - Trigger: Admin cancels session
    - Message: "Session has been cancelled"

**Implementation Details:**
- All notifications sent via `sendNotification()` and `sendBulkNotifications()` helpers
- Bulk notifications sent in parallel using `Promise.allSettled()`
- Failures logged but don't block core operations
- Each notification includes `actionUrl` for deep linking
- Timeout: 5 seconds per notification call

### 6. Wallet Service ✅ INTEGRATED
**Endpoint:** `POST /api/wallet/credit`

Used for tier-based refunds on successful sessions:

```json
{
  "userId": "uuid",
  "amount": 150000,
  "description": "Group buying refund - Session GB-123 (Tier 75%)",
  "reference": "GROUP_REFUND_sessionId_participantId",
  "metadata": {
    "sessionId": "uuid",
    "participantId": "uuid",
    "basePricePerUnit": 200000,
    "finalPricePerUnit": 155000,
    "refundPerUnit": 45000,
    "quantity": 10
  }
}
```

**Refund Flow:**
- Triggered in `processExpiredSessions()` for successful sessions
- Calculates: `basePrice - finalTierPrice`
- Credits user wallet (not original payment method)
- Failures logged but don't block session processing
- No timeout/retry logic (fire and forget)

---

## Business Rules Summary

### Session Creation
✅ Factory must have assigned warehouse
✅ Tier prices must be descending
✅ Bot auto-joins with 25% MOQ
✅ `bulk_shipping_cost_per_unit` auto-calculated

### Joining Session
✅ User must have default shipping address
✅ Must call `/shipping-options` first
✅ Payment includes: product + leg1 + leg2 + gateway fee
✅ Only paid participants count toward MOQ

### Tier Progression
✅ Based on PAID real users only (bot excluded)
✅ Automatically recalculates when thresholds crossed
✅ Current tier stored in `current_tier` field

### Session Expiration
✅ Processed by cron job
✅ Success if `moqProgress >= targetMoq`
✅ Failed if below MOQ → refunds issued
✅ Idempotent status updates prevent race conditions

### Shipping Costs
✅ Leg 1: Factory → Warehouse (divided among all units)
✅ Leg 2: Warehouse → Customer (individual rate)
✅ User pays both legs based on their quantity

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "No warehouse assigned to factory" | Factory missing `default_warehouse_id` | Assign warehouse to factory |
| "Destination postal code is required" | User has no default address | User must set default address |
| "Invalid shipping type" | Wrong `selectedShipping.type` value | Must be `sameDay`, `express`, or `regular` |
| "Tier prices must be in descending order" | Invalid price tiers | Ensure tier25 ≥ tier50 ≥ tier75 ≥ tier100 |
| "Cannot insert into bulk_shipping_cost_per_unit" | Trying to set generated column | Remove from request, auto-calculated |

---

## Environment Variables

```env
PORT=3004
DATABASE_URL=postgresql://...
LOGISTICS_SERVICE_URL=http://localhost:3008
PAYMENT_SERVICE_URL=http://localhost:3007
ORDER_SERVICE_URL=http://localhost:3005
NOTIFICATION_SERVICE_URL=http://localhost:3007
```

---

## Cron Jobs

### 1. Process Sessions Nearing Expiration ⭐ CRITICAL
**Schedule:** Every 1-2 minutes
**Command:** `curl -X POST http://localhost:3004/api/group-buying/process-nearing-expiration`
**Purpose:**
- Add bot participants to sessions 10 minutes before expiration
- Auto-renew sessions with zero participants
- Must run MORE frequently than process-expired

### 2. Process Expired Sessions
**Schedule:** Every 5-10 minutes
**Command:** `curl -X POST http://localhost:3004/api/group-buying/process-expired`
**Purpose:**
- Finalize expired sessions (success/failed)
- Create orders for successful sessions
- Issue refunds for failed sessions
- Send notifications to all stakeholders

**Crontab Example:**
```cron
# Process nearing expiration (every 2 minutes)
*/2 * * * * curl -X POST http://localhost:3004/api/group-buying/process-nearing-expiration

# Process expired sessions (every 10 minutes)
*/10 * * * * curl -X POST http://localhost:3004/api/group-buying/process-expired
```

---

## Testing Guide

### Create Session Flow
```bash
# 1. Create session
POST /api/group-buying
{
  "productId": "...",
  "factoryId": "...",
  "targetMoq": 100,
  "bulkShippingCost": 500000,
  ...
}

# 2. Get shipping options
GET /api/group-buying/:id/shipping-options?userId=...&quantity=10

# 3. Join session
POST /api/group-buying/:id/join
{
  "userId": "...",
  "quantity": 10,
  "selectedShipping": { ... }
}

# 4. Check stats
GET /api/group-buying/:id/stats

# 5. Manual expire (testing)
POST /api/group-buying/:id/manual-expire
```

---

## Monitoring

### Key Metrics to Track
- Active sessions count (status = `forming`)
- MOQ success rate (successful / total expired)
- Average time to reach MOQ
- Bot participation rate
- Refund volume for failed sessions
- Tier progression distribution

### Logs to Monitor
- Session creation with warehouse assignment
- Tier price calculations
- Payment status updates
- Expiration processing results
- Refund transactions

---

## Swagger Documentation

Full interactive API documentation available at:
**http://localhost:3004/api-docs**

Test endpoints directly from the browser with example payloads.

---

## Recent Improvements & Transaction Safety

### Transaction Safety in Join Operation

**Problem:** Participant record created before payment, causing orphaned records on payment failure.

**Solution (Implemented):**
```typescript
// Step 1: Create participant record (optimistic)
participant = await repository.joinSession(data);

// Step 2: Create escrow payment with retry logic
try {
    payment = await retryWithBackoff(
        () => axios.post('/api/payments/escrow', paymentData),
        { maxRetries: 3, initialDelay: 1000 }
    );
} catch (error) {
    // Step 3: Atomic rollback on payment failure
    await prisma.group_participants.delete({
        where: { id: participant.id }
    });
    throw new Error('Payment failed');
}
```

**Benefits:**
- No orphaned participant records
- Proper audit trail with detailed logging
- Clear error messages for operations team
- Retry logic for network resilience

---

### Escrow Release for Cancelled Sessions

**Problem:** When admin cancels a session, participants' escrow payments were stuck.

**Solution (Implemented):**
```typescript
// In cancelSession()
if (participantCount > 0) {
    await retryWithBackoff(
        () => axios.post('/api/payments/refund-session', {
            groupSessionId: sessionId,
            reason: reason || 'Session cancelled by admin'
        }),
        { maxRetries: 3, initialDelay: 2000 }
    );
}

// Notify all participants
await sendBulkNotifications({
    userIds: participantUserIds,
    type: 'session_cancelled',
    title: 'Group Session Cancelled',
    message: 'Session has been cancelled. Your payment will be refunded.'
});
```

**Benefits:**
- Automatic refund processing on cancellation
- Participants notified immediately
- Factory owner informed
- Retry logic ensures refunds complete

---

### Comprehensive Notification System

**10 Notification Types Implemented:**

| Event | Recipients | Trigger |
|-------|-----------|---------|
| MOQ Reached | Factory owner | Session reaches MOQ |
| Group Confirmed | Participants | MOQ reached |
| Production Started | Participants | Factory starts production |
| Production Completed | Participants | Factory completes production |
| Session Confirmed | Participants | Session expires successfully |
| Start Production | Factory owner | Session expires successfully |
| Session Failed | Participants | Session expires without MOQ |
| Session Failed (Factory) | Factory owner | Session expires without MOQ |
| Session Cancelled | Participants | Admin cancels session |
| Session Cancelled (Factory) | Factory owner | Admin cancels session |

**Implementation:**
- All notifications sent via dedicated helper methods
- Bulk notifications sent in parallel for performance
- Failures logged but don't block core operations
- Each notification includes deep link URL
- 5-second timeout per notification call

---

### Order Unit Price Bug Fix

**Problem:** Orders incorrectly using tier price instead of actual paid price.

**Incorrect Code:**
```typescript
unitPrice: finalPrice  // WRONG - tier price (e.g., 85,000)
```

**Correct Code:**
```typescript
unitPrice: Number(p.unit_price)  // CORRECT - base price paid (e.g., 100,000)
```

**Why This Matters:**
- Orders must reflect what user actually paid
- Tier-based discount handled separately via wallet refund
- Financial reconciliation requires accurate payment records
- Revenue recognition matches payment flow

---

### Warehouse Tolerance Bug Fix

**Problem:** Variant tolerance comparison failed due to type mismatch.

**Bug:**
```typescript
// String 'null' compared to boolean null
t => (t.variant_id || 'null') === (bundle.variant_id || null)
```

**Fix:**
```typescript
// Both sides use string 'null'
t => (t.variant_id || 'null') === (bundle.variant_id || 'null')
```

**Impact:**
- Warehouse tolerance constraints now properly enforced
- Variant locking works correctly
- Prevents excess inventory accumulation

---

### Unpaid Participants Filter

**Problem:** Warehouse reserved stock for ALL participants including unpaid.

**Fix:**
```typescript
// Filter to only paid participants
const participants = await prisma.group_participants.findMany({
    where: {
        group_session_id: sessionId,
        payments: {
            some: {
                payment_status: 'paid'
            }
        }
    }
});
```

**Impact:**
- Prevents stock overallocation
- Accurate warehouse demand calculation
- Only confirmed orders affect inventory

---

## Documentation Change Log

### November 2025 - Major Update

**Critical Corrections:**
1. ✅ Bot creation timing corrected (NOT during session creation, but 10 min before expiration)
2. ✅ Session auto-renewal documented
3. ✅ New endpoint documented: `/process-nearing-expiration`
4. ✅ Two cron jobs requirement clarified
5. ✅ Escrow payment system fully documented
6. ✅ Tier-based wallet refund system explained
7. ✅ Notification integration status updated (fully implemented)
8. ✅ Transaction safety improvements documented
9. ✅ Order unit price bug fix explained
10. ✅ Wallet service integration documented

**New Features Documented:**
- Session auto-renewal for products with zero participants
- Bot auto-join system with 10-minute window
- Comprehensive notification system (10 types)
- Escrow release for cancelled sessions
- Transaction rollback safety
- Warehouse tolerance enforcement

**Accuracy Status:** ✅ Documentation now matches actual implementation

---

## Production Checklist

Before deploying to production:

### Required Setup
- [ ] Configure both cron jobs (nearing expiration + expired)
- [ ] Set up platform bot user: `platform-bot@system.internal`
- [ ] Verify `NOTIFICATION_SERVICE_URL` environment variable
- [ ] Verify `WALLET_SERVICE_URL` environment variable
- [ ] Test escrow payment flow end-to-end
- [ ] Test tier-based refund calculation

### Integration Testing
- [ ] Verify notification delivery for all 10 types
- [ ] Test session auto-renewal (zero participants)
- [ ] Test bot creation (< 25% MOQ at 10 min)
- [ ] Verify warehouse tolerance constraints
- [ ] Test cancelled session refund flow
- [ ] Verify payment rollback on failure

### Monitoring
- [ ] Set up alerts for payment service timeouts
- [ ] Monitor bot creation rate and patterns
- [ ] Track session auto-renewal frequency
- [ ] Monitor notification delivery failures
- [ ] Alert on high refund volumes

### Known Issues
⚠️ **Payment Service:** Has webhook race condition and incomplete admin refund implementation (see PAYMENT_SERVICE_ANALYSIS.md)

---

## Support & Troubleshooting

### Common Issues

**Issue:** Bot not creating for sessions near expiration
- **Cause:** `/process-nearing-expiration` cron not running
- **Fix:** Verify cron job runs every 1-2 minutes

**Issue:** Sessions auto-renewing unexpectedly
- **Cause:** All sessions with zero participants auto-renew
- **Fix:** This is intended behavior to ensure product availability

**Issue:** Notifications not sending
- **Cause:** `NOTIFICATION_SERVICE_URL` misconfigured
- **Fix:** Verify environment variable and service availability

**Issue:** Wallet refunds not appearing
- **Cause:** Wallet service unavailable or request timeout
- **Fix:** Check wallet service logs, failures are logged but don't block session

**Issue:** Variant locked error
- **Cause:** Warehouse tolerance exceeded for variant
- **Fix:** Use `/variant-availability/:variantId` endpoint to diagnose

### Debug Endpoints

**Check variant availability:**
```bash
GET /api/group-buying/:sessionId/variant-availability/:variantId
```

**Force session expiration (testing):**
```bash
POST /api/group-buying/:id/manual-expire
```

**Check session stats:**
```bash
GET /api/group-buying/:id/stats
```

---

For additional support, see:
- **Swagger API Docs:** http://localhost:3004/api-docs
- **Database Schema:** `/packages/database/prisma/schema.prisma`
- **Integration Docs:** See individual service documentation
