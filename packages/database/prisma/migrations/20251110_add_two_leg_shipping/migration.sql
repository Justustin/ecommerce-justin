-- TWO-LEG SHIPPING MIGRATION
-- Leg 1: Factory → Warehouse (bulk shipping, admin input)
-- Leg 2: Warehouse → User (individual shipping, Biteship calculation)

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address_line TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100),
  postal_code INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add default_warehouse_id to factories
-- Each factory ships to a designated warehouse
ALTER TABLE factories
ADD COLUMN IF NOT EXISTS default_warehouse_id UUID REFERENCES warehouses(id);

-- Add two-leg shipping fields to group_buying_sessions
ALTER TABLE group_buying_sessions
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id),
ADD COLUMN IF NOT EXISTS bulk_shipping_cost DECIMAL(12, 2) DEFAULT 0 COMMENT 'Leg 1: Total cost from factory to warehouse (admin input)',
ADD COLUMN IF NOT EXISTS bulk_shipping_cost_per_unit DECIMAL(12, 2) GENERATED ALWAYS AS (
  CASE
    WHEN target_moq > 0 THEN bulk_shipping_cost / target_moq
    ELSE 0
  END
) STORED COMMENT 'Calculated: bulk_shipping_cost ÷ target_moq';

-- Create index for faster warehouse lookups
CREATE INDEX IF NOT EXISTS idx_factories_warehouse ON factories(default_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_group_buying_sessions_warehouse ON group_buying_sessions(warehouse_id);

-- Add comments for documentation
COMMENT ON TABLE warehouses IS 'Warehouses that receive bulk shipments from factories';
COMMENT ON COLUMN factories.default_warehouse_id IS 'Default warehouse for this factory (Leg 1 destination)';
COMMENT ON COLUMN group_buying_sessions.warehouse_id IS 'Warehouse used for this session (Leg 2 origin)';
COMMENT ON COLUMN group_buying_sessions.bulk_shipping_cost IS 'Admin-input total cost to ship all units from factory to warehouse';
COMMENT ON COLUMN group_buying_sessions.bulk_shipping_cost_per_unit IS 'Auto-calculated per-unit Leg 1 cost (divided equally among all units)';
