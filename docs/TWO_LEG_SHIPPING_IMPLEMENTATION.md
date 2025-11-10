# Two-Leg Shipping Implementation Guide

## Overview

Group buying products use a **two-leg shipping model**:

**Leg 1:** Factory → Warehouse (Bulk Shipping)
- Admin inputs total cost per session
- Cost divided equally among all units
- User pays their share based on quantity ordered

**Leg 2:** Warehouse → User (Individual Shipping)
- Calculated via Biteship API
- Based on user's address and product weight
- User selects shipping speed (same day, express, regular)

## User Payment Calculation

```
Total = Product Price + Leg 1 Share + Leg 2 Cost + Gateway Fee

Example (User orders 10 units):
- Product: 10 × Rp 100,000 = Rp 1,000,000
- Leg 1 Share: 10 × Rp 5,000 = Rp 50,000  (from bulk_shipping_cost_per_unit)
- Leg 2 Cost: Rp 15,000  (user selected "Regular" shipping)
- Gateway Fee: 3% of product = Rp 30,000
────────────────────────────────────────
TOTAL: Rp 1,095,000
```

---

## ✅ Implementation Status

### COMPLETED

#### 1. Database Infrastructure
**Files:**
- `packages/database/prisma/migrations/20251110_add_two_leg_shipping/migration.sql`
- `packages/database/prisma/migrations/20251110_add_two_leg_shipping/rollback.sql`
- `packages/database/prisma/schema.prisma`

**Changes:**
- ✅ Created `warehouses` table
- ✅ Added `default_warehouse_id` to `factories` table
- ✅ Added `warehouse_id`, `bulk_shipping_cost`, `bulk_shipping_cost_per_unit` to `group_buying_sessions`
- ✅ Added indexes for performance

**SQL to run:**
```bash
cd packages/database
psql $DATABASE_URL -f prisma/migrations/20251110_add_two_leg_shipping/migration.sql
```

#### 2. Factory Service Admin API
**Files:**
- `services/factory-service/src/controllers/admin.controller.ts`
- `services/factory-service/src/routes/admin.routes.ts`

**New Endpoints:**
- ✅ `POST /api/admin/warehouses` - Create warehouse
- ✅ `GET /api/admin/warehouses` - List warehouses
- ✅ `PUT /api/admin/warehouses/{id}` - Update warehouse
- ✅ `DELETE /api/admin/warehouses/{id}` - Delete warehouse
- ✅ `POST /api/admin/factories/{id}/assign-warehouse` - Assign warehouse to factory

**Testing via Swagger:**
```
http://localhost:3003/api-docs  (Factory Service)
Tag: "Admin - Warehouses"
```

#### 3. Logistics Service Pre-Order Rates
**Status:** ✅ Already implemented (previous work)

- `POST /api/rates` with `productId + userId` (no orderId needed)
- Returns shipping rates WITHOUT requiring order to exist
- Origin: Warehouse postal code
- Destination: User's default address

#### 4. Group Buying Shipping Speed Selection
**Status:** ✅ Already implemented (previous work)

- `GET /api/group-buying/{id}/shipping-options` - Returns grouped options (sameDay, express, regular)
- `POST /api/group-buying/{id}/join` - Now requires `selectedShipping` object

---

### 🔄 REMAINING WORK

#### 1. Group Buying Service - Add Leg 1 to createSession

**File:** `services/group-buying-service/src/types/index.ts`

Add to `CreateGroupSessionDTO`:
```typescript
export interface CreateGroupSessionDTO {
  // ...existing fields...
  bulkShippingCost?: number;  // Leg 1 total cost (admin input)
  warehouseId?: string;       // Override factory's default warehouse
}
```

**File:** `services/group-buying-service/src/services/group.buying.service.ts`

