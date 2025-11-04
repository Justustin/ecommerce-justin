# Group Buying Test Setup Guide
## Testing Product with Variants (S, M, L, XL)

This guide will help you set up and test the group buying system with grosir variant allocations.

---

## Step 1: Database Setup

### 1.1 Run the Tiering Migration

```bash
cd packages/database
psql -U your_user -d your_database -f migrations/add_tiering_system.sql
psql -U your_user -d your_database -f migrations/add_grosir_allocation_system.sql
```

### 1.2 Create a Bot User (for auto-join)

```sql
-- Create bot user account
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  phone_number,
  role,
  email_verified
) VALUES (
  '00000000-0000-0000-0000-000000000001',  -- Fixed UUID for bot
  'bot@laku.system',
  'Laku',
  'Bot',
  '+628123456789',
  'user',
  true
) ON CONFLICT (email) DO NOTHING;

-- Add this to your .env file:
-- BOT_USER_ID=00000000-0000-0000-0000-000000000001
```

### 1.3 Create Test Factory (if not exists)

```sql
INSERT INTO factories (
  id,
  factory_name,
  province,
  city,
  address_line,
  phone_number,
  status
) VALUES (
  uuid_generate_v4(),
  'Test T-Shirt Factory',
  'Jawa Barat',
  'Bandung',
  'Jl. Raya Industri No. 123',
  '+62221234567',
  'active'
) RETURNING id;

-- Save the returned UUID, you'll need it for the API call
```

### 1.4 Create Product with Variants

```sql
-- 1. Create the product
INSERT INTO products (
  id,
  name,
  description,
  base_price,
  category_id,
  grosir_unit_size,  -- Important: Define grosir unit size
  is_active
) VALUES (
  uuid_generate_v4(),
  'Premium Cotton T-Shirt',
  'High quality cotton t-shirt with various sizes',
  100000,  -- Base price: Rp 100,000
  (SELECT id FROM categories LIMIT 1),  -- Use any existing category
  12,      -- Grosir unit = 12 pieces (3S + 3M + 3L + 3XL)
  true
) RETURNING id;

-- Save the returned product UUID
-- Example: '550e8400-e29b-41d4-a716-446655440000'
```

```sql
-- 2. Create Size variants (S, M, L, XL)
-- Replace 'YOUR_PRODUCT_ID' with the UUID from above

INSERT INTO product_variants (variant_name, variant_value, product_id, stock_quantity)
VALUES
  ('Size', 'S',  'YOUR_PRODUCT_ID', 1000),
  ('Size', 'M',  'YOUR_PRODUCT_ID', 1000),
  ('Size', 'L',  'YOUR_PRODUCT_ID', 1000),
  ('Size', 'XL', 'YOUR_PRODUCT_ID', 1000)
RETURNING id, variant_value;

-- Save all 4 variant IDs:
-- Size S:  '550e8400-e29b-41d4-a716-446655440010'
-- Size M:  '550e8400-e29b-41d4-a716-446655440011'
-- Size L:  '550e8400-e29b-41d4-a716-446655440012'
-- Size XL: '550e8400-e29b-41d4-a716-446655440013'
```

### 1.5 Configure Grosir Variant Allocations

This is **critical** for the dynamic cap logic to work!

```sql
-- GROSIR ALLOCATION: 12 units per grosir = 3S + 3M + 3L + 3XL
-- Replace with your actual product_id and variant_ids

INSERT INTO grosir_variant_allocations (product_id, variant_id, allocation_quantity)
VALUES
  ('YOUR_PRODUCT_ID', 'YOUR_VARIANT_S_ID',  3),  -- 3 units of S per grosir
  ('YOUR_PRODUCT_ID', 'YOUR_VARIANT_M_ID',  3),  -- 3 units of M per grosir
  ('YOUR_PRODUCT_ID', 'YOUR_VARIANT_L_ID',  3),  -- 3 units of L per grosir
  ('YOUR_PRODUCT_ID', 'YOUR_VARIANT_XL_ID', 3);  -- 3 units of XL per grosir

-- Verify allocations
SELECT
  p.name,
  pv.variant_value,
  gva.allocation_quantity
FROM grosir_variant_allocations gva
JOIN products p ON gva.product_id = p.id
LEFT JOIN product_variants pv ON gva.variant_id = pv.id
WHERE p.id = 'YOUR_PRODUCT_ID';
```

**Expected Result:**
```
        name         | variant_value | allocation_quantity
---------------------+---------------+--------------------
 Premium Cotton T-Shirt | S             |                  3
 Premium Cotton T-Shirt | M             |                  3
 Premium Cotton T-Shirt | L             |                  3
 Premium Cotton T-Shirt | XL            |                  3
```

### 1.6 Add Product to Warehouse (for stock checking)

