# Group Buying Service - API Documentation

**Service:** Group Buying Service (Grosir)
**Port:** 3004
**Base URL:** http://localhost:3004
**Swagger URL:** http://localhost:3004/api-docs

---

## Overview

The Group Buying Service manages group buying sessions where multiple customers combine their orders to meet factory Minimum Order Quantities (MOQ). The service implements a sophisticated tiered pricing system, bundle-based warehouse allocation, and escrow payment protection.

### Key Features
- Group buying session management with tiered pricing (25%, 50%, 75%, 100% MOQ tiers)
- Bundle-based grosir allocation system to minimize warehouse waste
- Variant availability tracking with warehouse tolerance constraints
- Escrow payment integration with automatic refunds
- Bot auto-join to guarantee minimum 25% MOQ
- Session expiration processing with tier-based cashback
- Payment status validation (only PAID participants count toward MOQ)
- Integration with payment, order, warehouse, and wallet services

### Business Model

**Group Buying Flow:**
1. Factory creates session with MOQ target and tiered pricing
2. Customers join and pay upfront (held in escrow)
3. Session expires when deadline reached or MOQ met
4. Final tier determined based on total quantity from PAID participants
5. Tier-based refunds issued to customer wallets
6. Warehouse checks stock or creates factory purchase order
7. Orders created for all participants
8. Factory produces goods (if needed)
9. Escrow released to factory upon completion

**Tiered Pricing Example:**
- Base price: Rp 200,000 (what customer pays upfront)
- 25% tier: Rp 180,000 → Refund Rp 20,000 per unit
- 50% tier: Rp 165,000 → Refund Rp 35,000 per unit
- 75% tier: Rp 155,000 → Refund Rp 45,000 per unit
- 100% tier: Rp 150,000 → Refund Rp 50,000 per unit

---

## API Endpoints

### Total Endpoints: 12
- **Public Endpoints:** 6
- **Admin Endpoints:** 6

---

## Public Endpoints

### 1. List Active Sessions
```
GET /api/group-buying
```

**Purpose:** Get all group buying sessions with filtering and pagination

**Query Parameters:**
- `status` (string, optional) - Filter by status: forming, moq_reached, success, failed, cancelled
- `factoryId` (string, optional) - Filter by factory UUID
- `productId` (string, optional) - Filter by product UUID
- `activeOnly` (boolean, optional) - Only show active sessions (not expired, status forming/moq_reached)
- `search` (string, optional) - Search in session code or product name
- `page` (integer, optional) - Page number (default: 1)
- `limit` (integer, optional) - Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "session_code": "GB-20251109-A8F3D",
      "product_id": "uuid",
      "factory_id": "uuid",
      "status": "forming",
      "target_moq": 100,
      "group_price": "200000",
      "price_tier_25": "180000",
      "price_tier_50": "165000",
      "price_tier_75": "155000",
      "price_tier_100": "150000",
      "current_tier": 25,
      "start_time": "2025-11-09T10:00:00Z",
      "end_time": "2025-12-31T23:59:59Z",
      "products": {
        "id": "uuid",
        "name": "Premium Batik Shirt",
        "base_price": "200000",
        "product_images": [
          {
            "image_url": "https://example.com/image.jpg"
          }
        ]
      },
      "factories": {
        "id": "uuid",
        "factory_name": "PT Batik Jakarta",
        "city": "Jakarta"
      },
      "_count": {
        "group_participants": 5
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### 2. Get Session by ID
```
GET /api/group-buying/{id}
```

**Purpose:** Get detailed information about a specific session including participants and computed statistics

**Parameters:**
- `id` (string, required) - Session UUID

**Response:** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "session_code": "GB-20251109-A8F3D",
    "product_id": "uuid",
    "factory_id": "uuid",
    "status": "forming",
    "target_moq": 100,
    "group_price": "200000",
    "price_tier_25": "180000",
    "price_tier_50": "165000",
    "price_tier_75": "155000",
    "price_tier_100": "150000",
    "current_tier": 25,
    "start_time": "2025-11-09T10:00:00Z",
    "end_time": "2025-12-31T23:59:59Z",
    "estimated_completion_date": "2026-01-15T00:00:00Z",
    "products": {
      "id": "uuid",
      "name": "Premium Batik Shirt",
      "description": "High quality batik",
      "base_price": "200000",
      "product_images": []
    },
    "factories": {
      "id": "uuid",
      "factory_name": "PT Batik Jakarta",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "phone_number": "081234567890"
    },
    "group_participants": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "quantity": 10,
        "unit_price": "200000",
        "total_price": "2000000",
        "joined_at": "2025-11-09T11:00:00Z",
        "users": {
          "id": "uuid",
          "first_name": "John",
          "last_name": "Doe"
        },
        "payments": [
          {
            "id": "uuid",
            "payment_status": "paid",
            "paid_at": "2025-11-09T11:05:00Z"
          }
        ]
      }
    ],
    "_count": {
      "group_participants": 1
    },
    "_stats": {
      "totalQuantity": 10,
      "totalRevenue": "2000000",
      "paidParticipantCount": 1,
      "pendingParticipantCount": 0,
      "totalParticipantCount": 1,
      "moqProgress": 10.0,
      "moqReached": false
    }
  }
}
```

**Key Statistics:**
- `totalQuantity` - Total units ordered by PAID participants only
- `totalRevenue` - Total revenue from PAID participants only
- `paidParticipantCount` - Number of participants who completed payment
- `pendingParticipantCount` - Number of participants who joined but haven't paid
- `moqProgress` - Percentage toward MOQ (based on paid participants only)
- `moqReached` - Boolean indicating if MOQ is reached (based on paid participants only)

---

### 3. Get Session by Code
```
GET /api/group-buying/code/{code}
```

**Purpose:** Find session by session code (e.g., for sharing links)

**Parameters:**
- `code` (string, required) - Session code (e.g., "GB-20251109-A8F3D")

**Response:** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "session_code": "GB-20251109-A8F3D",
    "target_moq": 100,
    "group_price": "200000",
    "products": {
      "name": "Premium Batik Shirt"
    },
    "_stats": {
      "totalQuantity": 45,
      "moqProgress": 45.0,
      "moqReached": false
    }
  }
}
```