Update `createSession` method:
```typescript
async createSession(data: CreateGroupSessionDTO) {
  // ...existing validation...

  // Get factory's default warehouse
  const factory = await this.repository.getFactory(data.factoryId);
  const warehouseId = data.warehouseId || factory.default_warehouse_id;

  if (!warehouseId) {
    throw new Error('No warehouse assigned to this factory. Please contact admin.');
  }

  // Calculate per-unit bulk shipping cost
  const bulkCostPerUnit = data.bulkShippingCost
    ? data.bulkShippingCost / data.targetMoq
    : 0;

  const session = await this.repository.createSession({
    ...data,
    warehouse_id: warehouseId,
    bulk_shipping_cost: data.bulkShippingCost || 0,
    bulk_shipping_cost_per_unit: bulkCostPerUnit
  });

  return session;
}
```

#### 2. Update getShippingOptions - Include Leg 1

**File:** `services/group-buying-service/src/services/group.buying.service.ts`

Modify `getShippingOptions` method:
```typescript
async getShippingOptions(sessionId: string, userId: string, quantity: number, variantId?: string) {
  const session = await this.repository.findById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  // Leg 1: Per-unit bulk shipping cost (from session)
  const leg1PerUnit = Number(session.bulk_shipping_cost_per_unit) || 0;
  const leg1Total = leg1PerUnit * quantity;

  // Get warehouse for Leg 2 calculation
  const warehouse = await this.getWarehouse(session.warehouse_id);
  if (!warehouse) {
    throw new Error('Session warehouse not configured');
  }

  // Leg 2: Individual shipping (Warehouse → User)
  const logisticsServiceUrl = process.env.LOGISTICS_SERVICE_URL || 'http://localhost:3008';

  const ratesResponse = await axios.post(`${logisticsServiceUrl}/api/rates`, {
    // Use warehouse postal code as origin (NOT factory!)
    originPostalCode: warehouse.postal_code,
    destinationUserId: userId,
    productId: session.product_id,
    variantId,
    quantity,
    couriers: 'jne,jnt,sicepat,anteraja'
  });

  const allRates = ratesResponse.data.data.pricing;
  const grouped = this.groupShippingBySpeed(allRates);

  // Add Leg 1 cost to each option
  return {
    sameDay: grouped.sameDay ? {
      ...grouped.sameDay,
      leg1Cost: leg1Total,
      leg2Cost: grouped.sameDay.price,
      totalShipping: leg1Total + grouped.sameDay.price
    } : null,
    express: grouped.express ? {
      ...grouped.express,
      leg1Cost: leg1Total,
      leg2Cost: grouped.express.price,
      totalShipping: leg1Total + grouped.express.price
    } : null,
    regular: grouped.regular ? {
      ...grouped.regular,
      leg1Cost: leg1Total,
      leg2Cost: grouped.regular.price,
      totalShipping: leg1Total + grouped.regular.price
    } : null,
    productPrice: quantity * Number(session.group_price),
    gatewayFeePercentage: 3,
    breakdown: {
      leg1PerUnit,
      leg1Total,
      warehouseName: warehouse.name
    }
  };
}
```

#### 3. Update joinSession - Include Leg 1 in Payment

**File:** `services/group-buying-service/src/services/group.buying.service.ts`

