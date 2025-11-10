-- Make refunds.order_id nullable to support escrow refunds without orders
-- This aligns the database schema with the Prisma schema change

-- AlterTable
ALTER TABLE "refunds" ALTER COLUMN "order_id" DROP NOT NULL;
