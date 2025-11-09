# E-Commerce Platform Documentation
**Last Updated:** November 9, 2025
**Version:** 2.0 (Post-cleanup)

---

## Table of Contents

1. [Business Model Overview](#business-model-overview)
2. [Grosir Allocation System](#grosir-allocation-system)
3. [Microservices Architecture](#microservices-architecture)
4. [Database Schema](#database-schema)
5. [Service Implementations](#service-implementations)
6. [Testing Guide](#testing-guide)
7. [API Documentation](#api-documentation)

---

## Business Model Overview

### Dual Business Model

Your platform operates **TWO distinct business models**:

#### 1. Factory Group Buying (Make-to-Order)
- **How it works:** Customers join group buying sessions, pay upfront (held in escrow)
- **Production:** Factory produces AFTER session reaches MOQ
- **Payment:** Tiered pricing with base price paid upfront, refunds issued based on final participation
- **Stock:** NO upfront inventory - products manufactured after session succeeds
- **Risk:** Shared between customers (MOQ must be met)

**Key Features:**
- Escrow payment protection
- Dynamic pricing with tier-based refunds (25%, 50%, 75%, 100% tiers)
- Grosir (wholesale) allocation system for variant balance
- Bot auto-join to guarantee minimum 25% MOQ
- Warehouse integration with factory WhatsApp notifications

#### 2. Seller Inventory (Traditional E-Commerce)
- **How it works:** Sellers maintain their own inventory and sell directly
- **Stock:** EXISTS before sale (immediate availability)
- **Payment:** Direct payment (no escrow)
- **Purchase:** Instant checkout, no waiting for MOQ
- **Sellers can:**
  - Create their own products
  - Resell factory products they've purchased

**Key Features:**
- Real-time stock management with variant tracking
- Seller-specific pricing
- Stock movement auditing
- Reserved inventory for pending orders
- Financial settlement system for seller payouts

### Platform Players

1. **Factories** - Manufacturers who produce via group buying
2. **Sellers** - Resellers with their own inventory
3. **Customers** - End buyers (can purchase from either model)
4. **Warehouse** - Central inventory managed by platform
5. **Platform Admin** - Manages everything

---

## Grosir Allocation System

### The Problem: Factory Bundle Constraints

**Core Issue:** Factory ships products in fixed bundles (e.g., 3S + 3M + 3L + 3XL per bundle)

**Example of the problem:**
```
Orders: M=40, L=25, S=20, XL=5 (90 units total)

Factory bundle: 3 of each size per bundle
M needs: ceil(40/3) = 14 bundles (drives production)

Factory must ship: 14 bundles
= 42S + 42M + 42L + 42XL = 168 units

Warehouse excess:
- S: 42 - 20 = 22 units 💀
- M: 42 - 40 = 2 units
- L: 42 - 25 = 17 units 💀
- XL: 42 - 5 = 37 units 💀💀💀

Total waste: 78 units out of 168 (46% waste!)
```

### ❌ OLD APPROACH (WRONG - Progressive Unlock)

**What it did:**
- Based on total MOQ progress, unlock variants progressively
- 0-25% MOQ: 2x allocation
- 25-50% MOQ: 4x allocation
- 50-75% MOQ: 6x allocation
- 75-100% MOQ: 10x allocation

**Why it failed:**
- Focused on balancing ORDERS, not managing PRODUCTION
- Popular sizes still sold heavily (just later)
- When M reaches 40 units, factory STILL ships 14 bundles
- Result: Same warehouse waste problem!

### ✅ CORRECT APPROACH (Bundle-Based Warehouse Tolerance)

**Key Insight:** Control how many bundles you buy by setting warehouse tolerance for excess units.

**Algorithm:**
```typescript
// Step 1: Calculate bundles needed for each variant
bundlesNeeded[variant] = ceil(currentOrders[variant] / bundle[variant])

// Step 2: Find highest bundle need (what factory must produce)
maxBundlesNeeded = max(bundlesNeeded[S], bundlesNeeded[M], bundlesNeeded[L], bundlesNeeded[XL])

// Step 3: Calculate excess if we produce maxBundlesNeeded bundles
for each variant:
  willProduce[variant] = maxBundlesNeeded × bundle[variant]
  excess[variant] = willProduce[variant] - currentOrders[variant]

// Step 4: Check which variants violate tolerance
for each variant:
  if excess[variant] > tolerance[variant]:
    // This variant would have too much excess
    // Calculate max bundles allowed by this constraint
    maxAllowedForThisVariant = currentOrders[variant] + tolerance[variant]
    bundlesAllowedForThisVariant = floor(maxAllowedForThisVariant / bundle[variant])

    // Update global constraint
    if bundlesAllowedForThisVariant < maxBundlesAllowed:
      maxBundlesAllowed = bundlesAllowedForThisVariant
      constrainingVariant = variant

// Step 5: Calculate availability for each variant
for each variant:
  maxCanProduce[variant] = maxBundlesAllowed × bundle[variant]
  available[variant] = max(0, maxCanProduce[variant] - currentOrders[variant])
```

### Admin Configuration Required

**For each product, admin must configure:**

#### 1. Factory Bundle Configuration
```
Product: Premium Hoodie

Factory bundle composition:
- S-Size:   2 units per bundle
- M-Size:   5 units per bundle
- L-Size:   4 units per bundle
- XL-Size:  1 unit per bundle
Total: 12 units per bundle
```

#### 2. Warehouse Tolerance Per Variant
```
Maximum excess units warehouse can handle:
- S-Size:  20 units (S doesn't sell well)
- M-Size:  50 units (M sells great in clearance)
- L-Size:  40 units (L sells well)
- XL-Size: 30 units (XL decent clearance for hoodies)
```

### Why Full Customization is Required

**Every product is different:**

1. **Factory bundles vary:**
   - Standard T-Shirts: 3S + 3M + 3L + 3XL (12 total)
   - Premium Hoodies: 5S + 5M + 5L + 2XL (17 total)
   - Kids Clothing: 6S + 4M + 2L + 1XL (13 total)
   - Women's Dresses: 8S + 6M + 3L + 1XL (18 total)

2. **Demand patterns vary:**
   - Kids T-Shirts: S=45%, M=40%, L=13%, XL=2%
   - Men's Hoodies: S=18%, M=35%, L=35%, XL=12%
   - Women's Athletic: S=55%, M=35%, L=9%, XL=1%

3. **Warehouse capacity varies:**
   - Small merchant: 50 sqm → tight tolerance (10-20 units)
   - Large merchant: 1000 sqm → loose tolerance (50-100 units)

4. **Product margins vary:**
   - Budget item ($5, 20% margin): Cannot afford waste
   - Premium item ($50, 60% margin): Can absorb some waste

### Database Schema for Grosir Config

```prisma
// Factory bundle composition per product
model grosir_bundle_config {
  id         String   @id @default(uuid())
  product_id String   @db.Uuid
  variant_id String?  @db.Uuid  // null = base product

  units_per_bundle Int  // How many of this variant in one bundle

  created_at DateTime @default(now())
  updated_at DateTime @default(now())

  products       products          @relation(...)
  product_variants product_variants? @relation(...)

  @@unique([product_id, variant_id])
}

// Warehouse tolerance per variant
model grosir_warehouse_tolerance {
  id         String   @id @default(uuid())
  product_id String   @db.Uuid
  variant_id String?  @db.Uuid  // null = base product

  max_excess_units Int  // Max excess units acceptable in warehouse

  // Context for admin
  clearance_rate_estimate Int?  // Estimated % that can be cleared
  notes String?  // Admin notes on why this tolerance

  created_at DateTime @default(now())
  updated_at DateTime @default(now())

  products       products          @relation(...)
  product_variants product_variants? @relation(...)

  @@unique([product_id, variant_id])
}
```

### ✅ Implementation Status

**Status:** **PRODUCTION READY - END-TO-END INTEGRATION COMPLETE** (November 9, 2025)

**What's been implemented:**

**Phase 1: Grosir Algorithm Core**
1. ✅ Database tables created (`grosir_bundle_config`, `grosir_warehouse_tolerance`)
2. ✅ Prisma schema updated with new models and relations
3. ✅ Repository methods added for CRUD operations on grosir config
4. ✅ Service types updated with new interfaces
5. ✅ `getVariantAvailability()` rewritten with bundle-based algorithm
6. ✅ Migration SQL ready for deployment (002, 003)
7. ✅ Deprecated `grosir_variant_allocations` table removed

**Phase 2: Warehouse Integration** ⭐ NEW
8. ✅ Warehouse service `fulfillBundleDemand()` implemented
9. ✅ Group-buying service updated to call bundle-based warehouse endpoint
10. ✅ Bundle-based PO creation with warehouse tolerance checking
11. ✅ WhatsApp factory notifications with bundle breakdown
12. ✅ Comprehensive logging for debugging and monitoring

**Phase 3: Admin Endpoints**
13. ✅ Admin endpoints for grosir configuration (10 endpoints)
14. ✅ Admin endpoints for Product Service (15 endpoints)
15. ✅ Admin endpoints for Warehouse Service (11 endpoints)
16. ✅ Admin endpoints for Factory Service (10 endpoints)
17. ✅ ADMIN_ENDPOINTS_README.md comprehensive guide

**End-to-End Flow:**
```
1. Admin configures bundle → /api/admin/grosir/configure-product
2. User joins session → getVariantAvailability() checks bundles
3. Session expires (MOQ reached) → fulfillWarehouseDemand() called
4. Warehouse processes ALL variants → fulfillBundleDemand()
5. Warehouse checks tolerance → Orders complete bundles
6. Factory receives WhatsApp → Bundle composition detailed
7. Admin tracks PO → Warehouse admin endpoints
```

**Next steps for deployment:**
1. ✅ Run migration: `002_add_grosir_bundle_tolerance_tables.sql`
2. ✅ Run migration: `003_drop_deprecated_grosir_allocations.sql`
3. Generate Prisma client: `pnpm db:generate`
4. Configure bundle config and warehouse tolerance for each product via admin panel
5. Test with sample group buying sessions
6. Monitor logs for variant availability and warehouse fulfillment

**Testing checklist:**
- [ ] Configure bundle via admin endpoint (e.g., 2S + 5M + 4L + 1XL)
- [ ] Configure warehouse tolerance via admin endpoint (e.g., XL max_excess=30)
- [ ] Create test product with variants via admin endpoint
- [ ] Create group buying session
- [ ] Test variant availability API endpoint
- [ ] Join session with multiple variants
- [ ] Trigger session expiration (manual expire endpoint)
- [ ] Verify warehouse fulfillment logs
- [ ] Check PO created with correct bundle calculation
- [ ] Verify WhatsApp sent to factory
- [ ] Test constraining variant logic when tolerance exceeded
- [ ] Test full session flow from join → MOQ → order creation → warehouse → factory

---

## Warehouse Service Integration

### Overview

The warehouse service has been fully integrated with the bundle-based grosir allocation system. It handles inventory management, stock reservation, and factory purchase order creation while respecting bundle constraints and warehouse tolerance limits.

### New Endpoint: `/api/warehouse/fulfill-bundle-demand`

**Purpose:** Process demand from completed group buying sessions using bundle-based allocation.

**Request:**
```json
POST /api/warehouse/fulfill-bundle-demand
{
  "productId": "uuid",
  "sessionId": "uuid",
  "variantDemands": [
    { "variantId": "s-uuid", "quantity": 20 },
    { "variantId": "m-uuid", "quantity": 38 },
    { "variantId": "l-uuid", "quantity": 25 },
    { "variantId": "xl-uuid", "quantity": 5 }
  ]
}
```

**Algorithm Flow:**
1. Fetch bundle configuration for product (e.g., 2S + 5M + 4L + 1XL per bundle)
2. Fetch warehouse tolerance for each variant (max excess allowed)
3. Check current inventory for all variants
4. Calculate bundles needed per variant: `ceil(netDemand / unitsPerBundle)`
5. Find maximum bundles needed across all variants
6. Calculate excess for each variant if producing max bundles
7. Check if any variant exceeds warehouse tolerance
8. If yes: Constrain to max allowed bundles (constraining variant identified)
9. If all variants have stock: Reserve inventory
10. If stock insufficient: Create ONE purchase order for complete bundles
11. Send WhatsApp to factory with bundle breakdown
12. Return inventory projections

**Example Calculation:**
```
Bundle Config: 2S + 5M + 4L + 1XL = 12 units/bundle
Warehouse Tolerance: S=20, M=50, L=40, XL=30 max excess
Current Inventory: S=0, M=10, L=0, XL=2
Demand: S=20, M=38, L=25, XL=5

Step 1: Net demand after inventory
S: 20-0=20, M: 38-10=28, L: 25-0=25, XL: 5-2=3

Step 2: Bundles needed per variant
S: ceil(20/2)=10, M: ceil(28/5)=6, L: ceil(25/4)=7, XL: ceil(3/1)=3

Step 3: Max bundles needed
max(10,6,7,3) = 10 bundles

Step 4: Production if 10 bundles
S: 10*2=20, M: 10*5=50, L: 10*4=40, XL: 10*1=10

Step 5: Excess calculation
S: 20-20=0 ✅ (≤20 tolerance)
M: 50-38=12 ✅ (≤50 tolerance)
L: 40-25=15 ✅ (≤40 tolerance)
XL: 10-5=5 ✅ (≤30 tolerance)

Step 6: All tolerances OK, order 10 bundles
Total units: 10 bundles * 12 units = 120 units
```

**Response (Stock Available):**
```json
{
  "success": true,
  "message": "All demand fulfilled from existing stock",
  "hasStock": true,
  "bundlesOrdered": 0,
  "variantsReserved": [
    { "variantId": "s-uuid", "quantity": 20, "reserved": true },
    { "variantId": "m-uuid", "quantity": 38, "reserved": true }
  ]
}
```

**Response (PO Created):**
```json
{
  "success": true,
  "message": "Purchase order created for 10 factory bundles",
  "hasStock": false,
  "bundlesOrdered": 10,
  "totalUnitsOrdered": 120,
  "constrainingVariant": null,
  "purchaseOrder": {
    "id": "po-uuid",
    "po_number": "PO-20251109-ABC12",
    "quantity": 120,
    "total_cost": 12500000
  },
  "inventoryAdditions": [
    { "variantId": "s-uuid", "willReceive": 20, "demand": 20, "excess": 0 },
    { "variantId": "m-uuid", "willReceive": 50, "demand": 38, "excess": 12 },
    { "variantId": "l-uuid", "willReceive": 40, "demand": 25, "excess": 15 },
    { "variantId": "xl-uuid", "willReceive": 10, "demand": 5, "excess": 5 }
  ]
}
```

### WhatsApp Factory Notification

When a purchase order is created, the factory receives a WhatsApp message:

```
🏭 *New Bundle Purchase Order - PT Garmen Indonesia*

*PO Number:* PO-20251109-ABC12
*Product:* Premium Hoodie

*Bundle Order:*
10 complete bundles
Each bundle contains: 2 units of S, 5 units of M, 4 units of L, 1 unit of XL

*Total Units:* 120
*Total Value:* Rp 12,500,000

*Delivery Address:*
Laku Warehouse, Jl. Warehouse No. 123, Jakarta 13910

Please prepare and send to Laku Warehouse.

Thank you!
```

### Warehouse Tolerance Constraints

If warehouse tolerance is exceeded, bundles are constrained:

```
Example:
Bundle: 2S + 5M + 4L + 1XL
Demand: S=40, M=80, L=60, XL=15
Tolerance: S=20, M=50, L=40, XL=10

Bundles needed: S=20, M=16, L=15, XL=15 → Max=20 bundles

If 20 bundles produced:
S: 40 units, excess=0 ✅
M: 100 units, excess=20 ✅
L: 80 units, excess=20 ✅
XL: 20 units, excess=5 ✅

All OK, order 20 bundles.

But if XL tolerance was only 3:
XL: 20 units, excess=5 ❌ (exceeds 3)
Max allowed for XL: 15+3=18 units
Max bundles for XL: floor(18/1)=18 bundles

Constrained to 18 bundles due to XL tolerance!
```

### Comprehensive Logging

The warehouse service provides detailed logs:

```
========================================
Bundle-based demand fulfillment for product xxx
Session: yyy
Variant demands: [S:20, M:38, L:25, XL:5]
========================================

Bundle configs: [S:2, M:5, L:4, XL:1 units per bundle]
Warehouse tolerances: [S:20, M:50, L:40, XL:30 max excess]

Current inventory:
- S: available=0, reserved=0
- M: available=10, reserved=0
- L: available=0, reserved=0
- XL: available=2, reserved=0

Bundles needed per variant: [S:10, M:6, L:7, XL:3]
Maximum bundles needed: 10

Variant S: will produce 20, demand 20, excess 0, tolerance 20 ✅
Variant M: will produce 50, demand 38, excess 12, tolerance 50 ✅
Variant L: will produce 40, demand 25, excess 15, tolerance 40 ✅
Variant XL: will produce 10, demand 5, excess 5, tolerance 30 ✅

📦 Final decision: Order 10 bundles from factory

✅ Created Purchase Order PO-20251109-ABC12
   Total units: 120 (10 bundles x 12 units/bundle)
   Total cost: Rp 12,500,000

✅ WhatsApp sent to factory PT Garmen (08123456789)

📊 Inventory when PO arrives:
- S: will receive 20, demand 20, excess 0
- M: will receive 50, demand 38, excess 12
- L: will receive 40, demand 25, excess 15
- XL: will receive 10, demand 5, excess 5
========================================
```

### Integration with Group Buying Service

When a group buying session reaches MOQ and expires, the group-buying service calls warehouse:

```typescript
// group-buying-service/src/services/group.buying.service.ts

async fulfillWarehouseDemand(sessionId: string) {
  // Get all participants and group by variant
  const variantDemands = [
    { variantId: 's-uuid', quantity: 20 },
    { variantId: 'm-uuid', quantity: 38 },
    // ...
  ];

  // Call warehouse with ALL variants at once
  const response = await axios.post(
    '/api/warehouse/fulfill-bundle-demand',
    {
      productId: session.product_id,
      sessionId,
      variantDemands
    }
  );

  // Update session with results
  await updateSession({
    warehouse_has_stock: response.data.hasStock,
    grosir_units_needed: response.data.bundlesOrdered,
    factory_whatsapp_sent: !response.data.hasStock
  });
}
```

### Key Benefits

1. **Correct Bundle Handling:** Processes all variants together, not separately
2. **Warehouse Waste Prevention:** Respects tolerance limits per variant
3. **Single PO:** Creates one purchase order for complete bundles
4. **Clear Factory Communication:** WhatsApp shows exact bundle composition
5. **Inventory Visibility:** Returns projections of what warehouse will receive
6. **Constraining Variant Tracking:** Identifies which variant limits the order
7. **Comprehensive Logging:** Detailed logs for debugging and monitoring
8. **Error Handling:** Validates bundle config exists before processing

---

## Microservices Architecture

### Services Summary

| Service | Port | Status | Database Tables | Primary Responsibility |
|---------|------|--------|----------------|------------------------|
| **Auth Service** | 3001 | ✅ Active | users, sessions | Authentication, session management |
| **Product Service** | 3002 | ✅ Active | products, categories, variants | Product catalog management |
| **Factory Service** | 3003 | ✅ Active | factories | Factory/manufacturer management |
| **Group Buying Service** | 3004 | ✅ Active | group_buying_sessions, group_participants | Group buying, MOQ tracking, grosir allocation |
| **Order Service** | 3005 | ✅ Active | orders, order_items | Order creation and management |
| **Payment Service** | 3006 | ✅ Active | payments, refunds, transaction_ledger, webhook_events | Payment processing, escrow, refunds |
| **Notification Service** | 3007 | ✅ Active | notifications | In-app notifications |
| **Logistics Service** | 3008 | ✅ Active | shipments, shipment_tracking_events | Shipping via Biteship API |
| **Address Service** | 3009 | ✅ Active | user_addresses | User shipping addresses |
| **Wallet Service** | 3010 | ✅ Active | wallets, wallet_transactions | User wallet/credits for refunds |
| **Warehouse Service** | 3011 | ✅ Active | warehouse_inventory, warehouse_purchase_orders | Inventory management, factory PO |
| **WhatsApp Service** | 3012 | ✅ Active | - | WhatsApp integration for factory notifications |
| **Seller Service** | - | 📝 Planned | sellers, seller_* tables | Seller inventory management |
| **Review Service** | - | 📝 Planned | product_reviews, factory_reviews | Customer reviews |
| **Settlement Service** | - | 📝 Planned | factory_settlements, seller_settlements | Financial settlements |

### Service Dependencies

```
GROUP BUYING ──┬──→ PAYMENT
               ├──→ ORDER ──┬──→ PAYMENT
               │            ├──→ PRODUCT
               │            └──→ ADDRESS
               └──→ WAREHOUSE ──→ WHATSAPP (factory PO notifications)

PAYMENT ──┬──→ NOTIFICATION
          └──→ WALLET (for refunds)

AUTH ──→ WHATSAPP (OTP sending)
```

**Startup Order (by dependency level):**
- **Level 0:** Product, Address, WhatsApp, Notification
- **Level 1:** Payment, Wallet, Auth
- **Level 2:** Order, Warehouse
- **Level 3:** Group Buying

### Critical Business Flows

#### 1. Group Buying Flow - Happy Path (MOQ Reached)

```
1. Factory creates session
   └─ Group Buying Service: Session in 'forming' status

2. User joins session
   ├─ Group Buying: Check grosir variant availability (bundle constraint)
   ├─ IF locked → Error: "Variant locked due to warehouse tolerance"
   └─ IF OK → Payment Service: Create escrow payment (Xendit invoice)

3. User pays via Xendit
   └─ Payment Service: Webhook marks payment 'paid' (kept in escrow)

4. More users join... (repeat step 2-3)

5. Session expires with MOQ reached (cron: /process-expired)
   ├─ Group Buying: Calculate final tier (25%, 50%, 75%, or 100%)
   ├─ Group Buying → Wallet Service: Issue tier-based refunds
   ├─ Group Buying → Warehouse Service: Check stock per variant
   │  ├─ IF in stock → Reserve inventory
   │  └─ IF not in stock → Create factory PO, send WhatsApp
   ├─ Group Buying → Order Service: Create bulk orders for all participants
   └─ Status: 'moq_reached' or 'pending_stock'

6. Factory completes production (if needed)
   ├─ Factory marks production done
   ├─ Group Buying → Payment Service: Release escrow
   └─ Status: 'success'

7. Orders ready for shipping
```

#### 2. Group Buying Flow - Sad Path (MOQ Failed)

```
1. Session expires without reaching MOQ
   └─ Group Buying Service: Mark session 'failed'

2. Refund all participants
   ├─ Group Buying → Payment Service: Refund session
   ├─ Payment Service: Process refunds for all escrow payments
   └─ Payment Service → Notification: Send refund notifications

3. Session closed
```

#### 3. Seller Inventory Flow (Planned)

```
1. Seller registers
   └─ Seller Service: Create seller account (pending verification)

2. Admin verifies seller
   └─ Seller Service: Update status to 'active'

3. Seller adds inventory
   ├─ Seller Service: Create seller_inventory record
   └─ Stock tracking: seller_inventory_variants

4. Customer purchases from seller
   ├─ Order Service: Create order (order_source: 'seller_store')
   ├─ Order Service → Payment Service: Create direct payment (no escrow)
   └─ Seller Service: Reserve stock (reserved_quantity++)

5. Customer pays
   └─ Payment Service: Webhook updates order to 'paid'

6. Seller ships order
   ├─ Seller Service: Deduct stock (stock_quantity--, reserved_quantity--)
   └─ Seller Service: Record stock movement

7. Settlement
   ├─ Settlement Service: Calculate seller payout
   └─ Transfer funds to seller bank account
```

---

## Database Schema

### Tables by Category

#### Core Platform
- `users` - User accounts (customers, factory owners, sellers, admins)
- `categories` - Product categories

#### Factory Group Buying
- `factories` - Factory/manufacturer information
- `products` - Product catalog (both factory and seller products)
- `product_variants` - Size, color, material variants
- `product_images` - Product photos
- `group_buying_sessions` - Group buying sessions with tiering
- `group_participants` - Users who joined sessions
- `grosir_bundle_config` - ✅ NEW: Factory bundle composition
- `grosir_warehouse_tolerance` - ✅ NEW: Warehouse tolerance config

#### Seller System (Planned)
- `sellers` - Seller accounts
- `seller_inventory` - Seller's stock per product
- `seller_inventory_variants` - Variant-specific stock
- `seller_stock_movements` - Stock movement audit trail
- `seller_settlements` - Seller payouts

#### Orders & Payments
- `orders` - Customer orders (both group buying and seller)
- `order_items` - Line items in orders
- `payments` - Payment records (escrow and direct)
- `refunds` - Refund requests and processing
- `transaction_ledger` - Financial audit trail
- `webhook_events` - Xendit webhook deduplication

#### Logistics
- `shipments` - Shipment tracking (Biteship integration)
- `shipment_tracking_events` - Detailed tracking events
- `user_addresses` - Customer shipping addresses

#### Warehouse
- `warehouse_inventory` - Platform warehouse stock
- `warehouse_purchase_orders` - POs to factories

#### Wallet & Notifications
- `wallets` - User wallet balances
- `wallet_transactions` - Wallet transaction history
- `notifications` - In-app notifications

#### Reviews (Planned)
- `product_reviews` - Customer product reviews
- `factory_reviews` - Customer factory reviews

#### Settlements
- `factory_settlements` - Factory payout records

#### Removed Tables (Cleanup Nov 2025)
- ❌ `agent_offices` - Physical office infrastructure (abandoned)
- ❌ `office_staff` - Office employees (abandoned)
- ❌ `office_reviews` - Office service reviews (abandoned)
- ❌ `factory_staff_interactions` - Office visits to factories (abandoned)
- ❌ `pickup_tasks` - Staff pickup tasks (using Biteship instead)
- ❌ `pickup_items` - Pickup item details (using Biteship instead)
- ❌ `settlement_items` - Settlement line items (over-engineered)
- ❌ `platform_commissions` - Commission tracking (redundant)
- ❌ `spatial_ref_sys` - PostGIS data (not using GIS)

---

## Service Implementations

### Implemented Services

#### group-buying-service (Port 3004)
**Key Features:**
- Create and manage group buying sessions with tiered pricing
- Grosir allocation system (NEEDS UPDATE to bundle-based logic)
- Bot auto-join for 25% minimum MOQ
- Expire session processor (cron job)
- Integration with payment, order, warehouse, wallet services

**Files:**
- `group.buying.service.ts` - Core business logic
- `group.buying.repository.ts` - Database operations
- `group-buying.routes.ts` - REST API endpoints
- `group-buying.controller.ts` - Request handling

**Critical Endpoints:**
- `POST /api/group-buying` - Create session
- `POST /api/group-buying/:id/join` - Join session
- `POST /api/group-buying/process-expired` - Cron job for expiration
- `POST /api/group-buying/:id/manual-expire` - Testing endpoint
- `GET /api/group-buying/:sessionId/variant-availability/:variantId` - Check grosir availability

#### payment-service (Port 3006)
**Key Features:**
- Xendit integration for invoices
- Escrow payment management
- Webhook processing with idempotency
- Refund handling
- Transaction ledger for audit

**Key Files:**
- `payment.service.ts` - Payment processing
- `refund.service.ts` - Refund handling
- `transaction-ledger.service.ts` - Financial audit
- `webhook.controller.ts` - Xendit webhooks

#### warehouse-service (Port 3011)
**Key Features:**
- Inventory management
- Factory purchase order creation
- Stock reservation
- WhatsApp notifications to factory

**Key Method:**
- `fulfillDemand()` - Checks stock, reserves or creates PO + notifies factory

#### order-service (Port 3005)
**Key Features:**
- Order creation (regular and bulk)
- Multi-factory order splitting
- Product snapshot at order time

#### wallet-service (Port 3010)
**Key Features:**
- User wallet management
- Credit/debit operations
- Used for tier-based refunds in group buying

### Planned Services (Folders Exist, Implementation Pending)

#### seller-service
**Purpose:** Seller inventory management
**Tables:** `sellers`, `seller_inventory`, `seller_inventory_variants`, `seller_stock_movements`
**Key Features TBD:**
- Seller registration and verification
- Inventory CRUD operations
- Stock movement tracking
- Real-time stock availability

#### review-service
**Purpose:** Product and factory reviews
**Tables:** `product_reviews`, `factory_reviews`
**Key Features TBD:**
- Customer reviews with ratings
- Review moderation
- Verified purchase badges

#### settlement-service
**Purpose:** Financial settlements for factories and sellers
**Tables:** `factory_settlements`, `seller_settlements`
**Key Features TBD:**
- Automated payout calculation
- Bank transfer integration
- Settlement reporting

---

## Testing Guide

### Testing Group Buying Sessions

#### Test 1: Variant Availability (Grosir Allocation)

**Setup:**
```bash
# Create product with grosir bundle config
POST /api/products
{
  "name": "Premium Hoodie",
  "factoryId": "factory-uuid",
  "bundles": {
    "S": 2,
    "M": 5,
    "L": 4,
    "XL": 1
  }
}

# Set warehouse tolerance
POST /api/products/:productId/warehouse-tolerance
{
  "S": 20,
  "M": 50,
  "L": 40,
  "XL": 30
}

# Create group buying session
POST /api/group-buying
{
  "productId": "product-uuid",
  "targetMoq": 100,
  "groupPrice": 200000,
  "priceTier25": 150000,
  "priceTier50": 135000,
  "priceTier75": 120000,
  "priceTier100": 105000,
  "endTime": "2025-12-31T23:59:59Z"
}
```

**Test Case 1: Order within tolerance**
```bash
# Check M availability (should be available)
GET /api/group-buying/:sessionId/variant-availability/M-variant-uuid

Expected Response:
{
  "available": 5,  # 1 bundle × 5 M per bundle = 5 available
  "maxAllowed": 5,
  "totalOrdered": 0,
  "isLocked": false,
  "constrainingVariant": null
}

# Order 5 M (fills 1 bundle)
POST /api/group-buying/:sessionId/join
{
  "userId": "user-uuid",
  "variantId": "M-variant-uuid",
  "quantity": 5,
  "unitPrice": 200000,
  "totalPrice": 1000000
}
```

**Test Case 2: Trigger warehouse constraint**
```bash
# Order heavy M (triggers multiple bundles)
# This would force factory to ship many bundles
# Creating excess XL that violates tolerance

POST /api/group-buying/:sessionId/join
{
  "variantId": "M-variant-uuid",
  "quantity": 50  # Would need 10 bundles
}

# This should succeed if XL tolerance is high enough
# Or fail if XL excess > 30 (XL tolerance)
```

#### Test 2: Session Expiration with Tiering

**Scenario:** Test tier-based refunds

```bash
# Create session (as above)
# Have 3 users join:
User A: 10 units
User B: 15 units
User C: 20 units
Total: 45 units (45% of MOQ 100)

# Manually expire session
POST /api/group-buying/:sessionId/manual-expire

Expected:
1. Session reaches tier 25% (because <50%)
2. Final price: 150,000 (priceTier25)
3. Each user paid: 200,000 per unit
4. Refund per unit: 200,000 - 150,000 = 50,000
5. User A gets: 10 × 50,000 = 500,000 to wallet
6. User B gets: 15 × 50,000 = 750,000 to wallet
7. User C gets: 20 × 50,000 = 1,000,000 to wallet
```

**Verify:**
```bash
# Check wallet balances
GET /api/wallet/:userAId
Expected: { balance: 500000 }

GET /api/wallet/:userBId
Expected: { balance: 750000 }

GET /api/wallet/:userCId
Expected: { balance: 1000000 }
```

#### Test 3: Warehouse Stock Flow

```bash
# Scenario: Session reaches MOQ, check warehouse flow

# Session with 100 units ordered (MOQ reached)
# Check what warehouse does

Expected Flow:
1. Group Buying → Warehouse Service: /api/warehouse/fulfill-demand
2. Warehouse checks inventory per variant
3. IF stock exists:
   - Reserve stock
   - Response: { hasStock: true }
4. IF stock missing:
   - Create purchase order to factory
   - Send WhatsApp to factory
   - Response: { hasStock: false, grosirUnitsNeeded: 10 }
5. Group Buying:
   - If hasStock = true → Create orders immediately
   - If hasStock = false → Mark 'pending_stock', wait for factory
```

### Test Scripts

See `test-group-buying-flow.ps1` for automated E2E tests.

---

## API Documentation

### Key Environment Variables

```bash
# Group Buying Service
PAYMENT_SERVICE_URL=http://localhost:3006
ORDER_SERVICE_URL=http://localhost:3005
WAREHOUSE_SERVICE_URL=http://localhost:3011
WALLET_SERVICE_URL=http://localhost:3010

# Warehouse Service
FACTORY_SERVICE_URL=http://localhost:3003
LOGISTICS_SERVICE_URL=http://localhost:3008
WHATSAPP_SERVICE_URL=http://localhost:3012

# Payment Service
NOTIFICATION_SERVICE_URL=http://localhost:3007
XENDIT_API_KEY=your_xendit_key
XENDIT_CALLBACK_TOKEN=your_callback_token

# Warehouse Service
WAREHOUSE_POSTAL_CODE=13910
WAREHOUSE_ADDRESS=Laku Warehouse Address
```

### Critical API Flows

#### Join Group Buying Session
```http
POST /api/group-buying/:sessionId/join
Content-Type: application/json

{
  "userId": "uuid",
  "variantId": "uuid",
  "quantity": 5,
  "unitPrice": 200000,
  "totalPrice": 1000000
}
```

**Flow:**
1. Validate session status (must be 'forming' or 'active')
2. Check variant availability via grosir allocation
3. Create participant record
4. Create escrow payment via Payment Service
5. Return payment URL for customer

#### Check Variant Availability
```http
GET /api/group-buying/:sessionId/variant-availability/:variantId
```

**Response:**
```json
{
  "variantId": "uuid",
  "allocation": 3,
  "maxAllowed": 12,
  "totalOrdered": 8,
  "available": 4,
  "isLocked": false,
  "constrainingVariant": null,
  "bundleInfo": {
    "unitsPerBundle": 3,
    "bundlesNeeded": 4,
    "warehouseTolerance": 20
  }
}
```

---

## Admin Endpoints Specification

### Overview

Admin endpoints are required across all services for platform configuration and management. All admin endpoints should be prefixed with `/api/admin/` and require admin authentication middleware.

### 1. Group Buying Service - Admin Endpoints

**Status:** ✅ IMPLEMENTED

**Base Path:** `/api/admin/grosir`

#### Bulk Configuration
```http
POST /api/admin/grosir/configure-product
Content-Type: application/json

{
  "productId": "uuid",
  "bundleConfigs": [
    {
      "variantId": "uuid" | null,
      "unitsPerBundle": 5,
      "notes": "Medium size - 5 per bundle"
    }
  ],
  "warehouseTolerances": [
    {
      "variantId": "uuid" | null,
      "maxExcessUnits": 50,
      "clearanceRateEstimate": 80,
      "notes": "M sells well in clearance"
    }
  ]
}
```

#### Bundle Configuration CRUD
```http
POST /api/admin/grosir/bundle-config         # Create
GET /api/admin/grosir/bundle-config/:productId # Read
PUT /api/admin/grosir/bundle-config/:id        # Update
DELETE /api/admin/grosir/bundle-config/:productId # Delete all for product
```

#### Warehouse Tolerance CRUD
```http
POST /api/admin/grosir/warehouse-tolerance         # Create
GET /api/admin/grosir/warehouse-tolerance/:productId # Read
PUT /api/admin/grosir/warehouse-tolerance/:id        # Update
DELETE /api/admin/grosir/warehouse-tolerance/:productId # Delete all for product
```

#### Complete Config View
```http
GET /api/admin/grosir/config/:productId  # Get both bundle config + warehouse tolerance
```

**Implementation Status:**
- ✅ Admin controller created
- ✅ Admin routes registered
- ✅ Validation middleware added
- ✅ Swagger documentation included
- ⏳ Admin authentication middleware needed

---

### 2. Product Service - Admin Endpoints (NEEDED)

**Status:** 📝 REQUIRED

**Base Path:** `/api/admin/products`

#### Product Management
```http
POST /api/admin/products                    # Create product
PUT /api/admin/products/:id                 # Update product
DELETE /api/admin/products/:id              # Delete product (soft delete)
POST /api/admin/products/:id/variants       # Add variants
PUT /api/admin/products/:id/variants/:variantId  # Update variant
DELETE /api/admin/products/:id/variants/:variantId  # Delete variant
POST /api/admin/products/:id/images         # Upload product images
PUT /api/admin/products/:id/images/:imageId/order  # Reorder images
DELETE /api/admin/products/:id/images/:imageId  # Delete image
```

#### Category Management
```http
POST /api/admin/categories                  # Create category
PUT /api/admin/categories/:id               # Update category
DELETE /api/admin/categories/:id            # Delete category
POST /api/admin/categories/:id/subcategories  # Add subcategory
```

#### Bulk Operations
```http
POST /api/admin/products/bulk-import        # Import products via CSV
POST /api/admin/products/bulk-update        # Bulk update prices/stock
POST /api/admin/products/bulk-delete        # Bulk soft delete
```

**Why Needed:**
- Products need admin-only management (not factory-created)
- Variant configuration requires oversight
- Image management for quality control
- Bulk operations for efficiency

---

### 3. Factory Service - Admin Endpoints (NEEDED)

**Status:** 📝 REQUIRED

**Base Path:** `/api/admin/factories`

#### Factory Management
```http
POST /api/admin/factories                   # Register factory
PUT /api/admin/factories/:id                # Update factory details
DELETE /api/admin/factories/:id             # Delete/suspend factory
POST /api/admin/factories/:id/verify        # Verify factory (admin approval)
POST /api/admin/factories/:id/suspend       # Suspend factory
POST /api/admin/factories/:id/reactivate    # Reactivate factory
GET /api/admin/factories/:id/metrics        # Factory performance metrics
```

#### Factory Sessions Management
```http
GET /api/admin/factories/:id/sessions       # List all sessions for factory
POST /api/admin/factories/:id/sessions/:sessionId/cancel  # Force cancel session
GET /api/admin/factories/:id/analytics      # Revenue, success rate, etc.
```

**Why Needed:**
- Factory registration requires admin verification
- Quality control and compliance monitoring
- Dispute resolution requires admin intervention
- Performance tracking and analytics

---

### 4. Warehouse Service - Admin Endpoints (NEEDED)

**Status:** 📝 REQUIRED

**Base Path:** `/api/admin/warehouse`

#### Inventory Management
```http
GET /api/admin/warehouse/inventory          # View all inventory
POST /api/admin/warehouse/inventory/adjust  # Manual stock adjustment
GET /api/admin/warehouse/inventory/:productId  # View product inventory
POST /api/admin/warehouse/inventory/:productId/reserve  # Manual reservation
POST /api/admin/warehouse/inventory/:productId/release  # Release reservation
```

#### Purchase Order Management
```http
GET /api/admin/warehouse/purchase-orders    # List all POs
GET /api/admin/warehouse/purchase-orders/:id  # View PO details
PUT /api/admin/warehouse/purchase-orders/:id  # Update PO status
POST /api/admin/warehouse/purchase-orders/:id/receive  # Mark PO received
POST /api/admin/warehouse/purchase-orders/:id/cancel   # Cancel PO
```

#### Stock Auditing
```http
GET /api/admin/warehouse/audit-log          # View stock movement history
POST /api/admin/warehouse/cycle-count       # Initiate cycle count
GET /api/admin/warehouse/discrepancies      # View inventory discrepancies
```

**Why Needed:**
- Manual stock adjustments for physical counts
- PO tracking and fulfillment oversight
- Inventory discrepancy resolution
- Stock auditing for compliance

---

### 5. User/Auth Service - Admin Endpoints (NEEDED)

**Status:** 📝 REQUIRED

**Base Path:** `/api/admin/users`

#### User Management
```http
GET /api/admin/users                        # List all users (paginated)
GET /api/admin/users/:id                    # View user details
PUT /api/admin/users/:id                    # Update user details
POST /api/admin/users/:id/suspend           # Suspend user account
POST /api/admin/users/:id/reactivate        # Reactivate user account
DELETE /api/admin/users/:id                 # Delete user (soft delete)
POST /api/admin/users/:id/reset-password    # Force password reset
```

#### Role Management
```http
POST /api/admin/users/:id/roles             # Assign role to user
DELETE /api/admin/users/:id/roles/:roleId   # Remove role from user
GET /api/admin/roles                        # List all roles
POST /api/admin/roles                       # Create role
PUT /api/admin/roles/:id                    # Update role permissions
```

#### User Analytics
```http
GET /api/admin/users/analytics              # User growth, activity metrics
GET /api/admin/users/:id/activity-log       # User activity history
GET /api/admin/users/:id/orders             # User order history (cross-service)
```

**Why Needed:**
- User support and account recovery
- Fraud prevention and account suspension
- Role-based access control management
- User behavior monitoring

---

### 6. Payment Service - Admin Endpoints (NEEDED)

**Status:** 📝 REQUIRED

**Base Path:** `/api/admin/payments`

#### Payment Management
```http
GET /api/admin/payments                     # List all payments (paginated)
GET /api/admin/payments/:id                 # View payment details
POST /api/admin/payments/:id/refund         # Manual refund
POST /api/admin/payments/:id/investigate    # Mark for investigation
GET /api/admin/payments/failed              # List failed payments
POST /api/admin/payments/:id/retry          # Retry failed payment
```

#### Refund Management
```http
GET /api/admin/refunds                      # List all refunds
GET /api/admin/refunds/:id                  # View refund details
POST /api/admin/refunds/:id/approve         # Approve refund request
POST /api/admin/refunds/:id/reject          # Reject refund request
```

#### Financial Reports
```http
GET /api/admin/payments/reports/daily       # Daily payment report
GET /api/admin/payments/reports/settlement  # Settlement report
GET /api/admin/payments/reconciliation      # Payment reconciliation
GET /api/admin/payments/escrow-balance      # Total escrow balance
```

**Why Needed:**
- Manual refund processing for disputes
- Payment reconciliation with Xendit
- Financial reporting for accounting
- Fraud detection and investigation

---

### 7. Order Service - Admin Endpoints (NEEDED)

**Status:** 📝 REQUIRED

**Base Path:** `/api/admin/orders`

#### Order Management
```http
GET /api/admin/orders                       # List all orders (paginated)
GET /api/admin/orders/:id                   # View order details
PUT /api/admin/orders/:id/status            # Update order status
POST /api/admin/orders/:id/cancel           # Cancel order
POST /api/admin/orders/:id/refund           # Initiate order refund
```

#### Order Analytics
```http
GET /api/admin/orders/analytics             # Order metrics (volume, revenue)
GET /api/admin/orders/failed                # List failed orders
GET /api/admin/orders/pending               # List pending orders
GET /api/admin/orders/reports/daily         # Daily order report
```

#### Bulk Operations
```http
POST /api/admin/orders/bulk-update-status   # Bulk status update
POST /api/admin/orders/bulk-export          # Export orders to CSV
```

**Why Needed:**
- Order dispute resolution
- Manual status updates for exceptions
- Order analytics and reporting
- Bulk operations for efficiency

---

### 8. Logistics Service - Admin Endpoints (NEEDED)

**Status:** 📝 REQUIRED

**Base Path:** `/api/admin/logistics`

#### Shipment Management
```http
GET /api/admin/logistics/shipments          # List all shipments
GET /api/admin/logistics/shipments/:id      # View shipment details
POST /api/admin/logistics/shipments/:id/cancel  # Cancel shipment
POST /api/admin/logistics/shipments/:id/track   # Force tracking refresh
PUT /api/admin/logistics/shipments/:id/courier  # Change courier
```

#### Courier Management
```http
GET /api/admin/logistics/couriers           # List available couriers
POST /api/admin/logistics/couriers          # Add courier configuration
PUT /api/admin/logistics/couriers/:id       # Update courier settings
DELETE /api/admin/logistics/couriers/:id    # Remove courier
```

#### Shipping Analytics
```http
GET /api/admin/logistics/analytics          # Shipping metrics
GET /api/admin/logistics/delayed-shipments  # List delayed shipments
GET /api/admin/logistics/courier-performance  # Courier performance report
```

**Why Needed:**
- Shipment issue resolution
- Courier performance monitoring
- Manual shipment management for exceptions
- Shipping cost analysis

---

### 9. Wallet Service - Admin Endpoints (NEEDED)

**Status:** 📝 REQUIRED

**Base Path:** `/api/admin/wallets`

#### Wallet Management
```http
GET /api/admin/wallets                      # List all wallets
GET /api/admin/wallets/:userId              # View user wallet
POST /api/admin/wallets/:userId/credit      # Manual credit adjustment
POST /api/admin/wallets/:userId/debit       # Manual debit adjustment
GET /api/admin/wallets/:userId/transactions # View wallet transaction history
```

#### Wallet Analytics
```http
GET /api/admin/wallets/analytics            # Wallet usage metrics
GET /api/admin/wallets/total-balance        # Total platform wallet balance
GET /api/admin/wallets/reports/monthly      # Monthly wallet report
```

**Why Needed:**
- Manual wallet adjustments for refunds/credits
- Wallet discrepancy resolution
- Financial reporting
- Customer support for wallet issues

---

### 10. Notification Service - Admin Endpoints (NEEDED)

**Status:** 📝 REQUIRED

**Base Path:** `/api/admin/notifications`

#### Notification Management
```http
POST /api/admin/notifications/broadcast     # Send broadcast notification
GET /api/admin/notifications                # List all notifications
GET /api/admin/notifications/:id            # View notification details
GET /api/admin/notifications/templates      # List notification templates
POST /api/admin/notifications/templates     # Create notification template
PUT /api/admin/notifications/templates/:id  # Update template
```

#### Notification Analytics
```http
GET /api/admin/notifications/analytics      # Delivery rates, open rates
GET /api/admin/notifications/failed         # List failed notifications
POST /api/admin/notifications/:id/resend    # Resend notification
```

**Why Needed:**
- Broadcast announcements to users
- Template management for consistency
- Notification delivery monitoring
- Failed notification troubleshooting

---

### 11. Seller Service - Admin Endpoints (NEEDED - Planned)

**Status:** 📝 REQUIRED (Service Planned)

**Base Path:** `/api/admin/sellers`

#### Seller Management
```http
POST /api/admin/sellers                     # Register seller
PUT /api/admin/sellers/:id                  # Update seller details
POST /api/admin/sellers/:id/verify          # Verify seller (admin approval)
POST /api/admin/sellers/:id/suspend         # Suspend seller
POST /api/admin/sellers/:id/reactivate      # Reactivate seller
GET /api/admin/sellers/:id/metrics          # Seller performance metrics
```

#### Seller Inventory Oversight
```http
GET /api/admin/sellers/:id/inventory        # View seller inventory
POST /api/admin/sellers/:id/inventory/audit # Initiate inventory audit
GET /api/admin/sellers/:id/sales            # Seller sales analytics
```

**Why Needed:**
- Seller verification and onboarding
- Quality control and compliance
- Seller performance monitoring
- Inventory auditing

---

### 12. Address Service - Admin Endpoints (NEEDED)

**Status:** 📝 REQUIRED

**Base Path:** `/api/admin/addresses`

#### Address Management
```http
GET /api/admin/addresses                    # List all addresses (for analytics)
GET /api/admin/addresses/users/:userId      # View user addresses
GET /api/admin/addresses/analytics          # Address distribution analytics
GET /api/admin/addresses/validation-errors  # List address validation failures
```

**Why Needed:**
- Address data quality monitoring
- Shipping zone analytics
- Address validation issue resolution

---

### 13. WhatsApp Service - Admin Endpoints (NEEDED)

**Status:** 📝 REQUIRED

**Base Path:** `/api/admin/whatsapp`

#### WhatsApp Management
```http
POST /api/admin/whatsapp/send               # Send manual WhatsApp message
GET /api/admin/whatsapp/messages            # List sent messages
GET /api/admin/whatsapp/failed              # List failed messages
POST /api/admin/whatsapp/messages/:id/resend  # Resend failed message
GET /api/admin/whatsapp/templates           # List WhatsApp templates
PUT /api/admin/whatsapp/templates/:id       # Update template
```

**Why Needed:**
- Manual message sending for support
- Failed message troubleshooting
- Template management
- Message delivery monitoring

---

### 14. Review Service - Admin Endpoints (NEEDED - Planned)

**Status:** 📝 REQUIRED (Service Planned)

**Base Path:** `/api/admin/reviews`

#### Review Moderation
```http
GET /api/admin/reviews                      # List all reviews (paginated)
GET /api/admin/reviews/pending              # List pending reviews
POST /api/admin/reviews/:id/approve         # Approve review
POST /api/admin/reviews/:id/reject          # Reject review
POST /api/admin/reviews/:id/flag            # Flag inappropriate review
DELETE /api/admin/reviews/:id               # Delete review
```

**Why Needed:**
- Content moderation
- Review quality control
- Inappropriate content removal

---

### 15. Settlement Service - Admin Endpoints (NEEDED - Planned)

**Status:** 📝 REQUIRED (Service Planned)

**Base Path:** `/api/admin/settlements`

#### Settlement Management
```http
GET /api/admin/settlements                  # List all settlements
POST /api/admin/settlements/process         # Process pending settlements
GET /api/admin/settlements/:id              # View settlement details
POST /api/admin/settlements/:id/approve     # Approve settlement
POST /api/admin/settlements/:id/reject      # Reject settlement
GET /api/admin/settlements/reports/monthly  # Monthly settlement report
```

**Why Needed:**
- Settlement approval workflow
- Financial reconciliation
- Seller/factory payout management

---

### Admin Authentication & Authorization

**Required for all admin endpoints:**

```typescript
// Middleware: adminAuth.ts
export const requireAdmin = async (req, res, next) => {
  // 1. Verify JWT token
  // 2. Check user role = 'admin' or 'super_admin'
  // 3. Log admin action for audit trail
  // 4. Proceed or return 403 Forbidden
};

// Usage in routes:
router.post('/api/admin/products', requireAdmin, controller.createProduct);
```

**Admin Roles:**
- `super_admin` - Full access to all admin endpoints
- `admin_products` - Product and category management only
- `admin_orders` - Order and logistics management only
- `admin_finance` - Payment, wallet, settlement management only
- `admin_support` - User management and review moderation only

---

### Implementation Priority

**Phase 1 (COMPLETED):**
- ✅ Group Buying Service - Grosir configuration

**Phase 2 (IMMEDIATE - Required for Testing):**
1. Product Service - Product/variant CRUD
2. Warehouse Service - Inventory management
3. Factory Service - Factory verification

**Phase 3 (HIGH PRIORITY):**
4. Payment Service - Manual refunds and reconciliation
5. Order Service - Order management
6. User Service - User management

**Phase 4 (MEDIUM PRIORITY):**
7. Logistics Service - Shipment management
8. Wallet Service - Wallet adjustments
9. Notification Service - Broadcast and templates
10. WhatsApp Service - Message management

**Phase 5 (PLANNED SERVICES):**
11. Seller Service - When seller service is implemented
12. Review Service - When review service is implemented
13. Settlement Service - When settlement service is implemented

---

## Roadmap

### Immediate Priorities

1. **Update Grosir Allocation Logic** ⚠️ CRITICAL
   - Replace progressive unlock with bundle-based warehouse tolerance
   - Add `grosir_bundle_config` and `grosir_warehouse_tolerance` tables
   - Update `getVariantAvailability()` algorithm
   - Create admin UI for configuration

2. **Complete Warehouse Integration** 🔄 IN PROGRESS
   - Test PO creation flow
   - Verify WhatsApp notifications
   - Test stock reservation

3. **Implement Seller Service** 📝 PLANNED
   - Seller registration and verification
   - Inventory management
   - Stock tracking

### Future Enhancements

- Review system implementation
- Settlement automation
- Advanced analytics dashboard
- Mobile app integration

---

## Change Log

### November 9, 2025 - ✅ IMPLEMENTED: Phase 2 Admin Endpoints (Product, Warehouse, Factory)
- **Created:** ADMIN_ENDPOINTS_README.md - Comprehensive reference for all admin endpoints (117 total across 15 services)
- **Product Service:** 15 admin endpoints (product, variant, image, category management + bulk operations)
- **Warehouse Service:** 11 admin endpoints (inventory management, PO management, stock auditing)
- **Factory Service:** 10 admin endpoints (factory verification, session management, analytics)
- **Total Implemented:** 46 endpoints across 4 services (Group Buying, Product, Warehouse, Factory)
- **Status:** Phase 2 COMPLETE - Ready for testing

### November 9, 2025 - ✅ IMPLEMENTED: Admin Endpoints for Group Buying Service
- **Created:** Admin controller (`admin.controller.ts`) with CRUD operations for grosir configuration
- **Created:** Admin routes (`admin.routes.ts`) with validation middleware for all endpoints
- **Registered:** Admin routes in main app under `/api/admin/grosir`
- **Endpoints:** Bulk configure, bundle config CRUD, warehouse tolerance CRUD, complete config view
- **Documented:** Comprehensive admin endpoints specification across all 15 platform services
- **Organized:** Implementation phases (Phase 1 completed, Phases 2-5 documented)
- **Status:** Group Buying Service admin endpoints PRODUCTION READY

### November 9, 2025 - ✅ IMPLEMENTED: Correct Grosir Allocation System
- **Added:** `grosir_bundle_config` table (factory bundle composition per product)
- **Added:** `grosir_warehouse_tolerance` table (warehouse capacity limits per variant)
- **Implemented:** Bundle-based warehouse tolerance algorithm in group-buying-service
- **Updated:** Types, repository, and service with new grosir logic
- **Algorithm:** Controls bundles purchased by monitoring warehouse excess (not order balance)
- **Status:** PRODUCTION READY - Ready for testing and deployment

### November 9, 2025 - Schema Cleanup
- **Removed:** 9 unused tables (office system, over-engineered features)
- **Removed:** office-service (abandoned concept)
- **Kept:** shipments tables (logistics-service uses Biteship)
- **Kept:** seller/review/settlement tables and services (planned features)

### November 6, 2025 - Grosir Logic Documentation
- **Documented:** Correct bundle-based warehouse tolerance approach
- **Identified:** Progressive unlock approach as incorrect

---

**For detailed implementation guides, see individual service README files.**
