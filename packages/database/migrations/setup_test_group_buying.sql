-- ========================================
-- GROUP BUYING TEST DATA SETUP
-- ========================================
-- This script creates a complete test setup for group buying with variants
-- Run this to quickly set up test data for S, M, L, XL variants

-- ========================================
-- 1. CREATE BOT USER
-- ========================================
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  phone_number,
  role,
  email_verified
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'bot@laku.system',
  'Laku',
  'Bot',
  '+628123456789',
  'user',
  true
) ON CONFLICT (email) DO NOTHING;

-- ========================================
-- 2. CREATE TEST FACTORY
-- ========================================
INSERT INTO factories (
  id,
  factory_name,
  province,
  city,
  address_line,
  phone_number,
  status,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Test T-Shirt Factory',
  'Jawa Barat',
  'Bandung',
  'Jl. Raya Industri No. 123',
  '+62221234567',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  factory_name = EXCLUDED.factory_name,
  phone_number = EXCLUDED.phone_number;

-- ========================================
-- 3. CREATE TEST PRODUCT
-- ========================================
INSERT INTO products (
  id,
  name,
  description,
  base_price,
  category_id,
  grosir_unit_size,
  is_active,
  created_at,
  updated_at
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Premium Cotton T-Shirt',
  'High quality cotton t-shirt available in S, M, L, XL. Perfect for group buying!',
  100000,
  (SELECT id FROM categories LIMIT 1),
  12,  -- Grosir = 12 units (3S + 3M + 3L + 3XL)
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  grosir_unit_size = EXCLUDED.grosir_unit_size;

-- ========================================
-- 4. CREATE PRODUCT VARIANTS (S, M, L, XL)
-- ========================================
INSERT INTO product_variants (id, variant_name, variant_value, product_id, stock_quantity, created_at, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000010', 'Size', 'S',  '20000000-0000-0000-0000-000000000001', 1000, NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000011', 'Size', 'M',  '20000000-0000-0000-0000-000000000001', 1000, NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000012', 'Size', 'L',  '20000000-0000-0000-0000-000000000001', 1000, NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000013', 'Size', 'XL', '20000000-0000-0000-0000-000000000001', 1000, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  stock_quantity = EXCLUDED.stock_quantity;

-- ========================================
-- 5. CREATE GROSIR VARIANT ALLOCATIONS
-- ========================================
-- Critical: This defines the 2x cap rule
-- Allocation = 3 means each variant can be 2*3 = 6 ahead of others

INSERT INTO grosir_variant_allocations (product_id, variant_id, allocation_quantity, created_at, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000010', 3, NOW(), NOW()),  -- S: 3 per grosir
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011', 3, NOW(), NOW()),  -- M: 3 per grosir
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012', 3, NOW(), NOW()),  -- L: 3 per grosir
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000013', 3, NOW(), NOW())   -- XL: 3 per grosir
ON CONFLICT (product_id, variant_id) DO UPDATE SET
  allocation_quantity = EXCLUDED.allocation_quantity;

-- ========================================
-- 6. ADD WAREHOUSE INVENTORY
-- ========================================
INSERT INTO warehouse_inventory (product_id, variant_id, available_quantity, reserved_quantity, created_at, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000010', 100, 0, NOW(), NOW()),  -- S: 100 units
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011', 100, 0, NOW(), NOW()),  -- M: 100 units
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000012', 100, 0, NOW(), NOW()),  -- L: 100 units
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000013', 100, 0, NOW(), NOW())   -- XL: 100 units
ON CONFLICT (product_id, variant_id) DO UPDATE SET
  available_quantity = EXCLUDED.available_quantity;

-- ========================================
-- 7. CREATE TEST USERS (for testing joins)
-- ========================================
INSERT INTO users (id, email, first_name, last_name, phone_number, role, email_verified)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'testuser1@example.com', 'Test', 'User 1', '+628111111111', 'user', true),
  ('30000000-0000-0000-0000-000000000002', 'testuser2@example.com', 'Test', 'User 2', '+628111111112', 'user', true),
  ('30000000-0000-0000-0000-000000000003', 'testuser3@example.com', 'Test', 'User 3', '+628111111113', 'user', true),
  ('30000000-0000-0000-0000-000000000004', 'testuser4@example.com', 'Test', 'User 4', '+628111111114', 'user', true),
  ('30000000-0000-0000-0000-000000000005', 'testuser5@example.com', 'Test', 'User 5', '+628111111115', 'user', true),
  ('30000000-0000-0000-0000-000000000006', 'testuser6@example.com', 'Test', 'User 6', '+628111111116', 'user', true)
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify product setup
SELECT
  p.id,
  p.name,
  p.grosir_unit_size,
  COUNT(pv.id) as variant_count
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
WHERE p.id = '20000000-0000-0000-0000-000000000001'
GROUP BY p.id, p.name, p.grosir_unit_size;

-- Verify grosir allocations
SELECT
  pv.variant_value,
  gva.allocation_quantity,
  gva.allocation_quantity * 2 as max_cap_ahead
FROM grosir_variant_allocations gva
JOIN product_variants pv ON gva.variant_id = pv.id
WHERE gva.product_id = '20000000-0000-0000-0000-000000000001'
ORDER BY pv.variant_value;

-- Verify warehouse inventory
SELECT
  pv.variant_value,
  wi.available_quantity,
  wi.reserved_quantity
FROM warehouse_inventory wi
JOIN product_variants pv ON wi.variant_id = pv.id
WHERE wi.product_id = '20000000-0000-0000-0000-000000000001'
ORDER BY pv.variant_value;

-- ========================================
-- IMPORTANT UUIDS FOR API TESTING
-- ========================================
-- Copy these for your API calls:

-- BOT_USER_ID (add to .env):
-- 00000000-0000-0000-0000-000000000001

-- PRODUCT_ID:
-- 20000000-0000-0000-0000-000000000001

-- FACTORY_ID:
-- 10000000-0000-0000-0000-000000000001

-- VARIANT IDs:
-- Size S:  20000000-0000-0000-0000-000000000010
-- Size M:  20000000-0000-0000-0000-000000000011
-- Size L:  20000000-0000-0000-0000-000000000012
-- Size XL: 20000000-0000-0000-0000-000000000013

-- TEST USER IDs:
-- User 1: 30000000-0000-0000-0000-000000000001
-- User 2: 30000000-0000-0000-0000-000000000002
-- User 3: 30000000-0000-0000-0000-000000000003
-- User 4: 30000000-0000-0000-0000-000000000004
-- User 5: 30000000-0000-0000-0000-000000000005
-- User 6: 30000000-0000-0000-0000-000000000006

-- ========================================
-- DONE! You can now create a session via API
-- ========================================
-- See GROUP_BUYING_TEST_SETUP.md for API examples
