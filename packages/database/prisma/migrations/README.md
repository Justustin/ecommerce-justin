# Database Migrations

This directory contains all database schema migrations for the e-commerce platform.

## Migration Structure

Each migration is in its own directory with the format: `YYYYMMDD_description/`

```
migrations/
├── 20251110_make_refunds_order_id_nullable/
│   ├── migration.sql      # The actual SQL migration
│   ├── rollback.sql       # SQL to undo the migration (if safe)
│   └── README.md          # Documentation for the migration
└── README.md              # This file
```

## Running Migrations

### Development & Staging

Using Prisma Migrate (recommended):

```bash
cd packages/database

# Apply all pending migrations
npx prisma migrate deploy

# Generate Prisma Client after migrations
npx prisma generate
```

### Production

**Always test migrations in staging first!**

```bash
# 1. Backup the database
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migration
cd packages/database
npx prisma migrate deploy

# 3. Verify migration
psql -h $DB_HOST -U $DB_USER $DB_NAME -c "\d refunds"

# 4. Generate Prisma Client
npx prisma generate
```

### Manual SQL Execution

If Prisma Migrate is unavailable:

```bash
# Run a specific migration
psql -h $DB_HOST -U $DB_USER $DB_NAME -f migrations/YYYYMMDD_description/migration.sql

# Rollback (if safe - check migration README)
psql -h $DB_HOST -U $DB_USER $DB_NAME -f migrations/YYYYMMDD_description/rollback.sql
```

## Migration Checklist

Before creating a new migration:

- [ ] Update Prisma schema (`schema.prisma`)
- [ ] Create migration directory: `migrations/YYYYMMDD_description/`
- [ ] Write `migration.sql` with the schema change
- [ ] Write `rollback.sql` (if rollback is safe)
- [ ] Document in migration's `README.md`:
  - Purpose of migration
  - Business context
  - How to run
  - How to verify
  - Rollback instructions (if applicable)
  - Impact assessment
- [ ] Test migration in local environment
- [ ] Test rollback (if applicable)
- [ ] Update layer consistency documentation
- [ ] Test application with new schema

## Existing Migrations

### 20251110_make_refunds_order_id_nullable

**Purpose:** Makes `refunds.order_id` nullable to support escrow refunds without orders.

**Why:** Group buying sessions may fail before orders are created, requiring refunds of escrow payments.

**Status:** ✅ Ready for deployment

**Documentation:** `20251110_make_refunds_order_id_nullable/README.md`

## Troubleshooting

### Migration Fails

```bash
# Check migration status
npx prisma migrate status

# View detailed error
npx prisma migrate deploy --help
```

### Rollback a Migration

**⚠️ WARNING:** Always check if rollback is safe first!

1. Read the migration's `README.md` for rollback instructions
2. Check if rollback will cause data loss
3. Backup database before rollback
4. Execute `rollback.sql`

### Prisma Client Out of Sync

If you see "Type 'X' is not assignable" errors:

```bash
cd packages/database
npx prisma generate
```

This regenerates the Prisma Client to match the current schema.

## Best Practices

1. **Never modify existing migrations** - Create new ones instead
2. **Always test in development first**
3. **Backup production before migrating**
4. **Document business context** in migration READMEs
5. **Test rollbacks** (when safe) before deploying
6. **Coordinate with team** before running migrations
7. **Monitor application** after migration deployment

## Schema Verification

After running migrations, verify the schema matches Prisma:

```bash
# Check schema sync
npx prisma migrate status

# View current database schema
npx prisma db pull

# This should match your schema.prisma
```

## Support

For migration issues, check:
- Migration's individual README.md
- Prisma Migrate docs: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Application logs in services using the database
