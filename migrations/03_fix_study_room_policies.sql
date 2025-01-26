-- Drop existing policies for study_room_participants
DROP POLICY IF EXISTS "Users can view room participants" ON study_room_participants;
DROP POLICY IF EXISTS "Users can join public rooms or accept invitations" ON study_room_participants;
DROP POLICY IF EXISTS "Room creators can add participants" ON study_room_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON study_room_participants;

-- Create simplified policies for study_room_participants
CREATE POLICY "Anyone can view participants of public rooms"
  ON study_room_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE id = room_id AND NOT is_private
    )
  );

CREATE POLICY "Participants can view their rooms"
  ON study_room_participants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Room creators can view their room participants"
  ON study_room_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE id = room_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Room creators can join their rooms"
  ON study_room_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE id = room_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can join public rooms"
  ON study_room_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE id = room_id AND NOT is_private
    )
  );

CREATE POLICY "Users can join via invitation"
  ON study_room_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM study_room_invitations
      WHERE room_id = study_room_participants.room_id
      AND invitee_id = auth.uid()
      AND status = 'accepted'
    )
  );

CREATE POLICY "Users can leave rooms"
  ON study_room_participants FOR DELETE
  USING (auth.uid() = user_id); 