---

### 4. Join Group Buying Session
```
POST /api/group-buying/{id}/join
```

**Purpose:** Join a group buying session with payment

**Parameters:**
- `id` (string, required) - Session UUID

**Request Body:**
```json
{
  "userId": "uuid",
  "quantity": 10,
  "variantId": "uuid",
  "unitPrice": 200000,
  "totalPrice": 2000000
}
```

**Validation:**
- Session must be in `forming` status
- Session must not be expired
- Unit price must match session's `group_price`
- Total price must equal `quantity × unitPrice`
- If variant specified, checks grosir allocation availability

**Response:** `201 Created`
```json
{
  "message": "Successfully joined the session",
  "data": {
    "participant": {
      "id": "uuid",
      "group_session_id": "uuid",
      "user_id": "uuid",
      "quantity": 10,
      "unit_price": "200000",
      "total_price": "2000000",
      "joined_at": "2025-11-09T12:00:00Z"
    },
    "payment": {
      "id": "uuid",
      "payment_status": "pending",
      "payment_url": "https://checkout.xendit.co/...",
      "expires_at": "2025-11-10T12:00:00Z"
    }
  }
}
```

**Flow:**
1. Validates session status and prices
2. Checks variant allocation (if applicable)
3. Creates participant record
4. Creates escrow payment via Payment Service
5. Returns payment URL for customer
6. If payment fails, participant is automatically removed (rollback)

---

### 5. Get Session Statistics
```
GET /api/group-buying/{id}/stats
```

**Purpose:** Get computed statistics for a session

**Parameters:**
- `id` (string, required) - Session UUID

**Response:** `200 OK`
```json
{
  "data": {
    "participantCount": 8,
    "totalQuantity": 87,
    "totalRevenue": "17400000",
    "pendingParticipants": 2,
    "targetMoq": 100,
    "progress": 87.0,
    "moqReached": false,
    "timeRemaining": "21 days 5 hours",
    "status": "forming"
  }
}
```

---

### 6. Get Session Participants
```
GET /api/group-buying/{id}/participants
```

**Purpose:** List all participants in a session

