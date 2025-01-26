-- Drop existing participant policies
DROP POLICY IF EXISTS "Anyone can view participants of public rooms" ON study_room_participants;
DROP POLICY IF EXISTS "Participants can view their rooms" ON study_room_participants;
DROP POLICY IF EXISTS "Room creators can view their room participants" ON study_room_participants;
DROP POLICY IF EXISTS "Room creators can join their rooms" ON study_room_participants;
DROP POLICY IF EXISTS "Users can join public rooms" ON study_room_participants;
DROP POLICY IF EXISTS "Users can join via invitation" ON study_room_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON study_room_participants;

-- Create new simplified policies
CREATE POLICY "View participants"
  ON study_room_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE id = room_id
      AND (
        NOT is_private
        OR created_by = auth.uid()
      )
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Join room"
  ON study_room_participants FOR INSERT
  WITH CHECK (
    (
      -- Allow room creators to join their own rooms
      EXISTS (
        SELECT 1 FROM study_rooms
        WHERE id = room_id
        AND created_by = auth.uid()
      )
    ) OR (
      -- Allow users to join public rooms
      EXISTS (
        SELECT 1 FROM study_rooms
        WHERE id = room_id
        AND NOT is_private
      )
    ) OR (
      -- Allow users to join via invitation
      EXISTS (
        SELECT 1 FROM study_room_invitations
        WHERE room_id = study_room_participants.room_id
        AND invitee_id = auth.uid()
        AND status = 'accepted'
      )
    )
  );

CREATE POLICY "Leave room"
  ON study_room_participants FOR DELETE
  USING (user_id = auth.uid()); 