Modify `joinSession` method (around line 370):
```typescript
// SHIPPING INTEGRATION: Validate and use user's selected shipping option
if (!data.selectedShipping) {
  throw new Error('Shipping option must be selected. Please choose a shipping method first.');
}

// Leg 2: User's selected shipping (Warehouse → User)
const leg2Cost = data.selectedShipping.price || 0;

// Leg 1: Bulk shipping share (Factory → Warehouse)
const leg1PerUnit = Number(session.bulk_shipping_cost_per_unit) || 0;
const leg1Total = leg1PerUnit * data.quantity;

const selectedCourier = {
  name: data.selectedShipping.courierName,
  service: data.selectedShipping.courierService,
  duration: data.selectedShipping.duration,
  type: data.selectedShipping.type
};

logger.info('Calculating two-leg shipping cost', {
  sessionId: data.groupSessionId,
  leg1Total,
  leg2Cost,
  totalShipping: leg1Total + leg2Cost
});

// Calculate payment gateway fee (Xendit charges ~3% for e-wallet)
const productPrice = data.totalPrice;
const gatewayFeePercentage = 0.03;
const gatewayFee = Math.ceil(productPrice * gatewayFeePercentage);

// Calculate total amount including BOTH legs + gateway fee
const totalAmount = productPrice + leg1Total + leg2Cost + gatewayFee;

logger.info('Payment breakdown calculated', {
  sessionId: data.groupSessionId,
  productPrice,
  leg1Total,
  leg2Cost,
  totalShipping: leg1Total + leg2Cost,
  gatewayFee,
  totalAmount
});

// Create participant
const participant = await this.repository.joinSession({
  ...data,
  metadata: {
    ...data.metadata,
    leg1Cost: leg1Total,
    leg2Cost: leg2Cost,
    shippingCost: leg1Total + leg2Cost,
    gatewayFee,
    totalAmount,
    selectedCourier
  }
});

// Create payment with full total
const paymentData = {
  userId: data.userId,
  groupSessionId: data.groupSessionId,
  participantId: participant.id,
  amount: totalAmount,  // ✅ Includes Leg 1 + Leg 2 + Gateway Fee
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  isEscrow: true,
  factoryId: session.factory_id
};

// ...rest of payment creation...

return {
  participant,
  payment: paymentResult.payment,
  paymentUrl: paymentResult.paymentUrl,
  invoiceId: paymentResult.invoiceId,
  breakdown: {
    productPrice,
    leg1Cost: leg1Total,
    leg2Cost: leg2Cost,
    totalShipping: leg1Total + leg2Cost,
    gatewayFee,
    totalAmount,
    selectedCourier,
    warehouseName: session.warehouses?.name
  }
};
```

#### 4. Add Helper Method to Get Warehouse

**File:** `services/group-buying-service/src/services/group.buying.service.ts`

Add this method:
```typescript
private async getWarehouse(warehouseId: string | null) {
  if (!warehouseId) return null;

  const { prisma } = await import('@repo/database');
  return prisma.warehouses.findUnique({
    where: { id: warehouseId },
    select: {
      id: true,
      name: true,
      postal_code: true,
      city: true,
      province: true
    }
  });
}
```

---

## Integration Test Plan

### Prerequisites

1. **Run Database Migration:**
```bash
cd packages/database
psql $DATABASE_URL -f prisma/migrations/20251110_add_two_leg_shipping/migration.sql
```

2. **Start All Services:**
```bash
# Terminal 1 - Factory Service (port 3003)
cd services/factory-service && npm run dev

# Terminal 2 - Group Buying Service (port 3004)
cd services/group-buying-service && npm run dev

# Terminal 3 - Logistics Service (port 3008)
cd services/logistics-service && npm run dev

# Terminal 4 - Payment Service (port 3006)
cd services/payment-service && npm run dev
```

3. **Verify Swagger UI Access:**
- Factory Service: http://localhost:3003/api-docs
- Group Buying: http://localhost:3004/api-docs
- Logistics: http://localhost:3008/api-docs
- Payment: http://localhost:3006/api-docs

---

### Test Scenario: Complete Two-Leg Shipping Flow

#### Step 1: Create Warehouse (Factory Service)
**Endpoint:** `POST /api/admin/warehouses`
**Swagger:** Factory Service → Tag: "Admin - Warehouses"

**Request:**
```json
{
  "name": "Jakarta Central Warehouse",
  "addressLine": "Jl. Raya Mangga Dua No. 123",
  "city": "Jakarta Utara",
  "province": "DKI Jakarta",
  "postalCode": 14430,
  "notes": "Main warehouse for Jakarta region"
}
```

**Expected Response:**
```json
{
  "message": "Warehouse created successfully",
  "data": {
    "id": "warehouse-uuid",  // ← Save this!
    "name": "Jakarta Central Warehouse",
    "postal_code": 14430,
    ...
  }
}
```

**✅ Save:** `warehouse-uuid`

---

#### Step 2: Assign Warehouse to Factory
**Endpoint:** `POST /api/admin/factories/{factoryId}/assign-warehouse`
**Swagger:** Factory Service → Tag: "Admin - Factories"

