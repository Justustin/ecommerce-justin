-- ROLLBACK: Two-Leg Shipping Migration

-- Remove columns from group_buying_sessions
ALTER TABLE group_buying_sessions
DROP COLUMN IF EXISTS bulk_shipping_cost_per_unit,
DROP COLUMN IF EXISTS bulk_shipping_cost,
DROP COLUMN IF EXISTS warehouse_id;

-- Remove column from factories
ALTER TABLE factories
DROP COLUMN IF EXISTS default_warehouse_id;

-- Drop indexes
DROP INDEX IF EXISTS idx_group_buying_sessions_warehouse;
DROP INDEX IF EXISTS idx_factories_warehouse;

-- Drop warehouses table
DROP TABLE IF EXISTS warehouses;
