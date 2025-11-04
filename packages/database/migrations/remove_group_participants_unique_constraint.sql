-- ========================================
-- REMOVE UNIQUE CONSTRAINT ON GROUP PARTICIPANTS
-- ========================================
-- This allows users to join the same session multiple times
-- with different variants (e.g., buy 3S, then later buy 2M)
-- ========================================

ALTER TABLE group_participants
DROP CONSTRAINT IF EXISTS group_participants_group_session_id_user_id_key;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Users can now join sessions multiple times
-- Each join creates a separate participant record
-- ========================================
