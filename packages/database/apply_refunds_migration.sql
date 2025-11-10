-- ============================================================================
-- Migration: Make refunds.order_id Nullable
-- Date: 2025-11-10
-- Purpose: Support escrow refunds without associated orders
-- ============================================================================

-- Display current schema before migration
\echo '=== BEFORE MIGRATION ==='
\echo 'Current refunds.order_id column definition:'
SELECT
    column_name,
    is_nullable,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'refunds'
  AND column_name = 'order_id';

\echo ''
\echo 'Count of existing refunds with order_id:'
SELECT COUNT(*) as total_refunds FROM refunds;

\echo ''
\echo '=== APPLYING MIGRATION ==='

-- Apply the schema change
ALTER TABLE "refunds" ALTER COLUMN "order_id" DROP NOT NULL;

\echo 'Migration applied successfully!'
\echo ''

-- Verify the change
\echo '=== AFTER MIGRATION ==='
\echo 'Updated refunds.order_id column definition:'
SELECT
    column_name,
    is_nullable,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'refunds'
  AND column_name = 'order_id';

\echo ''
\echo '=== VERIFICATION ==='
\echo 'Expected: is_nullable = YES'
\echo ''
\echo 'Migration complete! The refunds.order_id column is now nullable.'
\echo 'This allows refunding escrow payments without order_id.'
