# Migration: Make refunds.order_id Nullable

**Date:** 2025-11-10
**Migration:** `20251110_make_refunds_order_id_nullable`

## Purpose

Makes the `refunds.order_id` column nullable to support escrow refunds that don't have associated orders yet.

## Business Context

In the group buying flow:
1. Users join a group buying session and pay (escrow payment)
2. Payment is held in escrow until session reaches MOQ
3. If session fails to reach MOQ, refunds are issued
4. **At refund time, no order has been created yet** (order is only created after MOQ is reached)

This migration allows refunding escrow payments without requiring an `order_id`.

## Schema Change

```diff
model refunds {
  ...
- order_id         String    @db.Uuid
+ order_id         String?   @db.Uuid
  ...
- orders           orders    @relation(...)
+ orders           orders?   @relation(...)
}
```

## SQL Change

```sql
ALTER TABLE "refunds" ALTER COLUMN "order_id" DROP NOT NULL;
```

## How to Run This Migration

### Option 1: Using Prisma Migrate (Recommended)

```bash
cd packages/database
npx prisma migrate deploy
```

This will apply all pending migrations in the `migrations/` directory.

### Option 2: Manual SQL Execution

If Prisma Migrate is not set up, run the SQL directly:

```bash
psql -h localhost -U your_user -d your_database -f migrations/20251110_make_refunds_order_id_nullable/migration.sql
```

Or using a database client, execute:

```sql
ALTER TABLE "refunds" ALTER COLUMN "order_id" DROP NOT NULL;
```

## Verification

After running the migration, verify the change:

```sql
-- Check column nullable status
SELECT
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'refunds'
  AND column_name = 'order_id';
```

Expected result:
- `is_nullable` should be `'YES'`

## Rollback

**⚠️ WARNING:** Rolling back this migration will fail if any refunds exist with `NULL` order_id.

Before rolling back, check for NULL values:

```sql
SELECT COUNT(*) FROM refunds WHERE order_id IS NULL;
```

If count is 0, you can rollback:

```sql
ALTER TABLE "refunds" ALTER COLUMN "order_id" SET NOT NULL;
```

## Impact

- ✅ **Low Risk:** Only adds flexibility, doesn't remove functionality
- ✅ **Backward Compatible:** Existing refunds with `order_id` are unaffected
- ✅ **Required:** Prevents constraint violations when refunding escrow payments
- ℹ️ **Application Code:** Already handles nullable `order_id` correctly

## Related Changes

- Prisma Schema: `packages/database/prisma/schema.prisma:557`
- Types: `services/payment-service/src/types/index.ts:38`
- Service: `services/payment-service/src/services/refund.service.ts:263-265`
- Documentation: `docs/PAYMENT_SERVICE_LAYER_CONSISTENCY.md`

## Testing After Migration

Run the refund tests from the test plan:

```bash
# Test creating escrow refund without order
curl -X POST http://localhost:3006/api/admin/refunds/manual \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "escrow-payment-uuid",
    "reason": "group_failed_moq",
    "description": "Session failed to reach MOQ"
  }'
```

Should succeed without "order_id violates not-null constraint" error.