**Parameters:**
- `id` (string, required) - Session UUID

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "quantity": 10,
      "unit_price": "200000",
      "total_price": "2000000",
      "joined_at": "2025-11-09T10:00:00Z",
      "users": {
        "id": "uuid",
        "first_name": "John",
        "last_name": "Doe",
        "avatar_url": "https://example.com/avatar.jpg"
      },
      "payments": [
        {
          "id": "uuid",
          "payment_status": "paid",
          "paid_at": "2025-11-09T10:05:00Z",
          "payment_url": null
        }
      ]
    }
  ]
}
```

---

## Admin Endpoints

### 7. Get All Sessions (Admin)
```
GET /api/admin/grosir/sessions
```

**Purpose:** Get all sessions with advanced filtering for admin dashboard

**Query Parameters:**
- `status` (string, optional) - Filter by status
- `factoryId` (string, optional) - Filter by factory
- `productId` (string, optional) - Filter by product
- `moqReached` (boolean, optional) - Filter by MOQ status
- `page` (integer, optional) - Page number
- `limit` (integer, optional) - Items per page

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "session_code": "GB-20251109-A8F3D",
      "status": "forming",
      "target_moq": 100,
      "current_tier": 25,
      "products": {
        "name": "Premium Batik Shirt"
      },
      "factories": {
        "factory_name": "PT Batik Jakarta"
      },
      "_stats": {
        "totalQuantity": 45,
        "moqProgress": 45.0
      }
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

### 8. Get Session Details (Admin)
```
GET /api/admin/grosir/sessions/{id}/details
```

**Purpose:** Get comprehensive session details including warehouse and factory status

**Parameters:**
- `id` (string, required) - Session UUID

**Response:** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "session_code": "GB-20251109-A8F3D",
    "status": "moq_reached",
    "moq_reached_at": "2025-11-15T10:00:00Z",
    "warehouse_has_stock": false,
    "factory_whatsapp_sent": true,
    "factory_notified_at": "2025-11-15T10:05:00Z",
    "grosir_units_needed": 10,
    "current_tier": 100,
    "products": {
      "name": "Premium Batik Shirt"
    },
    "group_participants": [
      {
        "user_id": "uuid",
        "quantity": 25,
        "users": {
          "first_name": "John",
          "last_name": "Doe"
        }
      }
    ],
    "_stats": {
      "totalQuantity": 125,
      "totalRevenue": "25000000",
      "paidParticipantCount": 15
    }
  }
}
```

---

### 9. Manually Close Session (Admin)
```
POST /api/admin/grosir/sessions/{id}/close
```

**Purpose:** Manually trigger session closure and processing

**Parameters:**
- `id` (string, required) - Session UUID

**Request Body:**
```json
{
  "reason": "Manual admin closure"
}
```

**Response:** `200 OK`
```json
{
  "message": "Session closed successfully",
  "data": {
    "sessionId": "uuid",
    "finalTier": 75,
    "totalQuantity": 82,
    "participantsProcessed": 12,
    "refundsIssued": 12,
    "ordersCreated": true
  }
}
```

---

### 10. Extend Session Deadline (Admin)
```
POST /api/admin/grosir/sessions/{id}/extend
```

**Purpose:** Extend session deadline (for sessions close to MOQ)

**Parameters:**
- `id` (string, required) - Session UUID

**Request Body:**
```json
{
  "newEndTime": "2026-01-31T23:59:59Z",
  "reason": "Close to MOQ, extending deadline"
}
```

**Response:** `200 OK`
```json
{
  "message": "Session deadline extended successfully",
  "data": {
    "id": "uuid",
    "end_time": "2026-01-31T23:59:59Z",
    "updated_at": "2025-11-09T14:00:00Z"
  }
}
```

---

### 11. Get Admin Analytics
```
GET /api/admin/grosir/analytics
```

**Purpose:** Get platform-wide group buying analytics

**Query Parameters:**
- `startDate` (string, optional) - Start date for analytics (ISO format)
- `endDate` (string, optional) - End date for analytics (ISO format)

**Response:** `200 OK`
```json
{
  "data": {
    "totalSessions": 250,
    "activeSessions": 45,
    "successfulSessions": 180,
    "failedSessions": 25,
    "totalRevenue": "5000000000",
    "averageMoqReachRate": 72.5,
    "totalParticipants": 15000,
    "averageSessionSize": 85,
    "topFactories": [
      {
        "factory_id": "uuid",
        "factory_name": "PT Batik Jakarta",
        "sessionCount": 45,
        "successRate": 88.9
      }
    ]
  }
}
```

---

### 12. Cancel Session and Refund (Admin)
```
DELETE /api/admin/grosir/sessions/{id}
```

**Purpose:** Cancel session and process refunds for all participants

**Parameters:**
- `id` (string, required) - Session UUID

**Request Body:**
```json
{
  "reason": "Factory unable to fulfill order"
}
```

**Response:** `200 OK`
```json
{
  "message": "Session cancelled and refunds processed",
  "data": {
    "sessionId": "uuid",
    "participantsRefunded": 15,
    "totalRefundAmount": "30000000",
    "status": "cancelled"
  }
}
```

