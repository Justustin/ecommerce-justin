# Database Migration Guide

## Current Migration: Make `refunds.order_id` Nullable

**Migration ID:** `20251110_make_refunds_order_id_nullable`
**Status:** ✅ Ready to apply
**Risk Level:** 🟢 Low (backward compatible, no data loss)

---

## Quick Start

### Option 1: Direct SQL Execution (Fastest)

```bash
# Connect to your database and run:
psql -h localhost -U your_user -d your_database -f packages/database/apply_refunds_migration.sql
```

This will:
- Show current schema
- Apply the migration
- Verify the change
- Display confirmation

### Option 2: Using Prisma Migrate

```bash
cd packages/database
npx prisma migrate deploy
```

### Option 3: Manual Execution

```sql
-- Just run this single SQL command:
ALTER TABLE "refunds" ALTER COLUMN "order_id" DROP NOT NULL;
```

---

## Detailed Instructions

### Step 1: Verify Current State

Check if migration is needed:

```sql
SELECT
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'refunds'
  AND column_name = 'order_id';
```

**Expected current state:**
- `is_nullable` = `NO` (needs migration)

**Already migrated:**
- `is_nullable` = `YES` (skip migration)

### Step 2: Backup Database (Production Only)

**For Development/Staging:** Skip this step

**For Production:** Always backup first!

```bash
# PostgreSQL backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup_refunds_$(date +%Y%m%d_%H%M%S).sql

# Or backup just the refunds table
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME -t refunds > backup_refunds_table.sql
```

### Step 3: Apply Migration

Choose one method:

#### Method A: Direct SQL (Recommended for Production)

```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "ALTER TABLE refunds ALTER COLUMN order_id DROP NOT NULL;"
```

#### Method B: Using migration script

```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f packages/database/apply_refunds_migration.sql
```

#### Method C: Prisma Migrate

```bash
cd packages/database
npx prisma migrate deploy
```

### Step 4: Verify Migration

```sql
-- Check column is now nullable
SELECT
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'refunds'
  AND column_name = 'order_id';
```

**Expected result after migration:**
```
 column_name | is_nullable | data_type
-------------+-------------+-----------
 order_id    | YES         | uuid
```

✅ If `is_nullable` = `YES`, migration successful!

### Step 5: Regenerate Prisma Client

After applying the migration, regenerate the Prisma Client:

```bash
cd packages/database
npx prisma generate
```

This ensures TypeScript types match the new schema.

### Step 6: Test Application

Test escrow refund flow:

```bash
# Test creating a refund without order_id
curl -X POST http://localhost:3006/api/admin/refunds/manual \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "<escrow-payment-uuid>",
    "reason": "group_failed_moq",
    "description": "Group session failed to reach MOQ"
  }'
```

**Expected:** Refund created successfully (no constraint violation error)

---

## Migration Environments

### Local Development

```bash
# 1. Apply migration
psql -h localhost -U postgres -d ecommerce_dev -c "ALTER TABLE refunds ALTER COLUMN order_id DROP NOT NULL;"

# 2. Regenerate Prisma Client
cd packages/database && npx prisma generate

# 3. Restart payment service
cd services/payment-service && npm run dev
```

### Docker Development

```bash
# 1. Enter database container
docker exec -it ecommerce-db psql -U postgres -d ecommerce

# 2. Run migration
ALTER TABLE refunds ALTER COLUMN order_id DROP NOT NULL;
\q

# 3. Restart services
docker-compose restart payment-service
```

### Staging

```bash
# 1. Connect to staging database
psql -h staging-db.example.com -U staging_user -d ecommerce_staging

# 2. Verify current state
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'refunds' AND column_name = 'order_id';

# 3. Apply migration
ALTER TABLE refunds ALTER COLUMN order_id DROP NOT NULL;

# 4. Verify success
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'refunds' AND column_name = 'order_id';
\q

# 5. Redeploy payment service
# (Follow your deployment process)
```

### Production

**⚠️ CRITICAL: Follow this checklist exactly**

