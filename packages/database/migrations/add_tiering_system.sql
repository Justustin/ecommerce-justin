-- ========================================
-- TIERING SYSTEM MIGRATION
-- ========================================
-- This migration adds dynamic pricing tiers and bot participant support
-- to the group buying system.
--
-- Features:
-- - Price tiers at 25%, 50%, 75%, 100% MOQ fill
-- - Bot auto-join to ensure minimum 25% MOQ
-- - Current tier tracking
-- ========================================

-- Add price tier columns to group_buying_sessions
ALTER TABLE group_buying_sessions
  ADD COLUMN IF NOT EXISTS price_tier_25 DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS price_tier_50 DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS price_tier_75 DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS price_tier_100 DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS current_tier INTEGER DEFAULT 25,
  ADD COLUMN IF NOT EXISTS bot_participant_id UUID;

-- Add bot participant flag to group_participants
ALTER TABLE group_participants
  ADD COLUMN IF NOT EXISTS is_bot_participant BOOLEAN DEFAULT false;

-- Create index for bot participants (for quick filtering)
CREATE INDEX IF NOT EXISTS idx_group_participants_bot
  ON group_participants(is_bot_participant)
  WHERE is_bot_participant = true;

-- Add comment to explain tiering system
COMMENT ON COLUMN group_buying_sessions.price_tier_25 IS 'Price when 25% MOQ is filled (highest price)';
COMMENT ON COLUMN group_buying_sessions.price_tier_50 IS 'Price when 50% MOQ is filled';
COMMENT ON COLUMN group_buying_sessions.price_tier_75 IS 'Price when 75% MOQ is filled';
COMMENT ON COLUMN group_buying_sessions.price_tier_100 IS 'Price when 100% MOQ is filled (lowest price)';
COMMENT ON COLUMN group_buying_sessions.current_tier IS 'Current active tier: 25, 50, 75, or 100';
COMMENT ON COLUMN group_buying_sessions.bot_participant_id IS 'ID of bot participant (if created) to ensure 25% minimum';
COMMENT ON COLUMN group_participants.is_bot_participant IS 'True if this is a bot participant (not a real user)';

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Next steps:
-- 1. Create BOT_USER_ID in environment variables
-- 2. Update GroupBuyingService to create bot participants
-- 3. Implement tier calculation logic
-- ========================================
