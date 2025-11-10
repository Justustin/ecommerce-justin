-- ROLLBACK: Revert refunds.order_id back to NOT NULL
-- ⚠️ WARNING: This will FAIL if any refunds exist with NULL order_id
--
-- Before running this rollback, verify no NULL values exist:
-- SELECT COUNT(*) FROM refunds WHERE order_id IS NULL;
--
-- If NULL values exist, you must either:
-- 1. Delete those refund records (not recommended)
-- 2. Update them with valid order_ids (requires business logic)
-- 3. Keep the column nullable (recommended)

-- AlterTable
ALTER TABLE "refunds" ALTER COLUMN "order_id" SET NOT NULL;
