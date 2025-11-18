-- Rollback Migration: Remove warehouse and bundle configuration tables
-- Created: 2025-11-18
-- Description: Drops all warehouse-related tables added in add_warehouse_tables.sql

-- Drop tables in reverse order (to handle dependencies)
DROP TABLE IF EXISTS warehouse_purchase_orders CASCADE;
DROP TABLE IF EXISTS warehouse_inventory CASCADE;
DROP TABLE IF EXISTS grosir_warehouse_tolerance CASCADE;
DROP TABLE IF EXISTS grosir_bundle_config CASCADE;

-- Note: This does not drop the uuid-ossp extension as it may be used by other tables
