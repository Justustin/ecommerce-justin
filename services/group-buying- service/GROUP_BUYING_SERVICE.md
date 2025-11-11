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

To ensure minimum viability, a **bot automatically joins each session** with 25% of the MOQ:

```javascript
// If targetMoq = 100, bot joins with 25 units
botQuantity = Math.ceil(targetMoq * 0.25)  // 25 units
```

**Bot Behavior:**
- Automatically created during session creation
- Pays using bot account's wallet
- Does NOT count toward tier progression
- Ensures session always has baseline participation
- Marked with `isBotParticipant: true`

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
productPrice = unitPrice × quantity
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
    → Status: success
    → Create orders for all paid participants
    → Notify factory owner to start production
  ELSE:
    → Status: failed
    → Issue refunds to all paid participants
    → Send failure notifications
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

### 5. Notification Service
- Sends emails for:
  - MOQ reached
  - Session expired (success/failed)
  - Production started/completed
  - Refund issued

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

### Process Expired Sessions
**Schedule:** Every 10 minutes
**Command:** `curl -X POST http://localhost:3004/api/group-buying/process-expired`
**Purpose:** Automatically finalize expired sessions (success/failed)

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
