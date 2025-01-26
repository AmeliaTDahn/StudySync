-- Drop existing study rooms policies
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON study_rooms;
DROP POLICY IF EXISTS "Users can create study rooms" ON study_rooms;
DROP POLICY IF EXISTS "Room creators can update their rooms" ON study_rooms;

-- Create simplified study rooms policies
CREATE POLICY "Public rooms are viewable by everyone"
  ON study_rooms FOR SELECT
  USING (
    NOT is_private OR
    created_by = auth.uid()
  );

CREATE POLICY "Participants can view their rooms"
  ON study_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_room_participants
      WHERE room_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Invitees can view rooms"
  ON study_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_room_invitations
      WHERE room_id = id AND invitee_id = auth.uid()
    )
  );

CREATE POLICY "Users can create study rooms"
  ON study_rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update their rooms"
  ON study_rooms FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by); 