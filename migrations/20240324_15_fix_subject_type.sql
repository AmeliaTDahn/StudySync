-- Begin transaction
BEGIN;

-- Drop policies that reference the subject column
DROP POLICY IF EXISTS "responses_select_policy" ON responses;
DROP POLICY IF EXISTS "responses_insert_policy" ON responses;
DROP POLICY IF EXISTS "ticket_visibility" ON tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON tickets;
DROP POLICY IF EXISTS "Students can view their own tickets" ON tickets;

-- Drop the type if it exists
DROP TYPE IF EXISTS subject;

-- Create the subject type
CREATE TYPE subject AS ENUM ('math', 'science', 'english', 'history', 'other');

-- First modify tutor_subjects table
ALTER TABLE tutor_subjects 
ALTER COLUMN subject TYPE text; -- First convert to text to avoid casting issues

ALTER TABLE tutor_subjects 
ALTER COLUMN subject TYPE subject 
USING CASE subject
    WHEN 'math' THEN 'math'::subject
    WHEN 'science' THEN 'science'::subject
    WHEN 'english' THEN 'english'::subject
    WHEN 'history' THEN 'history'::subject
    WHEN 'other' THEN 'other'::subject
END;

-- Then modify tickets table
ALTER TABLE tickets 
ALTER COLUMN subject TYPE text; -- First convert to text to avoid casting issues

ALTER TABLE tickets 
ALTER COLUMN subject TYPE subject 
USING CASE subject
    WHEN 'math' THEN 'math'::subject
    WHEN 'science' THEN 'science'::subject
    WHEN 'english' THEN 'english'::subject
    WHEN 'history' THEN 'history'::subject
    WHEN 'other' THEN 'other'::subject
END;

-- Recreate the policies
CREATE POLICY "ticket_visibility"
ON tickets FOR SELECT
USING (
    student_id = auth.uid() OR  -- Students can see their own tickets
    EXISTS (  -- Tutors can see tickets in their subjects
        SELECT 1 FROM tutor_subjects ts
        WHERE ts.tutor_id = auth.uid()
        AND ts.subject = tickets.subject
    )
);

CREATE POLICY "responses_select_policy"
ON responses FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM tickets 
        WHERE tickets.id = ticket_id 
        AND (
            tickets.student_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM tutor_subjects ts
                WHERE ts.tutor_id = auth.uid() 
                AND ts.subject = tickets.subject
            )
        )
    )
);

CREATE POLICY "responses_insert_policy"
ON responses FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tickets t
        JOIN profiles p ON p.user_id = auth.uid()
        WHERE t.id = ticket_id 
        AND NOT t.closed
        AND (
            (p.role = 'student' AND t.student_id = auth.uid()) OR
            (p.role = 'tutor' AND EXISTS (
                SELECT 1 FROM tutor_subjects ts
                WHERE ts.tutor_id = auth.uid() 
                AND ts.subject = t.subject
            ))
        )
    )
);

-- End transaction
COMMIT; 