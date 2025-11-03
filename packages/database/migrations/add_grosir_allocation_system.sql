-- Migration: Add Grosir Allocation System
-- Date: 2025-11-03
-- Description: Add variant allocation tracking, warehouse integration, and stock management

-- ============================================================
-- 1. CREATE NEW TABLE: grosir_variant_allocations
-- ============================================================
CREATE TABLE IF NOT EXISTS grosir_variant_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    variant_id UUID,
    allocation_quantity INTEGER NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_grosir_allocations_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_grosir_allocations_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_variants(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_product_variant
        UNIQUE (product_id, variant_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_grosir_allocations_product
    ON grosir_variant_allocations(product_id);

-- ============================================================
-- 2. ADD COLUMN TO products: grosir_unit_size
-- ============================================================
ALTER TABLE products
ADD COLUMN IF NOT EXISTS grosir_unit_size INTEGER;

COMMENT ON COLUMN products.grosir_unit_size IS 'Total units per grosir wholesale unit (e.g., 12 for 4S+4M+4L+4XL)';

-- ============================================================
-- 3. ADD COLUMNS TO group_buying_sessions: warehouse integration
-- ============================================================
ALTER TABLE group_buying_sessions
ADD COLUMN IF NOT EXISTS warehouse_check_at TIMESTAMPTZ(6);

ALTER TABLE group_buying_sessions
ADD COLUMN IF NOT EXISTS warehouse_has_stock BOOLEAN;

ALTER TABLE group_buying_sessions
ADD COLUMN IF NOT EXISTS factory_notified_at TIMESTAMPTZ(6);

ALTER TABLE group_buying_sessions
ADD COLUMN IF NOT EXISTS factory_whatsapp_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE group_buying_sessions
ADD COLUMN IF NOT EXISTS grosir_units_needed INTEGER;

COMMENT ON COLUMN group_buying_sessions.warehouse_check_at IS 'When warehouse stock was last checked';
COMMENT ON COLUMN group_buying_sessions.warehouse_has_stock IS 'Whether warehouse has sufficient stock';
COMMENT ON COLUMN group_buying_sessions.factory_notified_at IS 'When factory was notified via WhatsApp';
COMMENT ON COLUMN group_buying_sessions.factory_whatsapp_sent IS 'Whether WhatsApp was sent to factory';
COMMENT ON COLUMN group_buying_sessions.grosir_units_needed IS 'Number of grosir units needed from factory';

-- ============================================================
-- 4. UPDATE ENUM: group_status (add pending_stock, stock_received)
-- ============================================================

-- Check if values already exist before adding
DO $$
BEGIN
    -- Add 'pending_stock' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'pending_stock'
        AND enumtypid = 'group_status'::regtype
    ) THEN
        ALTER TYPE group_status ADD VALUE 'pending_stock' AFTER 'moq_reached';
    END IF;

    -- Add 'stock_received' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'stock_received'
        AND enumtypid = 'group_status'::regtype
    ) THEN
        ALTER TYPE group_status ADD VALUE 'stock_received' AFTER 'pending_stock';
    END IF;
END $$;

-- ============================================================
-- 5. VERIFICATION QUERIES (Optional - run to verify)
-- ============================================================

-- Verify table created
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'grosir_variant_allocations'
) AS grosir_table_exists;

-- Verify columns added to products
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name = 'grosir_unit_size';

-- Verify columns added to group_buying_sessions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'group_buying_sessions'
AND column_name IN (
    'warehouse_check_at',
    'warehouse_has_stock',
    'factory_notified_at',
    'factory_whatsapp_sent',
    'grosir_units_needed'
);

-- Verify enum values added
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'group_status'::regtype
AND enumlabel IN ('pending_stock', 'stock_received');
