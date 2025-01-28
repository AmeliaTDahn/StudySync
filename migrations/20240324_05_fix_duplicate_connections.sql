-- Begin transaction
BEGIN;

-- Update the trigger function to handle existing connections
CREATE OR REPLACE FUNCTION handle_connection_invitation_acceptance()
RETURNS TRIGGER AS $$
DECLARE
    new_conversation_id BIGINT;
    v_student_id UUID;
    v_tutor_id UUID;
    v_student_username TEXT;
    v_tutor_username TEXT;
BEGIN
    -- Only proceed if the invitation status is being changed to 'accepted'
    IF (TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status != 'accepted') THEN
        -- Get the student and tutor info based on their roles
        SELECT 
            p.user_id,
            p.username
        INTO v_student_id, v_student_username
        FROM profiles p
        WHERE p.user_id IN (NEW.from_user_id, NEW.to_user_id)
        AND p.role = 'student';

        SELECT 
            p.user_id,
            p.username
        INTO v_tutor_id, v_tutor_username
        FROM profiles p
        WHERE p.user_id IN (NEW.from_user_id, NEW.to_user_id)
        AND p.role = 'tutor';

        -- Insert the connection if it doesn't exist
        INSERT INTO student_tutor_connections (
            student_id,
            tutor_id,
            student_username,
            tutor_username
        ) VALUES (
            v_student_id,
            v_tutor_id,
            v_student_username,
            v_tutor_username
        )
        ON CONFLICT (student_id, tutor_id) DO NOTHING;

        -- Create conversation if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM conversation_participants cp1
            JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
            WHERE cp1.user_id = NEW.from_user_id
            AND cp2.user_id = NEW.to_user_id
        ) THEN
            -- Create a new conversation
            INSERT INTO conversations DEFAULT VALUES
            RETURNING id INTO new_conversation_id;

            -- Add both users as participants
            INSERT INTO conversation_participants (conversation_id, user_id, username)
            VALUES
                (new_conversation_id, NEW.from_user_id, NEW.from_username),
                (new_conversation_id, NEW.to_user_id, NEW.to_username);

            -- Add a welcome message
            INSERT INTO messages (conversation_id, sender_id, sender_username, content)
            VALUES (
                new_conversation_id,
                NEW.from_user_id,
                NEW.from_username,
                'Connection established! You can now start chatting.'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS on_connection_invitation_update ON connection_invitations;
CREATE TRIGGER on_connection_invitation_update
    AFTER UPDATE ON connection_invitations
    FOR EACH ROW
    EXECUTE FUNCTION handle_connection_invitation_acceptance();

-- Commit transaction
COMMIT;