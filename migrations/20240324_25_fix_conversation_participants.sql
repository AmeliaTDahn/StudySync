
-- Begin transaction
BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;

-- Create fixed policies
CREATE POLICY "Users can view conversation participants" 
    ON conversation_participants FOR SELECT
    USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_participants.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add participants"
    ON conversation_participants FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_id
            AND EXISTS (
                SELECT 1 FROM conversation_participants cp
                WHERE cp.conversation_id = conversation_id
                AND cp.user_id = auth.uid()
            )
        )
    );

COMMIT;
