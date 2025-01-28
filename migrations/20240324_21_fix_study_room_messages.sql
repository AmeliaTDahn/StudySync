
-- Begin transaction
BEGIN;

-- Drop all existing policies to ensure clean slate
DROP POLICY IF EXISTS "Study room messages are visible to all authenticated users" ON study_room_messages;
DROP POLICY IF EXISTS "Users can send messages to study rooms" ON study_room_messages;
DROP POLICY IF EXISTS "Room participants can view messages" ON study_room_messages;
DROP POLICY IF EXISTS "Room participants can send messages" ON study_room_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON study_room_messages;
DROP POLICY IF EXISTS "Creators can delete messages" ON study_room_messages;

-- Ensure RLS is enabled
ALTER TABLE study_room_messages ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Room participants can view messages"
    ON study_room_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM study_room_participants
            WHERE room_id = study_room_messages.room_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Room participants can send messages"
    ON study_room_messages FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM study_room_participants
            WHERE room_id = study_room_messages.room_id
            AND user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON study_room_messages TO postgres;
GRANT ALL ON study_room_messages TO service_role;
GRANT SELECT, INSERT ON study_room_messages TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE study_room_messages_id_seq TO authenticated;

COMMIT;
