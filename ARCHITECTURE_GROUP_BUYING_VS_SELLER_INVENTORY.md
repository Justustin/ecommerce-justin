# E-Commerce Platform Architecture: Group Buying vs Seller Inventory

## Current Situation Analysis

### The Confusion
Your platform currently has **TWO conflicting inventory concepts** in the same tables:

1. **Factory Group Buying** (Make-to-Order)
   - Products don't have stock upfront
   - Factory produces AFTER group buying session succeeds
   - Stock is created when production completes

2. **Individual Seller Inventory** (Stock-Based)
   - Sellers have existing stock to sell
   - Immediate purchase without waiting
   - Traditional e-commerce model

### Problem: Current Database Structure

```prisma
model products {
  stock_quantity Int? @default(0)  // ❌ Confusing: Is this factory or seller stock?
  factory_id     String            // Factory produces this
  // ...
}

model product_variants {
  stock_quantity Int? @default(0)  // ❌ Same confusion for variants
  // ...
}
```

**Issues:**
- `stock_quantity` in `products` and `product_variants` doesn't distinguish between:
  - Factory products (made-to-order, no upfront stock)
  - Seller inventory (ready stock)
- No concept of "seller" in the platform
- No way to track which seller owns which inventory

---

## Proposed Solution: Dual Inventory System

### 1. Add Product Source Type

```prisma
enum product_source {
  factory_group_buying  // Make-to-order via group buying
  seller_inventory      // Ready stock from sellers
}

model products {
  id              String         @id @default(uuid())
  factory_id      String?        @db.Uuid  // Only for factory products
  seller_id       String?        @db.Uuid  // Only for seller products
  product_source  product_source // NEW: Identifies the source

  // REMOVE these - they'll move to seller_inventory
  // stock_quantity Int? @default(0)  // ❌ Remove this

  // Keep factory group buying fields
  min_order_quantity    Int?    // MOQ for factory
  group_duration_hours  Int?    // Group buying duration
  grosir_unit_size      Int?    // Wholesale unit size

  // Relations
  factories              factories?              @relation(...)
  sellers                sellers?                @relation(...)  // NEW
  seller_inventory       seller_inventory[]      // NEW
  group_buying_sessions  group_buying_sessions[]
}

model product_variants {
  id           String  @id @default(uuid())
  product_id   String

  // REMOVE this - move to seller_inventory_variants
  // stock_quantity Int? @default(0)  // ❌ Remove this

  // Keep variant properties
  variant_name String
  color        String?
  size         String?

  // Relations
  products                      products
  seller_inventory_variants     seller_inventory_variants[]  // NEW
  grosir_variant_allocations    grosir_variant_allocations[]
}
```

### 2. Add Seller Model

```prisma
enum seller_type {
  individual    // Individual reseller
  business      // Business reseller
}

enum seller_status {
  pending
  active
  suspended
  inactive
}

model sellers {
  id                      String         @id @default(uuid())
  user_id                 String         @db.Uuid
  seller_type             seller_type    @default(individual)
  status                  seller_status  @default(pending)

  // Business Info
  store_name              String         @db.VarChar(255)
  store_slug              String         @unique
  store_description       String?
  store_logo_url          String?
  store_banner_url        String?

  // Contact
  phone_number            String         @db.VarChar(20)
  email                   String?        @db.VarChar(255)

  // Address
  province                String         @db.VarChar(100)
  city                    String         @db.VarChar(100)
  district                String         @db.VarChar(100)
  postal_code             String?        @db.VarChar(10)
  address_line            String

  // Legal (for business sellers)
  business_license_number String?        @unique @db.VarChar(50)
  business_license_url    String?
  tax_id                  String?        @db.VarChar(50)

  // Banking
  bank_name               String?        @db.VarChar(100)
  bank_account_number     String?        @db.VarChar(50)
  bank_account_name       String?        @db.VarChar(255)

  // Verification
  verification_status     verification_status  @default(unverified)
  verified_at             DateTime?      @db.Timestamptz(6)
  verified_by             String?        @db.Uuid

  // Timestamps
  created_at              DateTime       @default(now())
  updated_at              DateTime       @default(now())

  // Relations
  users                   users          @relation(fields: [user_id], references: [id])
  products                products[]
  seller_inventory        seller_inventory[]
  seller_orders           orders[]       // Orders fulfilled by this seller
  seller_settlements      seller_settlements[]  // Financial settlements

  @@index([user_id])
  @@index([status])
  @@index([store_slug])
}

// Add to user_role enum:
enum user_role {
  customer
  office_staff
  factory_owner
  seller        // NEW: Individual/business seller
  admin
}
```

