# Database Migrations - Grosir Allocation System

This directory contains SQL migrations for the Grosir (wholesale) allocation system.

## Quick Start

### Option 1: Using SQL Migrations (Recommended for Windows)

If you're getting EPERM errors with `prisma generate` or errors with `prisma db push`, use these SQL scripts instead:

```bash
# 1. Fix the shipments issue (do this FIRST)
psql $DATABASE_URL -f packages/database/migrations/fix_shipments_pickup_task_id.sql

# 2. Apply grosir system changes
psql $DATABASE_URL -f packages/database/migrations/add_grosir_allocation_system.sql

# 3. Verify it worked
psql $DATABASE_URL -c "SELECT COUNT(*) FROM grosir_variant_allocations;"
```

**Using pgAdmin or Database GUI:**
1. Connect to your Neon database
2. Open Query Tool
3. Copy and paste contents of `fix_shipments_pickup_task_id.sql` → Execute
4. Copy and paste contents of `add_grosir_allocation_system.sql` → Execute
5. Verify tables created

### Option 2: Using Prisma (If you don't have EPERM issues)

```bash
cd packages/database

# Close any running services that might lock the files
# Then try:
pnpm run db:generate
npx prisma db push
```

---

## Files Included

### 1. `fix_shipments_pickup_task_id.sql`
**Run this FIRST** - Fixes the error:
```
Made the column `pickup_task_id` on table `shipments` required,
but there are 7 existing NULL values.
```

**What it does:**
- Makes `pickup_task_id` nullable (allows direct shipments without pickup tasks)
- This is the recommended solution

### 2. `add_grosir_allocation_system.sql`
**Main migration** - Creates grosir allocation tables and columns

**What it creates:**
- ✅ New table: `grosir_variant_allocations`
- ✅ New column: `products.grosir_unit_size`
- ✅ New columns on `group_buying_sessions`:
  - `warehouse_check_at`
  - `warehouse_has_stock`
  - `factory_notified_at`
  - `factory_whatsapp_sent`
  - `grosir_units_needed`
- ✅ New enum values: `pending_stock`, `stock_received`

### 3. `sample_grosir_data.sql`
**Helper queries** - Shows how to set up your first grosir product

**Includes:**
- Helper queries to find your product/variant IDs
- Example INSERT statements
- Verification queries

---

## After Running Migrations

### Step 1: Verify Installation

```sql
-- Check new table exists
SELECT * FROM grosir_variant_allocations LIMIT 1;

-- Check new columns on products
SELECT id, name, grosir_unit_size FROM products LIMIT 5;

-- Check new enum values
SELECT unnest(enum_range(NULL::group_status));
```

### Step 2: Set Up Your First Grosir Product

See `sample_grosir_data.sql` for detailed examples. Here's the quick version:

```sql
-- 1. Find your product
SELECT id, name FROM products WHERE name ILIKE '%shirt%';

-- 2. Set grosir unit size (e.g., 12 units per grosir)
UPDATE products
SET grosir_unit_size = 12
WHERE id = 'your-product-id';

-- 3. Find variants
SELECT id, variant_name, size
FROM product_variants
WHERE product_id = 'your-product-id';

-- 4. Create allocations (4 of each size = 12 total)
INSERT INTO grosir_variant_allocations
(product_id, variant_id, allocation_quantity) VALUES
('your-product-id', 'small-variant-id',  4),
('your-product-id', 'medium-variant-id', 4),
('your-product-id', 'large-variant-id',  4);

-- 5. Verify setup
SELECT
    p.name,
    pv.variant_name,
    gva.allocation_quantity,
    (gva.allocation_quantity * 2) AS max_allowed
FROM grosir_variant_allocations gva
JOIN products p ON gva.product_id = p.id
LEFT JOIN product_variants pv ON gva.variant_id = pv.id
WHERE p.id = 'your-product-id';
```

### Step 3: Configure Environment Variables

Add to your `.env` files:

```bash
# Group Buying Service (.env)
WAREHOUSE_SERVICE_URL=http://localhost:3011
WHATSAPP_SERVICE_URL=http://localhost:3012
WAREHOUSE_ADDRESS="Jl. Warehouse No. 123, Jakarta"

# Payment & Order Services (should already be set)
PAYMENT_SERVICE_URL=http://localhost:3006
ORDER_SERVICE_URL=http://localhost:3005
```

### Step 4: Add Factory Phone Numbers

```sql
-- Required for WhatsApp notifications
UPDATE factories
SET phone_number = '+6281234567890'  -- Indonesian format
WHERE id = 'your-factory-id';
```

---

## How the Grosir System Works

### Example: Shirt Product (Grosir = 12)
- **Allocation:** 4S + 4M + 4L + 4XL = 12 total
- **Max per variant:** 2× allocation = 8 maximum

### User Flow:
1. **User A orders 5M** → ✅ Success (5/8 used)
2. **User B orders 4M** → ❌ Error: "Only 3M available"
3. **User B orders 3M** → ✅ Success (8/8 used, **M LOCKED**)
4. **User C orders 1M** → ❌ Error: "Variant locked"
5. **User C orders 5S** → ✅ Success (S catches up, **M UNLOCKED**)

### When MOQ Reached:
1. ✅ System checks Laku warehouse stock
2. 📦 If NO stock → WhatsApp sent to factory automatically
3. ⏳ Status = `pending_stock` (wait for factory delivery)
4. 📨 Factory sends grosir to warehouse
5. ✅ Orders created, shipping begins

---

## Troubleshooting

### ❌ Error: "psql: command not found"

**Solution:** Use pgAdmin, DBeaver, or your database GUI instead. Just copy/paste the SQL and run it.

### ❌ Error: "relation grosir_variant_allocations already exists"

**Solution:** That's fine! It means the table was already created. Skip that file.

### ❌ Error: "enum value already exists"

**Solution:** Ignore it - the script handles this with `IF NOT EXISTS` checks.

### ⚠️ Still getting EPERM errors?

**Solution:** Close these services before running `prisma generate`:
```bash
# Stop all services
pnpm run dev  # Ctrl+C to stop

# Or close VS Code, Docker, or any tools using the database files
```

---

## Testing the System

### Test 1: Variant Limit Enforcement
```bash
# Create a group buying session for a grosir product
# Join with same variant until you hit the 2x limit
# Should see error: "Variant is currently locked"
```

### Test 2: Warehouse Stock Check
```bash
# Reach MOQ on a session
# Check logs for: "Checking warehouse stock for session"
# Should see warehouse service being called
```

### Test 3: Factory WhatsApp
```bash
# Set warehouse stock to 0 for test product
# Trigger expired session processing
# Check logs for: "Factory notified via WhatsApp"
# Verify session status = 'pending_stock'
```

---

## Need Help?

- **Schema issues:** Check `packages/database/prisma/schema.prisma`
- **Service logs:** Check group-buying service, warehouse service logs
- **Database connection:** Verify your `DATABASE_URL` in `.env`

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove grosir tables
DROP TABLE IF EXISTS grosir_variant_allocations CASCADE;

-- Remove new columns
ALTER TABLE products DROP COLUMN IF EXISTS grosir_unit_size;
ALTER TABLE group_buying_sessions
    DROP COLUMN IF EXISTS warehouse_check_at,
    DROP COLUMN IF EXISTS warehouse_has_stock,
    DROP COLUMN IF EXISTS factory_notified_at,
    DROP COLUMN IF EXISTS factory_whatsapp_sent,
    DROP COLUMN IF EXISTS grosir_units_needed;

-- Note: Cannot easily remove enum values, but they won't hurt anything
```