```sql
-- Add inventory for each variant
INSERT INTO warehouse_inventory (product_id, variant_id, available_quantity, reserved_quantity)
VALUES
  ('YOUR_PRODUCT_ID', 'YOUR_VARIANT_S_ID',  100, 0),
  ('YOUR_PRODUCT_ID', 'YOUR_VARIANT_M_ID',  100, 0),
  ('YOUR_PRODUCT_ID', 'YOUR_VARIANT_L_ID',  100, 0),
  ('YOUR_PRODUCT_ID', 'YOUR_VARIANT_XL_ID', 100, 0);
```

---

## Step 2: Create Group Buying Session via API

### 2.1 API Request

```bash
curl -X POST http://localhost:3004/api/group-buying \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "factoryId": "YOUR_FACTORY_ID",
    "sessionCode": "TSHIRT2025",
    "targetMoq": 12,
    "groupPrice": 150000,
    "priceTier25": 150000,
    "priceTier50": 135000,
    "priceTier75": 120000,
    "priceTier100": 105000,
    "endTime": "2025-12-31T23:59:59.000Z",
    "estimatedCompletionDate": "2026-01-15T00:00:00.000Z"
  }'
```

### 2.2 Expected Response

```json
{
  "message": "Group buying session created successfully",
  "data": {
    "id": "SESSION_ID",
    "session_code": "TSHIRT2025",
    "status": "forming",
    "target_moq": 12,
    "group_price": 150000,
    "price_tier_25": 150000,
    "price_tier_50": 135000,
    "price_tier_75": 120000,
    "price_tier_100": 105000,
    "current_tier": 25,
    "bot_participant_id": "BOT_PARTICIPANT_UUID",
    "group_participants": [
      {
        "id": "BOT_PARTICIPANT_UUID",
        "quantity": 3,
        "is_bot_participant": true,
        "unit_price": 150000
      }
    ]
  }
}
```

**Note:** Bot automatically joined with 3 units (25% of 12 MOQ)

---

## Step 3: Test Variant Availability

### 3.1 Check Variant Availability (Internal - for debugging)

You can add this endpoint to your controller for testing:

```typescript
// In group-buying.controller.ts
async getVariantAvailability(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { variantId } = req.query;

    const availability = await this.service.getVariantAvailability(
      id,
      variantId as string
    );

    res.json({ success: true, data: availability });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
```

```bash
# Check availability for Size M
curl -X GET "http://localhost:3004/api/group-buying/SESSION_ID/variant-availability?variantId=YOUR_VARIANT_M_ID"
```

**Expected Response (initial state):**
```json
{
  "variantId": "YOUR_VARIANT_M_ID",
  "allocation": 3,
  "maxAllowed": 6,           // min(0) + 2*3 = 6
  "totalOrdered": 0,
  "available": 6,
  "isLocked": false,
  "minOrderedAcrossVariants": 0,
  "ordersByVariant": {
    "YOUR_VARIANT_S_ID": 0,
    "YOUR_VARIANT_M_ID": 0,
    "YOUR_VARIANT_L_ID": 0,
    "YOUR_VARIANT_XL_ID": 0
  }
}
```

---

## Step 4: Test the Dynamic Cap Logic

### Test Scenario 1: Order 6M (should succeed and lock M)

```bash
curl -X POST http://localhost:3004/api/group-buying/SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_1_ID",
    "quantity": 6,
    "variantId": "YOUR_VARIANT_M_ID",
    "unitPrice": 150000,
    "totalPrice": 900000
  }'
```

**Expected:** ✅ Success
- M ordered: 6/6 (LOCKED)
- All others: 0/6 (available)

**Check variant availability again:**
```bash
curl -X GET "http://localhost:3004/api/group-buying/SESSION_ID/variant-availability?variantId=YOUR_VARIANT_M_ID"
```

**Expected Response:**
```json
{
  "maxAllowed": 6,           // min(0) + 2*3 = 6
  "totalOrdered": 6,
  "available": 0,            // M is LOCKED!
  "isLocked": true,
  "minOrderedAcrossVariants": 0,
  "ordersByVariant": {
    "S": 0,
    "M": 6,   // ← Locked
    "L": 0,
    "XL": 0
  }
}
```

---

### Test Scenario 2: Try to order 1 more M (should fail)

```bash
curl -X POST http://localhost:3004/api/group-buying/SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_2_ID",
    "quantity": 1,
    "variantId": "YOUR_VARIANT_M_ID",
    "unitPrice": 150000,
    "totalPrice": 150000
  }'
```

**Expected:** ❌ Error
```json
{
  "error": "Variant is currently locked. Max 6 allowed, 6 already ordered. Other variants need to catch up before you can order more of this variant."
}
```

---

### Test Scenario 3: Order 3S, 3L, 3XL (unlocks M)