### 3. Add Seller Inventory Tables

```prisma
// Base product inventory for sellers
model seller_inventory {
  id                String    @id @default(uuid())
  seller_id         String    @db.Uuid
  product_id        String    @db.Uuid

  // Stock tracking
  stock_quantity    Int       @default(0)
  reserved_quantity Int       @default(0)  // Reserved for pending orders
  available_quantity Int      @default(0)  // Computed: stock - reserved

  // Pricing (seller can set their own price)
  seller_price      Decimal   @db.Decimal(15, 2)
  cost_price        Decimal?  @db.Decimal(15, 2)

  // Location (where seller stores this inventory)
  warehouse_location String?  @db.VarChar(255)

  // Stock alerts
  low_stock_threshold Int?    @default(10)

  // Status
  is_active         Boolean   @default(true)

  // Timestamps
  created_at        DateTime  @default(now())
  updated_at        DateTime  @default(now())

  // Relations
  sellers           sellers   @relation(fields: [seller_id], references: [id], onDelete: Cascade)
  products          products  @relation(fields: [product_id], references: [id], onDelete: Cascade)
  inventory_variants seller_inventory_variants[]
  stock_movements   seller_stock_movements[]

  @@unique([seller_id, product_id])
  @@index([seller_id])
  @@index([product_id])
  @@index([stock_quantity])
}

// Variant-specific inventory for sellers
model seller_inventory_variants {
  id                  String             @id @default(uuid())
  inventory_id        String             @db.Uuid
  variant_id          String             @db.Uuid

  // Stock tracking
  stock_quantity      Int                @default(0)
  reserved_quantity   Int                @default(0)
  available_quantity  Int                @default(0)

  // Pricing override for this variant
  price_adjustment    Decimal?           @default(0.00) @db.Decimal(15, 2)

  // Status
  is_active           Boolean            @default(true)

  // Timestamps
  created_at          DateTime           @default(now())
  updated_at          DateTime           @default(now())

  // Relations
  seller_inventory    seller_inventory   @relation(fields: [inventory_id], references: [id], onDelete: Cascade)
  product_variants    product_variants   @relation(fields: [variant_id], references: [id], onDelete: Cascade)

  @@unique([inventory_id, variant_id])
  @@index([inventory_id])
  @@index([variant_id])
}

// Track stock movements for auditing
model seller_stock_movements {
  id                String             @id @default(uuid())
  inventory_id      String             @db.Uuid
  variant_id        String?            @db.Uuid  // Null for base product

  // Movement details
  movement_type     stock_movement_type
  quantity          Int                // Positive for add, negative for deduct

  // References
  order_id          String?            @db.Uuid
  reference_type    String?            @db.VarChar(50)  // 'purchase', 'sale', 'return', 'adjustment'
  reference_id      String?            @db.Uuid

  // Notes
  notes             String?
  performed_by      String?            @db.Uuid

  // Timestamps
  created_at        DateTime           @default(now())

  // Relations
  seller_inventory  seller_inventory   @relation(fields: [inventory_id], references: [id], onDelete: Cascade)
  orders            orders?            @relation(fields: [order_id], references: [id])
  users             users?             @relation(fields: [performed_by], references: [id])

  @@index([inventory_id])
  @@index([order_id])
  @@index([created_at])
}

enum stock_movement_type {
  purchase         // Seller purchased stock
  sale             // Sold to customer
  return           // Customer returned
  damaged          // Marked as damaged
  lost             // Lost/stolen
  adjustment       // Manual adjustment
  reserved         // Reserved for order
  released         // Released from reservation
}
```

