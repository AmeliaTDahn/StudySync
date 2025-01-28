
-- Begin transaction
BEGIN;

-- Drop existing conversation policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;

-- Recreate conversation policies with correct permissions
CREATE POLICY "Users can view their conversations"
    ON conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations"
    ON conversations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Fix conversation participants policies
CREATE POLICY "Users can view conversation participants"
    ON conversation_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = conversation_participants.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add participants"
    ON conversation_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_id
        )
    );

COMMIT;
