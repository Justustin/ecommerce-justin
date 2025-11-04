-- Migration: Add Seller Inventory System (Phase 1)
-- Description: Adds seller tables and inventory management without breaking existing functionality
-- Date: 2025-11-04

-- =====================================================
-- STEP 1: Create Enums
-- =====================================================

-- Product source type (factory vs seller)
CREATE TYPE product_source AS ENUM ('factory_group_buying', 'seller_inventory');

-- Seller business type
CREATE TYPE seller_type AS ENUM ('individual', 'business');

-- Seller account status
CREATE TYPE seller_status AS ENUM ('pending', 'active', 'suspended', 'inactive');

-- Stock movement types for auditing
CREATE TYPE stock_movement_type AS ENUM (
  'purchase',    -- Seller purchased stock
  'sale',        -- Sold to customer
  'return',      -- Customer returned
  'damaged',     -- Marked as damaged
  'lost',        -- Lost/stolen
  'adjustment',  -- Manual adjustment
  'reserved',    -- Reserved for order
  'released'     -- Released from reservation
);

-- Order source (group buying vs seller)
CREATE TYPE order_source AS ENUM ('group_buying', 'seller_store', 'mixed');


-- =====================================================
-- STEP 2: Create Sellers Table
-- =====================================================

CREATE TABLE sellers (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_type             seller_type DEFAULT 'individual',
  status                  seller_status DEFAULT 'pending',

  -- Store Info
  store_name              VARCHAR(255) NOT NULL,
  store_slug              VARCHAR(255) UNIQUE NOT NULL,
  store_description       TEXT,
  store_logo_url          TEXT,
  store_banner_url        TEXT,

  -- Contact
  phone_number            VARCHAR(20) NOT NULL,
  email                   VARCHAR(255),

  -- Address
  province                VARCHAR(100) NOT NULL,
  city                    VARCHAR(100) NOT NULL,
  district                VARCHAR(100) NOT NULL,
  postal_code             VARCHAR(10),
  address_line            TEXT NOT NULL,

  -- Legal (for business sellers)
  business_license_number VARCHAR(50) UNIQUE,
  business_license_url    TEXT,
  tax_id                  VARCHAR(50),

  -- Banking
  bank_name               VARCHAR(100),
  bank_account_number     VARCHAR(50),
  bank_account_name       VARCHAR(255),

  -- Verification
  verification_status     verification_status DEFAULT 'unverified',
  verified_at             TIMESTAMPTZ,
  verified_by             UUID REFERENCES users(id),

  -- Timestamps
  created_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for sellers
CREATE INDEX idx_sellers_user_id ON sellers(user_id);
CREATE INDEX idx_sellers_status ON sellers(status);
CREATE INDEX idx_sellers_store_slug ON sellers(store_slug);
CREATE INDEX idx_sellers_verification_status ON sellers(verification_status);


-- =====================================================
-- STEP 3: Create Seller Inventory Table
-- =====================================================

CREATE TABLE seller_inventory (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id           UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Stock tracking
  stock_quantity      INT DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity   INT DEFAULT 0 CHECK (reserved_quantity >= 0),

  -- Computed field constraint: available = stock - reserved
  CONSTRAINT chk_available_stock CHECK (stock_quantity >= reserved_quantity),

  -- Pricing (seller can override product base price)
  seller_price        DECIMAL(15, 2) NOT NULL CHECK (seller_price > 0),
  cost_price          DECIMAL(15, 2) CHECK (cost_price IS NULL OR cost_price >= 0),

  -- Location
  warehouse_location  VARCHAR(255),

  -- Stock alerts
  low_stock_threshold INT DEFAULT 10,

  -- Status
  is_active           BOOLEAN DEFAULT true,

  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- One inventory record per seller per product
  UNIQUE(seller_id, product_id)
);

-- Indexes for seller_inventory
CREATE INDEX idx_seller_inventory_seller_id ON seller_inventory(seller_id);
CREATE INDEX idx_seller_inventory_product_id ON seller_inventory(product_id);
CREATE INDEX idx_seller_inventory_stock_quantity ON seller_inventory(stock_quantity);
CREATE INDEX idx_seller_inventory_is_active ON seller_inventory(is_active);


-- =====================================================
-- STEP 4: Create Seller Inventory Variants Table
-- =====================================================

CREATE TABLE seller_inventory_variants (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id        UUID NOT NULL REFERENCES seller_inventory(id) ON DELETE CASCADE,
  variant_id          UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,

  -- Stock tracking for this specific variant
  stock_quantity      INT DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity   INT DEFAULT 0 CHECK (reserved_quantity >= 0),

  -- Available stock constraint
  CONSTRAINT chk_variant_available_stock CHECK (stock_quantity >= reserved_quantity),

  -- Pricing override for this variant
  price_adjustment    DECIMAL(15, 2) DEFAULT 0.00,

  -- Status
  is_active           BOOLEAN DEFAULT true,

  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- One variant per inventory
  UNIQUE(inventory_id, variant_id)
);

-- Indexes for seller_inventory_variants
CREATE INDEX idx_seller_inv_var_inventory_id ON seller_inventory_variants(inventory_id);
CREATE INDEX idx_seller_inv_var_variant_id ON seller_inventory_variants(variant_id);
CREATE INDEX idx_seller_inv_var_stock ON seller_inventory_variants(stock_quantity);


-- =====================================================
-- STEP 5: Create Stock Movements Table (Audit Log)
-- =====================================================

CREATE TABLE seller_stock_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id    UUID NOT NULL REFERENCES seller_inventory(id) ON DELETE CASCADE,
  variant_id      UUID REFERENCES product_variants(id),  -- NULL for base product

  -- Movement details
  movement_type   stock_movement_type NOT NULL,
  quantity        INT NOT NULL,  -- Positive for add, negative for deduct

  -- Stock after this movement (for auditing)
  stock_after     INT NOT NULL,

  -- References
  order_id        UUID REFERENCES orders(id),
  reference_type  VARCHAR(50),  -- 'purchase', 'sale', 'return', 'adjustment'
  reference_id    UUID,

  -- Notes
  notes           TEXT,
  performed_by    UUID REFERENCES users(id),

  -- Timestamp
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for seller_stock_movements
CREATE INDEX idx_seller_stock_mov_inventory_id ON seller_stock_movements(inventory_id);
CREATE INDEX idx_seller_stock_mov_order_id ON seller_stock_movements(order_id);
CREATE INDEX idx_seller_stock_mov_created_at ON seller_stock_movements(created_at DESC);
CREATE INDEX idx_seller_stock_mov_movement_type ON seller_stock_movements(movement_type);


-- =====================================================
-- STEP 6: Create Seller Settlements Table
-- =====================================================

CREATE TABLE seller_settlements (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id           UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  settlement_code     VARCHAR(20) UNIQUE NOT NULL,

  -- Financial details
  total_sales         DECIMAL(15, 2) DEFAULT 0.00,
  platform_commission DECIMAL(15, 2) DEFAULT 0.00,
  gateway_fees        DECIMAL(15, 2) DEFAULT 0.00,
  net_amount          DECIMAL(15, 2) NOT NULL,

  -- Period
  period_start        TIMESTAMPTZ NOT NULL,
  period_end          TIMESTAMPTZ NOT NULL,

  -- Status
  status              VARCHAR(20) DEFAULT 'pending',  -- pending, processing, completed, failed

  -- Payment details
  bank_name           VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_account_name   VARCHAR(255),
  paid_at             TIMESTAMPTZ,
  payment_reference   VARCHAR(255),

  -- Notes
  notes               TEXT,

  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for seller_settlements
CREATE INDEX idx_seller_settlements_seller_id ON seller_settlements(seller_id);
CREATE INDEX idx_seller_settlements_status ON seller_settlements(status);
CREATE INDEX idx_seller_settlements_period ON seller_settlements(period_start, period_end);
CREATE INDEX idx_seller_settlements_code ON seller_settlements(settlement_code);


-- =====================================================
-- STEP 7: Update Existing Tables (Add New Columns)
-- =====================================================

-- Add product_source to products table
ALTER TABLE products ADD COLUMN product_source product_source DEFAULT 'factory_group_buying';
ALTER TABLE products ADD COLUMN seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE;
ALTER TABLE products ALTER COLUMN factory_id DROP NOT NULL;  -- Make nullable for seller products

-- Add order_source to orders table
ALTER TABLE orders ADD COLUMN order_source order_source DEFAULT 'group_buying';
ALTER TABLE orders ADD COLUMN seller_id UUID REFERENCES sellers(id);

-- Add seller role to user_role enum
ALTER TYPE user_role ADD VALUE 'seller';

-- Create indexes on new columns
CREATE INDEX idx_products_product_source ON products(product_source);
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_orders_order_source ON orders(order_source);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);


-- =====================================================
-- STEP 8: Update Existing Data
-- =====================================================

-- Mark all existing products as factory group buying products
UPDATE products SET product_source = 'factory_group_buying' WHERE factory_id IS NOT NULL;

-- Mark all existing orders as group buying orders
UPDATE orders SET order_source = 'group_buying';


-- =====================================================
-- STEP 9: Add Comments for Documentation
-- =====================================================

-- Deprecation warnings
COMMENT ON COLUMN products.stock_quantity IS
  'DEPRECATED: For factory products, stock does not exist until production completes.
   For seller products, use seller_inventory.stock_quantity instead.
   This field will be removed in a future version.';

COMMENT ON COLUMN product_variants.stock_quantity IS
  'DEPRECATED: Use seller_inventory_variants.stock_quantity for seller inventory.
   This field will be removed in a future version.';

-- Table comments
COMMENT ON TABLE sellers IS
  'Individual or business sellers who maintain their own inventory and fulfill orders';

COMMENT ON TABLE seller_inventory IS
  'Seller-owned inventory for products. Each seller can have different stock and prices for the same product';

COMMENT ON TABLE seller_inventory_variants IS
  'Variant-specific stock levels for seller inventory';

COMMENT ON TABLE seller_stock_movements IS
  'Audit log of all stock changes for seller inventory';

COMMENT ON TABLE seller_settlements IS
  'Financial settlements for sellers, similar to factory_settlements';


-- =====================================================
-- STEP 10: Create Trigger for Updated_at
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to new tables
CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_inventory_updated_at BEFORE UPDATE ON seller_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_inventory_variants_updated_at BEFORE UPDATE ON seller_inventory_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_settlements_updated_at BEFORE UPDATE ON seller_settlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- STEP 11: Create Helper Functions
-- =====================================================

-- Function to calculate available stock for seller inventory
CREATE OR REPLACE FUNCTION calculate_available_stock(p_inventory_id UUID, p_variant_id UUID DEFAULT NULL)
RETURNS INT AS $$
DECLARE
    v_available INT;
BEGIN
    IF p_variant_id IS NULL THEN
        -- Base product stock
        SELECT (stock_quantity - reserved_quantity) INTO v_available
        FROM seller_inventory
        WHERE id = p_inventory_id;
    ELSE
        -- Variant stock
        SELECT (stock_quantity - reserved_quantity) INTO v_available
        FROM seller_inventory_variants
        WHERE inventory_id = p_inventory_id AND variant_id = p_variant_id;
    END IF;

    RETURN COALESCE(v_available, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to reserve stock for an order
CREATE OR REPLACE FUNCTION reserve_seller_stock(
    p_inventory_id UUID,
    p_variant_id UUID,
    p_quantity INT,
    p_order_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_available INT;
BEGIN
    -- Calculate available stock
    v_available := calculate_available_stock(p_inventory_id, p_variant_id);

    -- Check if enough stock available
    IF v_available < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_available, p_quantity;
    END IF;

    -- Reserve the stock
    IF p_variant_id IS NULL THEN
        UPDATE seller_inventory
        SET reserved_quantity = reserved_quantity + p_quantity
        WHERE id = p_inventory_id;
    ELSE
        UPDATE seller_inventory_variants
        SET reserved_quantity = reserved_quantity + p_quantity
        WHERE inventory_id = p_inventory_id AND variant_id = p_variant_id;
    END IF;

    -- Log the movement
    INSERT INTO seller_stock_movements (
        inventory_id, variant_id, movement_type, quantity,
        stock_after, order_id, reference_type, performed_by
    ) VALUES (
        p_inventory_id, p_variant_id, 'reserved', -p_quantity,
        v_available - p_quantity, p_order_id, 'order', p_user_id
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- Migration Complete
-- =====================================================

-- Verify the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'New tables created: sellers, seller_inventory, seller_inventory_variants, seller_stock_movements, seller_settlements';
    RAISE NOTICE 'Enums added: product_source, seller_type, seller_status, stock_movement_type, order_source';
    RAISE NOTICE 'Updated tables: products (added product_source, seller_id), orders (added order_source, seller_id)';
    RAISE NOTICE 'New user role: seller';
END $$;