### 4. Update Orders to Support Both Sources

```prisma
model orders {
  id              String       @id @default(uuid())
  user_id         String

  // NEW: Order source
  order_source    order_source
  factory_id      String?      @db.Uuid  // For factory group buying orders
  seller_id       String?      @db.Uuid  // For seller inventory orders

  // ... rest of fields

  factories       factories?   @relation(...)
  sellers         sellers?     @relation(...)  // NEW
}

enum order_source {
  group_buying    // From factory group buying session
  seller_store    // From seller's inventory
  mixed           // Mix of both (if cart allows)
}
```

---

## Flow Diagrams

### Flow 1: Admin Creates Group Buying Session (Factory)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN GROUP BUYING FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. ADMIN: Create Factory Product
   ├─ POST /api/products
   ├─ Body: {
   │    productSource: "factory_group_buying",
   │    factoryId: "uuid",
   │    name: "Premium T-Shirt",
   │    minOrderQuantity: 50,  // MOQ
   │    basePrice: 150000,
   │    grosirUnitSize: 12      // Grosir allocation unit
   │  }
   └─ Product created with NO stock_quantity
      ✅ product_source = "factory_group_buying"

2. ADMIN: Configure Grosir Variant Allocations (if variants exist)
   ├─ POST /api/products/{productId}/grosir-allocations
   ├─ Body: {
   │    variants: [
   │      { variantId: "S-uuid", allocationQuantity: 2 },
   │      { variantId: "M-uuid", allocationQuantity: 3 },
   │      { variantId: "L-uuid", allocationQuantity: 2 }
   │    ]
   │  }
   └─ Dynamic cap: min(S,M,L) + (2 × allocation)

3. ADMIN: Create Group Buying Session
   ├─ POST /api/group-buying
   ├─ Body: {
   │    productId: "uuid",
   │    factoryId: "uuid",
   │    targetMoq: 50,
   │    groupPrice: 200000,        // BASE PRICE (upfront payment)
   │    priceTier25: 150000,       // Refund targets
   │    priceTier50: 135000,
   │    priceTier75: 120000,
   │    priceTier100: 105000,
   │    endTime: "2025-12-31T23:59:59Z"
   │  }
   └─ Session created, status: "forming"

