-- Fix: shipments.pickup_task_id NULL values
-- Issue: Column was changed to required but 7 rows have NULL values
-- Solution: Either create dummy pickup tasks or make column nullable

-- ============================================================
-- OPTION 1: Make pickup_task_id nullable (RECOMMENDED)
-- ============================================================
-- This allows shipments to exist without pickup tasks
-- Good for direct-to-customer shipments or legacy data

ALTER TABLE shipments
ALTER COLUMN pickup_task_id DROP NOT NULL;

COMMENT ON COLUMN shipments.pickup_task_id IS 'Optional pickup task ID. NULL for direct shipments.';

-- ============================================================
-- OPTION 2: Create dummy pickup tasks for existing shipments (ALTERNATIVE)
-- ============================================================
-- Only use this if you absolutely need every shipment to have a pickup task

/*
-- First, let's see which shipments have NULL pickup_task_id
SELECT
    id,
    order_id,
    tracking_number,
    created_at
FROM shipments
WHERE pickup_task_id IS NULL
ORDER BY created_at DESC;

-- Create a dummy pickup task for legacy shipments
INSERT INTO pickup_tasks (
    task_code,
    group_session_id,
    factory_id,
    office_id,
    status,
    total_items,
    total_orders,
    scheduled_date,
    notes
)
SELECT
    'LEGACY-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 10),
    -- You'll need to get these values from your orders/sessions
    (SELECT id FROM group_buying_sessions LIMIT 1), -- Replace with actual
    (SELECT id FROM factories LIMIT 1),              -- Replace with actual
    (SELECT id FROM agent_offices LIMIT 1),          -- Replace with actual
    'completed'::pickup_status,
    1,
    1,
    CURRENT_DATE - INTERVAL '30 days',
    'Legacy pickup task created for data migration'
FROM generate_series(1, 7) -- 7 NULL values
RETURNING id;

-- Then update the shipments with the new pickup_task_id
-- You'll need to match shipments to pickup tasks appropriately
-- This is just an example:
WITH legacy_tasks AS (
    SELECT id
    FROM pickup_tasks
    WHERE notes LIKE 'Legacy pickup task%'
    ORDER BY created_at DESC
    LIMIT 7
),
null_shipments AS (
    SELECT id
    FROM shipments
    WHERE pickup_task_id IS NULL
    ORDER BY created_at DESC
    LIMIT 7
)
UPDATE shipments s
SET pickup_task_id = (
    SELECT lt.id
    FROM legacy_tasks lt
    LIMIT 1
)
FROM null_shipments ns
WHERE s.id = ns.id;
*/

-- ============================================================
-- VERIFY FIX
-- ============================================================

-- Check if any NULL values remain
SELECT
    COUNT(*) AS null_count,
    COUNT(*) FILTER (WHERE pickup_task_id IS NOT NULL) AS has_pickup_task
FROM shipments;

-- If using Option 1 (nullable), this should show NULL is allowed
SELECT
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'shipments'
AND column_name = 'pickup_task_id';