---

## Grosir Bundle-Based Allocation System

### Overview

The grosir allocation system prevents warehouse waste by controlling variant orders based on factory bundle constraints and warehouse tolerance limits.

### The Problem

Factories ship products in fixed bundles (e.g., 2S + 5M + 4L + 1XL per bundle). If only popular sizes are ordered, the factory must still ship complete bundles, creating excess inventory of unpopular sizes.

**Example without allocation:**
```
Orders: M=40, L=25, S=20, XL=5 (90 units total)
Factory bundle: 2S + 5M + 4L + 1XL per bundle

M needs: ceil(40/5) = 8 bundles (drives production)
Factory ships: 8 bundles = 16S + 40M + 32L + 8XL = 96 units

Warehouse excess:
- S: 16 - 20 = -4 (need to order more)
Actually M drives it, so we need 8 bundles minimum for M
But then we need more bundles for S: ceil(20/2) = 10 bundles needed

Recalculate: 10 bundles needed
= 20S + 50M + 40L + 10XL = 120 units

Excess:
- S: 20 - 20 = 0 ✓
- M: 50 - 40 = 10 units excess
- L: 40 - 25 = 15 units excess
- XL: 10 - 5 = 5 units excess
Total waste: 30 units (25% waste)
```

### The Solution: Warehouse Tolerance

Admin configures two settings per product:

**1. Bundle Configuration**
```json
{
  "productId": "uuid",
  "bundleConfig": [
    { "variantId": "S-uuid", "unitsPerBundle": 2 },
    { "variantId": "M-uuid", "unitsPerBundle": 5 },
    { "variantId": "L-uuid", "unitsPerBundle": 4 },
    { "variantId": "XL-uuid", "unitsPerBundle": 1 }
  ]
}
```

**2. Warehouse Tolerance**
```json
{
  "productId": "uuid",
  "warehouseTolerance": [
    { "variantId": "S-uuid", "maxExcessUnits": 20 },
    { "variantId": "M-uuid", "maxExcessUnits": 50 },
    { "variantId": "L-uuid", "maxExcessUnits": 40 },
    { "variantId": "XL-uuid", "maxExcessUnits": 10 }
  ]
}
```

### Algorithm

When customer tries to order a variant:

```
Step 1: Calculate bundles needed for each variant
  bundlesNeeded[variant] = ceil(currentOrders[variant] / unitsPerBundle[variant])

Step 2: Find maximum bundles needed
  maxBundlesNeeded = max(bundlesNeeded for all variants)

Step 3: Calculate what factory would produce
  For each variant:
    willProduce[variant] = maxBundlesNeeded × unitsPerBundle[variant]
    excess[variant] = willProduce[variant] - currentOrders[variant]

Step 4: Check tolerance violations
  For each variant:
    if excess[variant] > maxExcessUnits[variant]:
      variant is LOCKED

Step 5: Calculate availability
  If no violations:
    available[variant] = willProduce[variant] - currentOrders[variant]
  Else:
    Find constraining variant and limit bundles
```

### Variant Availability Response

```json
{
  "variantId": "M-uuid",
  "available": 15,
  "maxCanOrder": 50,
  "currentOrdered": 35,
  "isLocked": false,
  "bundleInfo": {
    "unitsPerBundle": 5,
    "bundlesNeeded": 7,
    "maxBundlesAllowed": 10,
    "warehouseTolerance": 50
  }
}
```

If variant is locked:
```json
{
  "variantId": "XL-uuid",
  "available": 0,
  "maxCanOrder": 10,
  "currentOrdered": 10,
  "isLocked": true,
  "reason": "Warehouse tolerance exceeded. Other variants need to catch up.",
  "constrainingVariant": "XL"
}
```

---

## Session Processing Flow

### 1. Session Creation
- Factory or admin creates session with product, MOQ, tiered pricing, and deadline
- Session status: `forming`
- Session code generated: `GB-YYYYMMDD-XXXXX` (cryptographically secure)

### 2. Customer Joins
- Customer selects quantity (and variant if applicable)
- System validates:
  - Session is in `forming` status
  - Session not expired
  - Price matches session `group_price`
  - Variant available (if using grosir allocation)
- Participant record created
- Escrow payment created via Payment Service
- Customer receives payment URL
- Customer pays via Xendit
- Payment webhook updates status to `paid`
- **CRITICAL:** Only participants with `payment_status = 'paid'` count toward MOQ

