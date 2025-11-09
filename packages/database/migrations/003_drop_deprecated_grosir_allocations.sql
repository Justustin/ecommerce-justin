-- Migration: Drop Deprecated Grosir Variant Allocations Table
-- Date: 2025-11-09
-- Description: Remove old grosir_variant_allocations table (replaced by bundle-based system)
-- Dependencies: Requires 002_add_grosir_bundle_tolerance_tables.sql to be applied

-- ============================================================================
-- CLEAN UP OLD GROSIR SYSTEM
-- ============================================================================
-- The grosir_variant_allocations table used the WRONG approach (progressive unlock)
-- It has been replaced by:
--   - grosir_bundle_config (factory bundle composition)
--   - grosir_warehouse_tolerance (warehouse capacity limits)
--
-- This migration drops the deprecated table.
-- ============================================================================

-- Drop the deprecated table
DROP TABLE IF EXISTS grosir_variant_allocations CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table dropped
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name = 'grosir_variant_allocations';
-- Expected: 0 rows

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To recreate the table (if needed for rollback):
/*
CREATE TABLE grosir_variant_allocations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL,
  variant_id          UUID,
  allocation_quantity INT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_grosir_allocations_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_grosir_allocations_variant
    FOREIGN KEY (variant_id)
    REFERENCES product_variants(id)
    ON DELETE CASCADE,

  CONSTRAINT unique_grosir_product_variant
    UNIQUE (product_id, variant_id)
);

CREATE INDEX idx_grosir_allocations_product ON grosir_variant_allocations(product_id);
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Tables Dropped: 1
--   - grosir_variant_allocations (deprecated progressive unlock system)
--
-- Next Steps:
--   1. Update Prisma schema to remove model
--   2. Regenerate Prisma client: pnpm db:generate
--   3. Verify no code references old table
