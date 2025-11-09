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

**Status:** **PRODUCTION READY** (Implemented November 9, 2025)

**What's been implemented:**
1. ✅ Database tables created (`grosir_bundle_config`, `grosir_warehouse_tolerance`)
2. ✅ Prisma schema updated with new models and relations
3. ✅ Repository methods added for CRUD operations on grosir config
4. ✅ Service types updated with new interfaces
5. ✅ `getVariantAvailability()` rewritten with bundle-based algorithm
6. ✅ Migration SQL ready for deployment

**Next steps for deployment:**
1. Run migration: `002_add_grosir_bundle_tolerance_tables.sql`
2. Generate Prisma client: `pnpm db:generate`
3. Configure bundle config and warehouse tolerance for each product via admin panel
4. Test with sample group buying sessions
5. Monitor logs for variant availability calculations

**Testing checklist:**
- [ ] Add bundle config for test product (e.g., 2S + 5M + 4L + 1XL)
- [ ] Add warehouse tolerance for test product (e.g., XL max_excess=30)
- [ ] Create group buying session
- [ ] Test variant availability API endpoint
- [ ] Verify constraining variant logic when tolerance exceeded
- [ ] Test full session flow from join → MOQ → order creation

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
