-- Migration: Add Grosir Bundle Config and Warehouse Tolerance Tables
-- Date: 2025-11-09
-- Description: Add new tables for correct grosir allocation system
-- Dependencies: Requires products and product_variants tables to exist

-- ============================================================================
-- NEW GROSIR ALLOCATION SYSTEM
-- ============================================================================
-- Background:
-- Old system: grosir_variant_allocations with progressive unlock (WRONG)
-- New system: Bundle-based warehouse tolerance (CORRECT)
--
-- Key concepts:
-- 1. grosir_bundle_config: Defines factory bundle composition
--    Example: 1 bundle = 2S + 5M + 4L + 1XL (12 total units)
--
-- 2. grosir_warehouse_tolerance: Defines max excess units acceptable
--    Example: XL can have max 30 excess units in warehouse
--
-- Algorithm: Control how many bundles to buy by monitoring warehouse excess
-- ============================================================================

-- ============================================================================
-- CREATE: grosir_bundle_config
-- ============================================================================

CREATE TABLE IF NOT EXISTS grosir_bundle_config (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL,
  variant_id       UUID,  -- NULL for base product (no variants)
  units_per_bundle INT NOT NULL CHECK (units_per_bundle > 0),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign keys
  CONSTRAINT fk_bundle_config_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_bundle_config_variant
    FOREIGN KEY (variant_id)
    REFERENCES product_variants(id)
    ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT unique_bundle_config_product_variant
    UNIQUE (product_id, variant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bundle_config_product ON grosir_bundle_config(product_id);

-- Comments
COMMENT ON TABLE grosir_bundle_config IS 'Factory bundle composition per product variant';
COMMENT ON COLUMN grosir_bundle_config.units_per_bundle IS 'How many units of this variant in one factory bundle';
COMMENT ON COLUMN grosir_bundle_config.notes IS 'Admin notes on factory bundle composition';

-- ============================================================================
-- CREATE: grosir_warehouse_tolerance
-- ============================================================================

CREATE TABLE IF NOT EXISTS grosir_warehouse_tolerance (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id              UUID NOT NULL,
  variant_id              UUID,  -- NULL for base product (no variants)
  max_excess_units        INT NOT NULL CHECK (max_excess_units >= 0),
  clearance_rate_estimate INT CHECK (clearance_rate_estimate >= 0 AND clearance_rate_estimate <= 100),
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign keys
  CONSTRAINT fk_tolerance_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_tolerance_variant
    FOREIGN KEY (variant_id)
    REFERENCES product_variants(id)
    ON DELETE CASCADE,

  -- Constraints
  CONSTRAINT unique_tolerance_product_variant
    UNIQUE (product_id, variant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tolerance_product ON grosir_warehouse_tolerance(product_id);

-- Comments
COMMENT ON TABLE grosir_warehouse_tolerance IS 'Warehouse tolerance configuration per product variant';
COMMENT ON COLUMN grosir_warehouse_tolerance.max_excess_units IS 'Maximum excess units acceptable in warehouse for this variant';
COMMENT ON COLUMN grosir_warehouse_tolerance.clearance_rate_estimate IS 'Estimated percentage of excess that can be cleared (0-100)';
COMMENT ON COLUMN grosir_warehouse_tolerance.notes IS 'Admin notes on tolerance setting (e.g., "XL hard to clear")';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables created
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('grosir_bundle_config', 'grosir_warehouse_tolerance');
-- Expected: 2 rows

-- Check constraints
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name IN ('grosir_bundle_config', 'grosir_warehouse_tolerance');

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Example: Premium Hoodie product
-- Uncomment to insert sample data:

/*
-- Assuming you have a product with ID and 4 variants (S, M, L, XL)
-- Replace UUIDs with actual IDs from your database

-- Bundle config: 2S + 5M + 4L + 1XL per bundle (12 total)
INSERT INTO grosir_bundle_config (product_id, variant_id, units_per_bundle, notes)
VALUES
  ('product-uuid-here', 'variant-s-uuid', 2, 'S-size: 2 per bundle'),
  ('product-uuid-here', 'variant-m-uuid', 5, 'M-size: 5 per bundle (popular)'),
  ('product-uuid-here', 'variant-l-uuid', 4, 'L-size: 4 per bundle'),
  ('product-uuid-here', 'variant-xl-uuid', 1, 'XL-size: 1 per bundle (slow moving)');

-- Warehouse tolerance: Different for each variant
INSERT INTO grosir_warehouse_tolerance (product_id, variant_id, max_excess_units, clearance_rate_estimate, notes)
VALUES
  ('product-uuid-here', 'variant-s-uuid', 20, 35, 'S sells moderately in clearance'),
  ('product-uuid-here', 'variant-m-uuid', 50, 75, 'M sells very well in clearance'),
  ('product-uuid-here', 'variant-l-uuid', 40, 70, 'L sells well in clearance'),
  ('product-uuid-here', 'variant-xl-uuid', 30, 45, 'XL harder to clear but manageable for hoodies');
*/

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- DROP TABLE IF EXISTS grosir_warehouse_tolerance CASCADE;
-- DROP TABLE IF EXISTS grosir_bundle_config CASCADE;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Tables Added: 2
--   - grosir_bundle_config (factory bundle composition)
--   - grosir_warehouse_tolerance (warehouse capacity limits)
--
-- Old Table Status:
--   - grosir_variant_allocations: KEPT but marked DEPRECATED in schema
--     (can be dropped after migration is complete and tested)
--
-- Next Steps:
--   1. Run this migration
--   2. Update Prisma: pnpm db:generate
--   3. Update group-buying-service with new algorithm
--   4. Test with sample data
--   5. Migrate existing grosir_variant_allocations data (if needed)
--   6. Drop grosir_variant_allocations table (after verification)