**Request:**
```json
{
  "warehouseId": "warehouse-uuid"  // From Step 1
}
```

**Expected Response:**
```json
{
  "message": "Warehouse assigned to factory successfully",
  "data": {
    "factory": {
      "id": "factory-uuid",
      "factory_name": "...",
      "default_warehouse_id": "warehouse-uuid"  // ✅ Confirmed
    },
    "warehouse": { ... }
  }
}
```

---

#### Step 3: Create Group Buying Session with Bulk Shipping Cost
**Endpoint:** `POST /api/group-buying`
**Swagger:** Group Buying Service → Tag: "Group Buying Sessions"

**Request:**
```json
{
  "productId": "product-uuid",
  "factoryId": "factory-uuid",
  "sessionCode": "GBTEST001",
  "targetMoq": 100,
  "groupPrice": 100000,
  "priceTier25": 100000,
  "priceTier50": 90000,
  "priceTier75": 80000,
  "priceTier100": 70000,
  "endTime": "2025-12-31T23:59:59.000Z",
  "bulkShippingCost": 500000,  // ← Leg 1: Rp 500,000 for 100 units
  "warehouseId": "warehouse-uuid"  // Optional, uses factory default if omitted
}
```

**Expected Response:**
```json
{
  "message": "Group buying session created successfully",
  "data": {
    "id": "session-uuid",  // ← Save this!
    "session_code": "GBTEST001",
    "warehouse_id": "warehouse-uuid",
    "bulk_shipping_cost": 500000,
    "bulk_shipping_cost_per_unit": 5000,  // ✅ Auto-calculated: 500000 ÷ 100
    ...
  }
}
```

**✅ Verify:**
- `bulk_shipping_cost_per_unit = 5000` (Rp 5,000 per unit)

**✅ Save:** `session-uuid`

---

#### Step 4: Get Shipping Options (Two-Leg)
**Endpoint:** `GET /api/group-buying/{sessionId}/shipping-options`
**Swagger:** Group Buying Service → Tag: "Participants"

**Parameters:**
- `sessionId`: session-uuid (from Step 3)
- `userId`: user-uuid (query parameter)
- `quantity`: 10 (query parameter)

**Expected Response:**
```json
{
  "message": "Shipping options retrieved successfully",
  "data": {
    "express": {
      "courier_name": "JNE",
      "courier_service_name": "YES",
      "price": 15000,  // Leg 2 only
      "duration": "1-2 days",
      "leg1Cost": 50000,  // ✅ 10 units × Rp 5,000 per unit
      "leg2Cost": 15000,  // ✅ From Biteship
      "totalShipping": 65000  // ✅ Leg 1 + Leg 2
    },
    "regular": {
      "courier_name": "SiCepat",
      "courier_service_name": "REG",
      "price": 10000,
      "duration": "2-3 days",
      "leg1Cost": 50000,
      "leg2Cost": 10000,
      "totalShipping": 60000  // ✅ Cheaper total
    },
    "productPrice": 1000000,  // 10 × Rp 100,000
    "gatewayFeePercentage": 3,
    "breakdown": {
      "leg1PerUnit": 5000,
      "leg1Total": 50000,
      "warehouseName": "Jakarta Central Warehouse"
    }
  }
}
```

**✅ Verify:**
- `leg1Cost = 50000` (10 units × Rp 5,000)
- `leg2Cost` varies by courier
- `totalShipping = leg1Cost + leg2Cost`
- Warehouse name is shown

**✅ Save:** Selected shipping option details for Step 5

---

#### Step 5: Join Session with Two-Leg Shipping
**Endpoint:** `POST /api/group-buying/{sessionId}/join`
**Swagger:** Group Buying Service → Tag: "Participants"

**Request:**
```json
{
  "userId": "user-uuid",
  "quantity": 10,
  "unitPrice": 100000,
  "totalPrice": 1000000,
  "selectedShipping": {
    "type": "regular",
    "courierName": "SiCepat",
    "courierService": "REG",
    "price": 10000,  // Leg 2 cost
    "duration": "2-3 days"
  }
}
```

