-- Add admin_note field to payments and refunds tables for admin overrides and notes

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS admin_note TEXT;

ALTER TABLE refunds
ADD COLUMN IF NOT EXISTS admin_note TEXT;