- [ ] Migration tested in local environment
- [ ] Migration tested in staging environment
- [ ] Application tested with new schema in staging
- [ ] Database backup created
- [ ] Maintenance window scheduled (optional - migration is instant)
- [ ] Team notified

```bash
# 1. Backup database
pg_dump -h $PROD_DB_HOST -U $PROD_DB_USER $PROD_DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Connect to production database
psql -h $PROD_DB_HOST -U $PROD_DB_USER -d $PROD_DB_NAME

# 3. Verify current state
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'refunds' AND column_name = 'order_id';

# 4. Apply migration (executes in ~10ms)
ALTER TABLE refunds ALTER COLUMN order_id DROP NOT NULL;

# 5. Verify success
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'refunds' AND column_name = 'order_id';
\q

# 6. Monitor application logs
tail -f /var/log/payment-service/app.log

# 7. Test critical path
# - Create escrow payment
# - Fail group session
# - Verify refund processes without error
```

---

## Rollback Instructions

**⚠️ WARNING:** Only rollback if migration was applied incorrectly.

### When Rollback is Safe

✅ Immediately after migration (no escrow refunds created yet)

### When Rollback is UNSAFE

❌ If any refunds exist with `NULL order_id`

### Check Before Rollback

```sql
-- Count refunds without order_id
SELECT COUNT(*) as null_order_id_count
FROM refunds
WHERE order_id IS NULL;
```

**If count > 0:** DO NOT ROLLBACK (will fail with constraint violation)
**If count = 0:** Rollback is safe

### Rollback Command

```sql
ALTER TABLE refunds ALTER COLUMN order_id SET NOT NULL;
```

Or use the rollback script:

```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f packages/database/prisma/migrations/20251110_make_refunds_order_id_nullable/rollback.sql
```

---

## Troubleshooting

### Error: "column order_id of relation refunds does not exist"

**Solution:** You're on a fresh database with no `refunds` table. Run full schema setup first:

```bash
cd packages/database
npx prisma db push
```

### Error: "column order_id cannot be cast automatically"

**Solution:** Wrong data type. This shouldn't happen, but if it does:

```sql
-- Check current type
SELECT data_type FROM information_schema.columns
WHERE table_name = 'refunds' AND column_name = 'order_id';

-- Should be 'uuid'
```

### Error: "constraint violation" after migration

**Check:** Did you restart the application after regenerating Prisma Client?

```bash
cd packages/database && npx prisma generate
cd services/payment-service && npm restart
```

### Migration appears to succeed but application still fails

**Cause:** Prisma Client cache

**Solution:**

```bash
# 1. Clear node_modules
rm -rf services/payment-service/node_modules
rm -rf packages/database/node_modules

# 2. Reinstall dependencies
npm install

# 3. Regenerate Prisma Client
cd packages/database && npx prisma generate

# 4. Restart application
cd services/payment-service && npm run dev
```

---

## Verification Checklist

After migration, verify:

- [ ] Database column is nullable: `is_nullable = YES`
- [ ] Prisma Client regenerated
- [ ] Application restarted
- [ ] No errors in application logs
- [ ] Can create refund without order_id
- [ ] Existing refunds with order_id still work
- [ ] Test plan passes (see `docs/PAYMENT_SERVICE_TEST_PLAN.md`)

---

## Support

For issues or questions:

1. Check migration-specific README: `prisma/migrations/20251110_make_refunds_order_id_nullable/README.md`
2. Check layer consistency doc: `docs/PAYMENT_SERVICE_LAYER_CONSISTENCY.md`
3. Review Prisma logs: `npx prisma migrate status`
4. Check application logs: `services/payment-service/logs/`

## Summary

**What:** Make `refunds.order_id` nullable
**Why:** Support escrow refunds without orders
**How:** `ALTER TABLE refunds ALTER COLUMN order_id DROP NOT NULL;`
**Impact:** Low risk, backward compatible, no downtime
**Rollback:** Safe only if no NULL values exist