### 3. Session Expiration (Cron Job)
Runs every minute to process expired sessions.

**If MOQ reached (totalQuantity from PAID participants >= targetMoq):**

1. Calculate final tier based on percentage reached:
   - 0-24%: Session fails (shouldn't happen if MOQ reached)
   - 25-49%: Tier 25
   - 50-74%: Tier 50
   - 75-99%: Tier 75
   - 100%+: Tier 100

2. Issue tier-based refunds to wallets:
   ```
   Example: User paid 200,000, final tier is 50 (price 165,000)
   Refund = 200,000 - 165,000 = 35,000 to wallet
   ```

3. Call Warehouse Service to fulfill demand:
   - Warehouse checks stock for all variants
   - If in stock: Reserve inventory
   - If not in stock: Create factory PO, send WhatsApp to factory

4. Create orders for all PAID participants

5. Update session status to `moq_reached` or `pending_stock`

**If MOQ not reached:**

1. Check if bot should auto-join:
   - If totalQuantity < 25% of MOQ
   - Bot joins to fill to exactly 25% MOQ
   - Ensures minimum tier reached

2. Mark session status as `failed`

3. Process refunds for all participants via Payment Service

4. Send notifications

### 4. Production Complete
- Factory marks production done
- Session status updated to `success`
- Escrow payments released to factory

### 5. Shipping
- Orders shipped to customers
- Tracking info updated via Logistics Service

---

## Payment Status Validation

**CRITICAL BUSINESS RULE:** Only participants with confirmed payment count toward MOQ.

### Why This Matters
- Prevents MOQ inflation from unpaid participants
- Avoids financial loss (session appears full but no money received)
- Ensures accurate tier calculation
- Protects factory from unfulfilled orders

### Implementation
All statistic calculations filter participants:
```javascript
const paidParticipants = participants.filter(p =>
  p.payments && p.payments.length > 0 &&
  p.payments.some(payment => payment.payment_status === 'paid')
);
```

### Payment Statuses
- `pending` - Payment created, awaiting customer action
- `paid` - Payment confirmed (counts toward MOQ)
- `failed` - Payment failed (does not count)
- `refunded` - Payment refunded (does not count)

---

## Session Status Flow

```
forming → moq_reached → success
   ↓           ↓
failed    pending_stock → stock_received → success
   ↓
cancelled (admin action)
```

**Status Definitions:**
- `forming` - Accepting participants, MOQ not yet reached
- `moq_reached` - MOQ reached, processing orders
- `pending_stock` - Waiting for factory to produce goods
- `stock_received` - Goods received in warehouse
- `success` - Session completed successfully
- `failed` - MOQ not reached, refunds processed
- `cancelled` - Admin cancelled, refunds processed

---

## Tiered Pricing System

### How It Works

1. **Customer pays base price upfront** (e.g., 200,000)
2. **Price held in escrow** until session completes
3. **Final tier determined** based on total quantity from PAID participants
4. **Cashback issued** to customer wallet for the difference

### Pricing Structure Example

```
Product: Premium Batik Shirt
MOQ: 100 units

Tier Pricing:
- Base price (paid upfront): Rp 200,000
- 25% tier (25-49 units): Rp 180,000 → Cashback: Rp 20,000/unit
- 50% tier (50-74 units): Rp 165,000 → Cashback: Rp 35,000/unit
- 75% tier (75-99 units): Rp 155,000 → Cashback: Rp 45,000/unit
- 100% tier (100+ units): Rp 150,000 → Cashback: Rp 50,000/unit
```

### Example Calculation

**Scenario:** Session reaches 87 units (87% of MOQ 100)
- Final tier: **75%** (75-99% range)
- Final price per unit: **Rp 155,000**
- Customer paid: **Rp 200,000**
- Cashback: **Rp 45,000 per unit** to wallet

**For a customer who ordered 10 units:**
- Paid upfront: 10 × 200,000 = Rp 2,000,000 (in escrow)
- Final price: 10 × 155,000 = Rp 1,550,000 (released to factory)
- Cashback: 10 × 45,000 = Rp 450,000 (to customer wallet)

---

## Bot Auto-Join System

### Purpose
Guarantee that every session reaches at least 25% MOQ to provide minimum tier pricing.

### How It Works
When session expires:
1. Check total quantity from PAID participants
2. If `totalQuantity < (targetMoq × 0.25)`:
   - Calculate gap: `gap = (targetMoq × 0.25) - totalQuantity`
   - Create bot participant with quantity = gap
   - Bot pays from platform wallet (internal transaction)
   - Session now at exactly 25% MOQ

### Example
```
Session MOQ: 100 units
Minimum 25%: 25 units
Real participants: 18 units (PAID)

Bot joins with: 25 - 18 = 7 units
Final quantity: 25 units (25% tier reached)
```

### Benefits
- Customers always get at least 25% discount
- Reduces session failure rate
- Platform can resell bot-purchased units
- Builds customer trust

---

## Integration Points

### Payment Service
- **Create escrow payment:** POST `/api/payments/escrow`
- **Refund payment:** POST `/api/payments/refund`
- **Release escrow:** POST `/api/payments/release-escrow`

### Order Service
- **Create bulk orders:** POST `/api/orders/bulk-create`

### Warehouse Service
- **Fulfill bundle demand:** POST `/api/warehouse/fulfill-bundle-demand`
- Checks stock, reserves inventory, or creates factory PO

### Wallet Service
- **Credit wallet:** POST `/api/wallets/credit`
- Used for tier-based cashback

### WhatsApp Service
- **Send factory notification:** POST `/api/whatsapp/send`
- Notifies factory when PO created

---

## Error Handling

### Common Errors

**Session Expired**
```json
{
  "error": "Session has expired",
  "code": "SESSION_EXPIRED"
}
```

**Invalid Price**
```json
{
  "error": "Invalid unit price. Expected 200000, got 150000",
  "code": "PRICE_MISMATCH"
}
```

**Variant Locked**
```json
{
  "error": "Variant is currently locked. Max 10 allowed, 10 already ordered. Other variants need to catch up before you can order more of this variant.",
  "code": "VARIANT_LOCKED",
  "details": {
    "available": 0,
    "maxAllowed": 10,
    "currentOrdered": 10,
    "constrainingVariant": "XL"
  }
}
```

**Payment Failed**
```json
{
  "error": "Payment failed: Insufficient balance",
  "code": "PAYMENT_FAILED"
}
```

---

## Database Schema

### Main Tables

**group_buying_sessions**
```sql
- id (uuid, primary key)
- session_code (varchar, unique) - e.g., "GB-20251109-A8F3D"
- product_id (uuid, foreign key)
- factory_id (uuid, foreign key)
- status (enum: forming, moq_reached, success, failed, cancelled, pending_stock, stock_received)
- target_moq (integer)
- group_price (decimal) - Base price customer pays upfront
- price_tier_25 (decimal)
- price_tier_50 (decimal)
- price_tier_75 (decimal)
- price_tier_100 (decimal)
- current_tier (integer) - Current tier (25, 50, 75, or 100)
- start_time (timestamptz)
- end_time (timestamptz)
- moq_reached_at (timestamptz)
- warehouse_has_stock (boolean)
- factory_whatsapp_sent (boolean)
- grosir_units_needed (integer) - Bundles ordered from factory
- bot_participant_id (uuid) - Bot participant if auto-joined
- estimated_completion_date (timestamptz)
```

**group_participants**
```sql
- id (uuid, primary key)
- group_session_id (uuid, foreign key)
- user_id (uuid, foreign key)
- order_id (uuid, foreign key, nullable)
- quantity (integer)
- variant_id (uuid, foreign key, nullable)
- unit_price (decimal)
- total_price (decimal)
- joined_at (timestamptz)
- is_bot_participant (boolean)
- tier_reached (integer)
- cashback_amount (decimal)
```

**grosir_bundle_config**
```sql
- id (uuid, primary key)
- product_id (uuid, foreign key)
- variant_id (uuid, foreign key, nullable)
- units_per_bundle (integer) - How many of this variant in one bundle
- notes (text)
```

**grosir_warehouse_tolerance**
```sql
- id (uuid, primary key)
- product_id (uuid, foreign key)
- variant_id (uuid, foreign key, nullable)
- max_excess_units (integer) - Max excess acceptable in warehouse
- clearance_rate_estimate (integer) - Estimated % that can be cleared
- notes (text)
```

---

## Environment Variables

```bash
# Required
PORT=3004
DATABASE_URL=postgresql://...

# Service URLs
PAYMENT_SERVICE_URL=http://localhost:3006
ORDER_SERVICE_URL=http://localhost:3005
WAREHOUSE_SERVICE_URL=http://localhost:3011
WALLET_SERVICE_URL=http://localhost:3010

# Optional
LOG_LEVEL=info
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Service Status:** Production Ready (Authentication pending)