```bash
# Order 3 S
curl -X POST http://localhost:3004/api/group-buying/SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_3_ID",
    "quantity": 3,
    "variantId": "YOUR_VARIANT_S_ID",
    "unitPrice": 135000,
    "totalPrice": 405000
  }'

# Order 3 L
curl -X POST http://localhost:3004/api/group-buying/SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_4_ID",
    "quantity": 3,
    "variantId": "YOUR_VARIANT_L_ID",
    "unitPrice": 135000,
    "totalPrice": 405000
  }'

# Order 3 XL
curl -X POST http://localhost:3004/api/group-buying/SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_5_ID",
    "quantity": 3,
    "variantId": "YOUR_VARIANT_XL_ID",
    "unitPrice": 135000,
    "totalPrice": 405000
  }'
```

**Expected:** ✅ All succeed
- Now: S=3, M=6, L=3, XL=3
- Min = 3
- M cap = 3 + (2*3) = 9 (M UNLOCKED!)

**Tier should upgrade to 50%** because real users ordered: 6+3+3+3 = 15 units = 125% of MOQ!
- Bot: 3 units (doesn't count)
- Real users: 15 units (15/12 = 125% ≥ 50%)
- Current tier should be **100%**
- Price should drop to **Rp 105,000**

---

### Test Scenario 4: Order 3 more M (should succeed now)

```bash
curl -X POST http://localhost:3004/api/group-buying/SESSION_ID/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_6_ID",
    "quantity": 3,
    "variantId": "YOUR_VARIANT_M_ID",
    "unitPrice": 105000,
    "totalPrice": 315000
  }'
```

**Expected:** ✅ Success
- M is now 9/9 (LOCKED again)
- Final state: S=3, M=9, L=3, XL=3

---

## Step 5: Check Session Progress

```bash
curl -X GET http://localhost:3004/api/group-buying/SESSION_ID/stats
```

**Expected Response:**
```json
{
  "participantCount": 18,      // Total: 3 (bot) + 15 (real)
  "totalQuantity": 18,
  "targetMoq": 12,
  "progress": 150,             // 18/12 = 150%
  "moqReached": true,
  "status": "active",
  "currentTier": 100,
  "groupPrice": 105000         // Dropped to tier 100 price!
}
```

---

## Step 6: Verify Dynamic Cap Logic

**Query to see all orders:**
```sql
SELECT
  gp.quantity,
  pv.variant_value,
  gp.unit_price,
  gp.is_bot_participant,
  u.email
FROM group_participants gp
LEFT JOIN product_variants pv ON gp.variant_id = pv.id
JOIN users u ON gp.user_id = u.id
WHERE gp.group_session_id = 'SESSION_ID'
ORDER BY gp.joined_at;
```

**Expected Result:**
```
quantity | variant_value | unit_price | is_bot_participant | email
---------+---------------+------------+--------------------+------------------
    3    | null          |   150000   | true               | bot@laku.system
    6    | M             |   150000   | false              | user1@example.com
    3    | S             |   135000   | false              | user3@example.com
    3    | L             |   135000   | false              | user4@example.com
    3    | XL            |   135000   | false              | user5@example.com
    3    | M             |   105000   | false              | user6@example.com
```

---

## Step 7: Process Session (Simulate MOQ Reached)

### Manually trigger processing:

```bash
curl -X POST http://localhost:3004/api/group-buying/process-expired
```

**What should happen:**
1. ✅ Bot participant removed (quantity 3)
2. ✅ Orders created for 5 real users (15 total items)
3. ✅ Warehouse stock checked per variant
4. ✅ If stock available → orders created
5. ✅ If stock insufficient → WhatsApp sent to factory

---

## Summary of Dynamic Cap Logic

| Step | Action | S | M | L | XL | Min | M Cap | M Status |
|------|--------|---|---|---|----|----|-------|----------|
| 1 | Initial | 0 | 0 | 0 | 0 | 0 | 6 | Available |
| 2 | Order 6M | 0 | 6 | 0 | 0 | 0 | 6 | 🔒 LOCKED |
| 3 | Order 3S,3L,3XL | 3 | 6 | 3 | 3 | 3 | 9 | ✅ UNLOCKED |
| 4 | Order 3M | 3 | 9 | 3 | 3 | 3 | 9 | 🔒 LOCKED |

**Formula:** `M_cap = min(S,M,L,XL) + (2 × allocation)`

---

## Troubleshooting

### Issue: "Variant allocation not configured"
**Solution:** Run Step 1.5 to insert grosir_variant_allocations

### Issue: Bot didn't join
**Solution:**
1. Check BOT_USER_ID is set in .env
2. Verify bot user exists in database
3. Check logs for bot creation errors

### Issue: Variant not locking
**Solution:**
1. Verify grosir_variant_allocations exist
2. Check that allocation_quantity = 3 for all variants
3. Verify product.grosir_unit_size = 12

### Issue: Price not upgrading
**Solution:**
1. Check tier calculation excludes bot (is_bot_participant = false)
2. Verify tier prices are set correctly
3. Check logs for tier update errors

---

## Next Steps

After testing, you can:
1. Set up cron job to auto-process expired sessions
2. Integrate payment gateway (Xendit)
3. Add WhatsApp notifications for tier upgrades
4. Create frontend UI for variant selection

---

**Good luck testing! 🎉**
