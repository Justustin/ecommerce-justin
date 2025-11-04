-- Quick check and fix for unique constraint
-- Run this to drop the constraint if it exists

DO $$
BEGIN
    -- Check if constraint exists
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'group_participants_group_session_id_user_id_key'
    ) THEN
        -- Drop the constraint
        ALTER TABLE group_participants
        DROP CONSTRAINT group_participants_group_session_id_user_id_key;

        RAISE NOTICE 'Unique constraint dropped successfully';
    ELSE
        RAISE NOTICE 'Constraint does not exist (already dropped or never existed)';
    END IF;
END $$;

-- Verify constraint is gone
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'group_participants'::regclass;
