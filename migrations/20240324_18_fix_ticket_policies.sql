-- Begin transaction
BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "students_create_tickets" ON tickets;
DROP POLICY IF EXISTS "ticket_visibility" ON tickets;
DROP POLICY IF EXISTS "students_update_tickets" ON tickets;

-- Create updated policies
CREATE POLICY "students_create_tickets"
ON tickets FOR INSERT
WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role = 'student'
    )
);

CREATE POLICY "ticket_visibility"
ON tickets FOR SELECT
USING (
    student_id = auth.uid() OR  -- Students can see their own tickets
    EXISTS (  -- Tutors can see tickets in their subjects
        SELECT 1 FROM tutor_subjects ts
        WHERE ts.tutor_id = auth.uid()
        AND ts.subject::text = tickets.subject::text
    )
);

CREATE POLICY "students_update_tickets"
ON tickets FOR UPDATE
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- End transaction
COMMIT; 