**Expected Response:**
```json
{
  "message": "Successfully joined the session",
  "data": {
    "participant": { ... },
    "payment": { ... },
    "paymentUrl": "https://xendit.co/invoice/...",
    "invoiceId": "...",
    "breakdown": {
      "productPrice": 1000000,
      "leg1Cost": 50000,  // ✅ Factory → Warehouse
      "leg2Cost": 10000,  // ✅ Warehouse → User
      "totalShipping": 60000,  // ✅ Leg 1 + Leg 2
      "gatewayFee": 30000,  // 3% of product
      "totalAmount": 1090000,  // ✅ Product + Both Legs + Gateway
      "selectedCourier": { ... },
      "warehouseName": "Jakarta Central Warehouse"
    }
  }
}
```

**✅ Verify Payment Calculation:**
```
Product:        Rp 1,000,000  (10 × Rp 100,000)
Leg 1:          Rp    50,000  (10 × Rp 5,000)
Leg 2:          Rp    10,000  (SiCepat REG)
Gateway Fee:    Rp    30,000  (3% of product)
─────────────────────────────────────────
TOTAL:          Rp 1,090,000  ✅
```

**✅ Open Payment URL:**
- Click the `paymentUrl` to test Xendit payment flow
- Verify amount shown is Rp 1,090,000

---

### Test Variations

#### Test Case 1: Different Quantities
Repeat Steps 4-5 with `quantity: 5`, verify:
- `leg1Cost = 25000` (5 × Rp 5,000)
- Total adjusts correctly

#### Test Case 2: Express vs Regular Shipping
Test both `express` and `regular` options:
- Express should have higher Leg 2 cost
- Leg 1 cost remains same
- Total varies by Leg 2 selection

#### Test Case 3: Missing Warehouse
Create session without `warehouseId` and factory without `default_warehouse_id`:
- Should error: "No warehouse assigned to this factory"

#### Test Case 4: Zero Bulk Shipping
Create session with `bulkShippingCost: 0`:
- `leg1Cost = 0`
- Total = product + leg2 + gateway fee only

---

## Frontend Integration

### UI Flow

```
1. User selects product in group buying session
   ↓
2. User selects variant and quantity
   ↓
3. Frontend calls GET /shipping-options
   ↓
4. Display shipping options:

   ┌─────────────────────────────────────┐
   │ 📦 SHIPPING OPTIONS                 │
   ├─────────────────────────────────────┤
   │ ○ Express (1-2 days)    Rp 65,000  │
   │   JNE YES                            │
   │                                      │
   │ ● Regular (2-3 days)    Rp 60,000 ✓│
   │   SiCepat REG                        │
   └─────────────────────────────────────┘

   ┌─────────────────────────────────────┐
   │ 💰 PAYMENT BREAKDOWN                │
   ├─────────────────────────────────────┤
   │ Product (10 units)   Rp 1,000,000  │
   │ Shipping Cost         Rp    60,000  │
   │   • Factory→Warehouse Rp  50,000    │
   │   • Warehouse→You     Rp  10,000    │
   │ Payment Fee (3%)      Rp    30,000  │
   ├─────────────────────────────────────┤
   │ TOTAL                Rp 1,090,000  │
   └─────────────────────────────────────┘

   [Confirm & Pay Button]

   ↓
5. User clicks "Confirm & Pay"
   ↓
6. Frontend calls POST /join with selectedShipping
   ↓
7. Redirect to paymentUrl
```

### Frontend Code Example

