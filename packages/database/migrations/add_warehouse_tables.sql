-- Migration: Add warehouse and bundle configuration tables
-- Created: 2025-11-18
-- Description: Adds grosir bundle config, warehouse tolerance, inventory, and purchase order tables

-- Ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: grosir_bundle_config
-- Stores bundle configuration for warehouse ordering
CREATE TABLE IF NOT EXISTS grosir_bundle_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    variant_id UUID,
    units_per_bundle INTEGER NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    -- Foreign keys
    CONSTRAINT fk_grosir_bundle_config_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT fk_grosir_bundle_config_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_variants(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    -- Constraints
    CONSTRAINT uq_grosir_bundle_config_product_variant
        UNIQUE (product_id, variant_id)
);

-- Indexes for grosir_bundle_config
CREATE INDEX IF NOT EXISTS idx_grosir_bundle_config_product
    ON grosir_bundle_config(product_id);

-- Comments for grosir_bundle_config
COMMENT ON TABLE grosir_bundle_config IS 'Stores bundle configuration for warehouse ordering';
COMMENT ON COLUMN grosir_bundle_config.units_per_bundle IS 'Number of units that come in one warehouse bundle';


-- Table: grosir_warehouse_tolerance
-- Stores warehouse tolerance settings for grosir ordering
CREATE TABLE IF NOT EXISTS grosir_warehouse_tolerance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL UNIQUE,
    tolerance_bundles INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    -- Foreign keys
    CONSTRAINT fk_grosir_warehouse_tolerance_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

-- Indexes for grosir_warehouse_tolerance
CREATE INDEX IF NOT EXISTS idx_warehouse_tolerance_product
    ON grosir_warehouse_tolerance(product_id);

-- Comments for grosir_warehouse_tolerance
COMMENT ON TABLE grosir_warehouse_tolerance IS 'Stores warehouse tolerance settings for grosir ordering';
COMMENT ON COLUMN grosir_warehouse_tolerance.tolerance_bundles IS 'Number of extra bundles allowed as tolerance';


-- Table: warehouse_inventory
-- Warehouse inventory tracking for factory products
CREATE TABLE IF NOT EXISTS warehouse_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    variant_id UUID,
    available_bundles INTEGER NOT NULL DEFAULT 0,
    reserved_bundles INTEGER NOT NULL DEFAULT 0,
    total_units INTEGER NOT NULL DEFAULT 0,
    last_restocked_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT uq_warehouse_inventory_product_variant
        UNIQUE (product_id, variant_id),

    -- Check constraints
    CONSTRAINT chk_warehouse_inventory_bundles_non_negative
        CHECK (available_bundles >= 0 AND reserved_bundles >= 0),

    CONSTRAINT chk_warehouse_inventory_units_non_negative
        CHECK (total_units >= 0)
);

-- Indexes for warehouse_inventory
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_product
    ON warehouse_inventory(product_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_available
    ON warehouse_inventory(available_bundles);

-- Comments for warehouse_inventory
COMMENT ON TABLE warehouse_inventory IS 'Warehouse inventory tracking for factory products';
COMMENT ON COLUMN warehouse_inventory.available_bundles IS 'Number of complete bundles available';
COMMENT ON COLUMN warehouse_inventory.reserved_bundles IS 'Bundles reserved for pending orders';
COMMENT ON COLUMN warehouse_inventory.total_units IS 'Total units (bundles × units_per_bundle)';


-- Table: warehouse_purchase_orders
-- Purchase orders sent to factories via WhatsApp
CREATE TABLE IF NOT EXISTS warehouse_purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL,
    product_id UUID NOT NULL,
    variant_id UUID,
    group_session_id UUID NOT NULL,
    bundles_ordered INTEGER NOT NULL,
    units_per_bundle INTEGER NOT NULL,
    total_units INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    whatsapp_message_id VARCHAR(255),
    sent_at TIMESTAMPTZ(6),
    confirmed_at TIMESTAMPTZ(6),
    received_at TIMESTAMPTZ(6),
    notes TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    -- Check constraints
    CONSTRAINT chk_warehouse_po_bundles_positive
        CHECK (bundles_ordered > 0),

    CONSTRAINT chk_warehouse_po_units_per_bundle_positive
        CHECK (units_per_bundle > 0),

    CONSTRAINT chk_warehouse_po_total_units_positive
        CHECK (total_units > 0),

    CONSTRAINT chk_warehouse_po_status
        CHECK (status IN ('pending', 'confirmed', 'received', 'cancelled'))
);

-- Indexes for warehouse_purchase_orders
CREATE INDEX IF NOT EXISTS idx_warehouse_po_factory
    ON warehouse_purchase_orders(factory_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_po_product
    ON warehouse_purchase_orders(product_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_po_session
    ON warehouse_purchase_orders(group_session_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_po_status
    ON warehouse_purchase_orders(status);

-- Comments for warehouse_purchase_orders
COMMENT ON TABLE warehouse_purchase_orders IS 'Purchase orders sent to factories via WhatsApp';
COMMENT ON COLUMN warehouse_purchase_orders.bundles_ordered IS 'Number of bundles ordered from factory';
COMMENT ON COLUMN warehouse_purchase_orders.units_per_bundle IS 'Units per bundle at time of order';
COMMENT ON COLUMN warehouse_purchase_orders.total_units IS 'Total units ordered';
COMMENT ON COLUMN warehouse_purchase_orders.status IS 'pending, confirmed, received, cancelled';