4. CUSTOMERS: Join Session
   ├─ POST /api/group-buying/{sessionId}/join
   ├─ Body: {
   │    userId: "uuid",
   │    variantId: "M-uuid",
   │    quantity: 3,
   │    unitPrice: 200000,         // BASE PRICE
   │    totalPrice: 600000
   │  }
   ├─ Variant availability checked against grosir dynamic cap
   ├─ Payment created via Xendit (escrow)
   └─ Participant added, stock NOT deducted (doesn't exist yet)

5. SESSION EXPIRES: Process Session
   ├─ Triggered by: Manual expire endpoint or cron job
   ├─ Calculate final tier based on real participants
   ├─ Determine refund amounts per participant
   │
   ├─ IF MOQ Reached (≥25% with bot):
   │  ├─ Issue refunds to wallets based on tier
   │  ├─ POST /api/wallet/credit (for each participant)
   │  ├─ Create orders for all participants
   │  ├─ Status → "moq_reached"
   │  ├─ Notify factory to start production
   │  └─ POST /api/warehouse/fulfill-demand
   │     └─ Warehouse checks if stock exists
   │        ├─ If stock exists → Reserve it
   │        └─ If no stock → Send WhatsApp to factory for production
   │
   └─ IF MOQ Failed (<25%):
      ├─ Refund all escrow payments (full amount)
      ├─ Status → "failed"
      └─ No orders created

6. FACTORY: Production Complete
   ├─ Factory marks production done in their dashboard
   ├─ POST /api/group-buying/{sessionId}/complete-production
   ├─ Warehouse receives stock
   └─ Orders shipped to customers

┌────────────────────────────────────────────────────────┐
│ KEY CHARACTERISTICS:                                    │
├────────────────────────────────────────────────────────┤
│ ✅ NO stock_quantity in products table                 │
│ ✅ Stock created AFTER production completes            │
│ ✅ Escrow payment held until MOQ reached               │
│ ✅ Refunds issued based on final participation tier    │
│ ✅ Grosir allocation ensures balanced variant orders   │
└────────────────────────────────────────────────────────┘
```

### Flow 2: Seller Opens Store and Manages Inventory

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELLER INVENTORY FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1. USER: Register as Seller
   ├─ POST /api/sellers/register
   ├─ Body: {
   │    userId: "uuid",
   │    sellerType: "individual" | "business",
   │    storeName: "My Fashion Store",
   │    storeSlug: "my-fashion-store",
   │    phoneNumber: "+6281234567890",
   │    address: { province, city, district, ... },
   │    bankDetails: { bankName, accountNumber, ... }
   │  }
   ├─ Seller created, status: "pending"
   └─ User role updated to "seller"

2. ADMIN: Verify Seller (if required)
   ├─ Seller uploads business documents
   ├─ Admin reviews
   ├─ PATCH /api/sellers/{sellerId}/verify
   └─ Status → "active"

3. SELLER: Source Products

   OPTION A: Create Own Product
   ├─ POST /api/products
   ├─ Body: {
   │    productSource: "seller_inventory",  // KEY DIFFERENCE
   │    sellerId: "uuid",
   │    name: "Custom Handmade Bag",
   │    basePrice: 250000,
   │    // NO min_order_quantity
   │    // NO group_duration_hours
   │    // NO grosir fields
   │  }
   └─ Product created with product_source = "seller_inventory"

   OPTION B: Adopt Factory Product for Resale
   ├─ Browse factory products catalog
   ├─ POST /api/seller-inventory
   ├─ Body: {
   │    sellerId: "uuid",
   │    productId: "factory-product-uuid",  // Existing factory product
   │    sellerPrice: 180000,                 // Seller sets their price
   │    stockQuantity: 20,                   // Initial stock
   │    warehouseLocation: "Jakarta Warehouse A"
   │  }
   └─ Seller inventory created for existing product

4. SELLER: Manage Inventory

   A. Add Stock:
   ├─ POST /api/seller-inventory/{inventoryId}/stock
   ├─ Body: {
   │    movementType: "purchase",
   │    quantity: 50,
   │    variantId: "M-uuid",
   │    notes: "Purchased from supplier X"
   │  }
   └─ stock_quantity += 50

   B. Set Variant Stock:
   ├─ POST /api/seller-inventory/{inventoryId}/variants/{variantId}/stock
   ├─ Body: {
   │    stockQuantity: 30,
   │    priceAdjustment: 10000  // Extra Rp 10k for this variant
   │  }
   └─ Variant inventory created

5. CUSTOMER: Browse & Purchase from Seller

   A. View Products:
   ├─ GET /api/products?source=seller_inventory
   ├─ Filters: seller, price range, location
   └─ See only products with available stock

   B. Add to Cart:
   ├─ POST /api/cart/add
   ├─ Body: {
   │    productId: "uuid",
   │    variantId: "M-uuid",
   │    quantity: 2,
   │    orderSource: "seller_store",  // KEY
   │    sellerId: "uuid"
   │  }
   └─ Stock availability checked in seller_inventory_variants

   C. Checkout:
   ├─ POST /api/orders/checkout
   ├─ Payment via Xendit (NOT escrow, direct payment)
   └─ Order created with order_source = "seller_store"

6. SYSTEM: Reserve Stock on Order
   ├─ seller_inventory_variants.reserved_quantity += quantity
   ├─ seller_inventory_variants.available_quantity -= quantity
   ├─ seller_stock_movements created:
   │  └─ movement_type: "reserved"
   └─ Stock movement logged

7. SELLER: Fulfill Order
   ├─ POST /api/orders/{orderId}/ship
   ├─ Body: {
   │    courier: "jne",
   │    trackingNumber: "JNE123456"
   │  }
   ├─ Stock movement:
   │  ├─ reserved_quantity -= quantity
   │  ├─ stock_quantity -= quantity
   │  └─ movement_type: "sale"
   └─ Order status → "shipped"

8. CUSTOMER: Receive & Confirm
   ├─ Order status → "delivered"
   └─ Payment released to seller's wallet/bank

┌────────────────────────────────────────────────────────┐
│ KEY CHARACTERISTICS:                                    │
├────────────────────────────────────────────────────────┤
│ ✅ stock_quantity in seller_inventory tables           │
│ ✅ Stock exists BEFORE customer orders                 │
│ ✅ Direct payment (no escrow)                          │
│ ✅ Immediate purchase (no waiting for MOQ)             │
│ ✅ Seller sets their own prices                        │
│ ✅ Multiple sellers can sell same factory product      │
└────────────────────────────────────────────────────────┘
```

---

## Migration Strategy

### Phase 1: Add New Tables (Non-Breaking)

```sql
-- Add product_source enum
CREATE TYPE product_source AS ENUM ('factory_group_buying', 'seller_inventory');

-- Add seller_type enum
CREATE TYPE seller_type AS ENUM ('individual', 'business');

-- Add seller_status enum
CREATE TYPE seller_status AS ENUM ('pending', 'active', 'suspended', 'inactive');

-- Add stock_movement_type enum
CREATE TYPE stock_movement_type AS ENUM (
  'purchase', 'sale', 'return', 'damaged', 'lost',
  'adjustment', 'reserved', 'released'
);

-- Add order_source enum
CREATE TYPE order_source AS ENUM ('group_buying', 'seller_store', 'mixed');

-- Create sellers table
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  seller_type seller_type DEFAULT 'individual',
  status seller_status DEFAULT 'pending',
  store_name VARCHAR(255) NOT NULL,
  store_slug VARCHAR(255) UNIQUE NOT NULL,
  -- ... (all other fields from schema above)
);

-- Create seller_inventory table
CREATE TABLE seller_inventory (
  -- ... (all fields from schema above)
);

-- Create seller_inventory_variants table
CREATE TABLE seller_inventory_variants (
  -- ... (all fields from schema above)
);

-- Create seller_stock_movements table
CREATE TABLE seller_stock_movements (
  -- ... (all fields from schema above)
);
```

### Phase 2: Update Existing Tables

```sql
-- Add product_source to products
ALTER TABLE products ADD COLUMN product_source product_source DEFAULT 'factory_group_buying';
ALTER TABLE products ADD COLUMN seller_id UUID REFERENCES sellers(id);
ALTER TABLE products ALTER COLUMN factory_id DROP NOT NULL;  -- Make nullable

-- Update existing products (all are factory products)
UPDATE products SET product_source = 'factory_group_buying' WHERE factory_id IS NOT NULL;

-- Add order_source to orders
ALTER TABLE orders ADD COLUMN order_source order_source DEFAULT 'group_buying';
ALTER TABLE orders ADD COLUMN seller_id UUID REFERENCES sellers(id);

-- Add 'seller' to user_role enum
ALTER TYPE user_role ADD VALUE 'seller';
```

### Phase 3: Deprecate Old Fields (Future)

```sql
-- After migration, these fields should NO LONGER be used:
-- products.stock_quantity       --> Use seller_inventory.stock_quantity
-- product_variants.stock_quantity --> Use seller_inventory_variants.stock_quantity

-- Mark as deprecated with comment
COMMENT ON COLUMN products.stock_quantity IS
  'DEPRECATED: Use seller_inventory.stock_quantity for seller products.
   Factory products do not have stock until production completes.';
```

---

## API Endpoints Summary

### Admin Group Buying APIs

```
POST   /api/products                          # Create factory product
POST   /api/products/:id/grosir-allocations   # Configure variant allocations
POST   /api/group-buying                      # Create session
GET    /api/group-buying/:id                  # View session
POST   /api/group-buying/:id/join             # Customer joins
POST   /api/group-buying/:id/manual-expire    # Manual trigger (testing)
POST   /api/group-buying/:id/start-production # Factory starts
POST   /api/group-buying/:id/complete-production
GET    /api/group-buying/:sessionId/variant-availability/:variantId  # Diagnostic
```

### Seller Store APIs

```
# Seller Management
POST   /api/sellers/register                  # Register as seller
GET    /api/sellers/:id                       # View seller profile
PATCH  /api/sellers/:id                       # Update seller info
PATCH  /api/sellers/:id/verify                # Admin verify seller

# Inventory Management
POST   /api/seller-inventory                  # Create inventory for product
GET    /api/seller-inventory                  # List seller's inventory
GET    /api/seller-inventory/:id              # View inventory details
POST   /api/seller-inventory/:id/stock        # Add/adjust stock
DELETE /api/seller-inventory/:id              # Remove product from inventory

POST   /api/seller-inventory/:id/variants/:variantId/stock  # Manage variant stock

# Stock Movements
GET    /api/seller-inventory/:id/movements    # View stock history

# Orders
GET    /api/sellers/:id/orders                # Seller's orders
POST   /api/orders/:id/ship                   # Mark order shipped
```

### Customer APIs (Updated)

```
GET    /api/products?source=factory_group_buying    # Browse factory products
GET    /api/products?source=seller_inventory        # Browse seller products
GET    /api/products?sellerId=:sellerId             # Products from specific seller
POST   /api/cart/add                                # Add to cart (specify source)
POST   /api/orders/checkout                         # Checkout (handles both sources)
```

---

## Business Rules

### Factory Group Buying Products
- ✅ Must have factory_id
- ✅ Must have product_source = 'factory_group_buying'
- ✅ Can have grosir_variant_allocations
- ✅ Can have group_buying_sessions
- ❌ CANNOT have stock_quantity (stock doesn't exist yet)
- ❌ CANNOT have seller_id
- ❌ CANNOT be purchased directly (only through sessions)

### Seller Inventory Products
- ✅ Can be new product (seller creates) OR existing factory product (seller resells)
- ✅ Must have seller_id
- ✅ Must have product_source = 'seller_inventory'
- ✅ MUST have stock in seller_inventory before selling
- ✅ Can be purchased immediately
- ❌ CANNOT have group_buying_sessions
- ❌ CANNOT have grosir_variant_allocations

### Hybrid Scenario (Advanced)
A factory product CAN be:
1. Available for group buying (direct from factory)
2. ALSO resold by multiple sellers (who bought stock)

Example:
- Factory creates "Premium T-Shirt" (product_source: factory_group_buying)
- Admin creates group buying sessions
- Seller A buys 100 units from completed session
- Seller A lists them in their inventory for resale
- Both options available to customers:
  - Join new group buying session (wait, lower price)
  - Buy from Seller A (immediate, higher price)

---

## Summary

| Feature | Factory Group Buying | Seller Inventory |
|---------|---------------------|------------------|
| **Stock** | Created after production | Exists before sale |
| **Payment** | Escrow (held until MOQ) | Direct (immediate) |
| **Price** | Base + tier refunds | Seller sets price |
| **Fulfillment** | Factory produces | Seller ships |
| **Timing** | Wait for session end | Instant purchase |
| **Variants** | Grosir allocation | Normal inventory |
| **User Role** | Admin creates | Seller creates |

This architecture cleanly separates the two business models while allowing both to coexist on the same platform.