```typescript
// Step 1: Get shipping options
const getShippingOptions = async (sessionId, userId, quantity, variantId?) => {
  const response = await fetch(
    `/api/group-buying/${sessionId}/shipping-options?` +
    `userId=${userId}&quantity=${quantity}` +
    (variantId ? `&variantId=${variantId}` : ''),
    { method: 'GET' }
  );

  const { data } = await response.json();

  return {
    options: [
      data.express && {
        type: 'express',
        label: 'Express (1-2 days)',
        courier: `${data.express.courier_name} ${data.express.courier_service_name}`,
        leg1Cost: data.express.leg1Cost,
        leg2Cost: data.express.leg2Cost,
        totalShipping: data.express.totalShipping,
        ...data.express
      },
      data.regular && {
        type: 'regular',
        label: 'Regular (2-3 days)',
        courier: `${data.regular.courier_name} ${data.regular.courier_service_name}`,
        leg1Cost: data.regular.leg1Cost,
        leg2Cost: data.regular.leg2Cost,
        totalShipping: data.regular.totalShipping,
        ...data.regular
      }
    ].filter(Boolean),
    breakdown: data.breakdown,
    productPrice: data.productPrice,
    gatewayFeePercentage: data.gatewayFeePercentage
  };
};

// Step 2: Join session with selected shipping
const joinSession = async (sessionId, userId, quantity, unitPrice, selectedShipping) => {
  const response = await fetch(
    `/api/group-buying/${sessionId}/join`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
        selectedShipping: {
          type: selectedShipping.type,
          courierName: selectedShipping.courier_name,
          courierService: selectedShipping.courier_service_name,
          price: selectedShipping.leg2Cost,  // Leg 2 only
          duration: selectedShipping.duration
        }
      })
    }
  );

  const { data } = await response.json();

  // Redirect to payment
  window.location.href = data.paymentUrl;
};
```

---

## Admin Workflow

### Setting Up Two-Leg Shipping

1. **Create Warehouse:**
   - Admin panel → Warehouses → Create New
   - Enter warehouse address and postal code
   - Postal code is CRITICAL for Leg 2 shipping calculation

2. **Assign Warehouse to Factory:**
   - Admin panel → Factories → Select Factory → Assign Warehouse
   - Choose warehouse from dropdown
   - Factory now has default warehouse for all sessions

3. **Create Group Buying Session:**
   - Enter product details and MOQ
   - **Input Bulk Shipping Cost (Leg 1):**
     - Admin negotiates with logistics provider
     - Enters total cost to ship ALL units from factory to warehouse
     - System auto-calculates per-unit cost (total ÷ MOQ)
   - Select warehouse (defaults to factory's assigned warehouse)

4. **Monitor Sessions:**
   - View sessions with shipping costs
   - Bulk shipping cost is fixed per session
   - Individual shipping (Leg 2) varies per user

---

## Troubleshooting

### Error: "No warehouse assigned to this factory"
**Solution:** Assign warehouse to factory via admin API
```
POST /api/admin/factories/{factoryId}/assign-warehouse
{ "warehouseId": "..." }
```

### Error: "Session warehouse not configured"
**Solution:** Session references non-existent warehouse
- Check `group_buying_sessions.warehouse_id` exists in `warehouses` table
- Reassign valid warehouse to factory

### Shipping cost seems wrong
**Check:**
1. `bulk_shipping_cost_per_unit` = `bulk_shipping_cost` ÷ `target_moq`
2. Leg 1 share = `bulk_shipping_cost_per_unit` × user quantity
3. Leg 2 origin is warehouse postal code (NOT factory)
4. Total shipping = Leg 1 share + Leg 2 cost

### User doesn't see shipping options
**Check:**
1. User has default shipping address set
2. Warehouse postal code is valid
3. Logistics service is running on port 3008
4. Biteship API credentials are configured

---

## Next Steps

1. ✅ Run database migration
2. ✅ Complete remaining code changes (Steps 1-4 in "REMAINING WORK" section)
3. ✅ Test complete flow using integration test plan
4. ✅ Update frontend to display two-leg shipping breakdown
5. ✅ Train admin team on warehouse management
6. ✅ Document bulk shipping cost calculation process

---

## Summary

The two-leg shipping system provides:
- ✅ Fair cost distribution for bulk shipping
- ✅ Accurate individual shipping costs
- ✅ Full transparency to users (breakdown shown)
- ✅ Flexible warehouse management
- ✅ Scalable for multiple warehouses

**Total implementation time estimate:** 2-3 hours for remaining code + testing
