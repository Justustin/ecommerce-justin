-- Sample Data: Grosir Allocation System Setup
-- Description: Example data showing how to set up a product with grosir allocations

-- ============================================================
-- EXAMPLE: T-Shirt Product with Grosir = 12 (4S+4M+4L+4XL)
-- ============================================================

-- Step 1: Update an existing product to use grosir system
-- Replace 'your-product-id' with actual product UUID
/*
UPDATE products
SET grosir_unit_size = 12
WHERE id = 'your-product-id';
*/

-- Step 2: Create grosir allocations for each variant
-- Replace UUIDs with your actual product_id and variant_ids
/*
INSERT INTO grosir_variant_allocations (product_id, variant_id, allocation_quantity)
VALUES
    ('your-product-id', 'variant-small-id',  4),   -- 4 Small per grosir
    ('your-product-id', 'variant-medium-id', 4),   -- 4 Medium per grosir
    ('your-product-id', 'variant-large-id',  4),   -- 4 Large per grosir
    ('your-product-id', 'variant-xl-id',     4);   -- 4 XL per grosir
*/

-- ============================================================
-- HELPER QUERIES: Find your product and variant IDs
-- ============================================================

-- Find products (look for your product name)
SELECT
    id AS product_id,
    name,
    sku,
    min_order_quantity AS moq,
    grosir_unit_size
FROM products
ORDER BY created_at DESC
LIMIT 10;

-- Find variants for a specific product
-- Replace 'your-product-id' with actual UUID from query above
/*
SELECT
    id AS variant_id,
    variant_name,
    size,
    color,
    sku
FROM product_variants
WHERE product_id = 'your-product-id'
ORDER BY variant_name;
*/

-- ============================================================
-- COMPLETE EXAMPLE: Setting up Shirt Product
-- ============================================================
/*
-- 1. Find the product
SELECT id, name FROM products WHERE name ILIKE '%shirt%' LIMIT 1;

-- 2. Let's say product_id = 'abc-123-def-456'
-- Update it to use grosir
UPDATE products
SET grosir_unit_size = 12
WHERE id = 'abc-123-def-456';

-- 3. Find the variants
SELECT id, variant_name, size
FROM product_variants
WHERE product_id = 'abc-123-def-456';

-- 4. Let's say we got these variant IDs:
-- Small:  'var-111'
-- Medium: 'var-222'
-- Large:  'var-333'
-- XL:     'var-444'

-- 5. Create allocations
INSERT INTO grosir_variant_allocations (product_id, variant_id, allocation_quantity)
VALUES
    ('abc-123-def-456', 'var-111', 4),  -- 4 Small
    ('abc-123-def-456', 'var-222', 4),  -- 4 Medium
    ('abc-123-def-456', 'var-333', 4),  -- 4 Large
    ('abc-123-def-456', 'var-444', 4);  -- 4 XL

-- 6. Verify setup
SELECT
    p.name AS product_name,
    p.grosir_unit_size,
    pv.variant_name,
    pv.size,
    gva.allocation_quantity,
    (gva.allocation_quantity * 2) AS max_per_session
FROM grosir_variant_allocations gva
JOIN products p ON gva.product_id = p.id
JOIN product_variants pv ON gva.variant_id = pv.id
WHERE p.id = 'abc-123-def-456';
*/

-- ============================================================
-- VERIFY GROSIR SETUP (Run this after setup)
-- ============================================================

-- Check all products with grosir configured
SELECT
    p.id,
    p.name,
    p.sku,
    p.grosir_unit_size,
    COUNT(gva.id) AS variant_count,
    SUM(gva.allocation_quantity) AS total_units_per_grosir
FROM products p
LEFT JOIN grosir_variant_allocations gva ON p.id = gva.product_id
WHERE p.grosir_unit_size IS NOT NULL
GROUP BY p.id, p.name, p.sku, p.grosir_unit_size;

-- Check variant allocations for all products
SELECT
    p.name AS product_name,
    pv.variant_name,
    pv.size,
    gva.allocation_quantity,
    (gva.allocation_quantity * 2) AS max_allowed
FROM grosir_variant_allocations gva
JOIN products p ON gva.product_id = p.id
LEFT JOIN product_variants pv ON gva.variant_id = pv.id
ORDER BY p.name, pv.variant_name;
