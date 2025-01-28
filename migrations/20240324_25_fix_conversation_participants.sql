
-- Begin transaction
BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;

-- Create fixed policies
CREATE POLICY "Users can view conversation participants" 
    ON conversation_participants FOR SELECT
    USING (true);

CREATE POLICY "Users can add participants"
    ON conversation_participants FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        (auth.uid() = user_id OR EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_id
        ))
    );

COMMIT;
