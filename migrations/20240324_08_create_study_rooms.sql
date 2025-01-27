-- Begin transaction
BEGIN;

-- Create study rooms table
CREATE TABLE IF NOT EXISTS study_rooms (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create study room participants table
CREATE TABLE IF NOT EXISTS study_room_participants (
    room_id BIGINT REFERENCES study_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- Create study room messages table
CREATE TABLE IF NOT EXISTS study_room_messages (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT REFERENCES study_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trigger to update updated_at on study rooms
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON study_rooms
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS
ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Study rooms are visible to all authenticated users
CREATE POLICY "Study rooms are visible to all authenticated users"
    ON study_rooms FOR SELECT
    TO authenticated
    USING (true);

-- Anyone can create a study room
CREATE POLICY "Anyone can create a study room"
    ON study_rooms FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Study room participants are visible to all authenticated users
CREATE POLICY "Study room participants are visible to all authenticated users"
    ON study_room_participants FOR SELECT
    TO authenticated
    USING (true);

-- Users can join study rooms
CREATE POLICY "Users can join study rooms"
    ON study_room_participants FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can leave study rooms
CREATE POLICY "Users can leave study rooms"
    ON study_room_participants FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Study room messages are visible to all authenticated users
CREATE POLICY "Study room messages are visible to all authenticated users"
    ON study_room_messages FOR SELECT
    TO authenticated
    USING (true);

-- Users can send messages to study rooms
CREATE POLICY "Users can send messages to study rooms"
    ON study_room_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM study_room_participants
            WHERE room_id = study_room_messages.room_id
            AND user_id = auth.uid()
        )
    );

COMMIT; 