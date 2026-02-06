-- Fix meeting_notes RLS policies to support standalone notes with user_id

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view notes for their own meetings" ON meeting_notes;
DROP POLICY IF EXISTS "Users can create notes for their own meetings" ON meeting_notes;
DROP POLICY IF EXISTS "Users can update notes for their meetings" ON meeting_notes;
DROP POLICY IF EXISTS "Users can delete notes for their meetings" ON meeting_notes;

-- Create new SELECT policy that supports both meeting-linked and standalone notes
CREATE POLICY "Users can view their meeting and standalone notes"
ON meeting_notes FOR SELECT
USING (
  -- Meeting-linked notes: check meeting ownership
  (meeting_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM meetings
    WHERE meetings.id = meeting_notes.meeting_id
    AND meetings.user_id = auth.uid()
  ))
  OR
  -- Standalone notes: check user_id ownership
  (is_standalone = true AND user_id = auth.uid())
);

-- Create new INSERT policy
CREATE POLICY "Users can create their meeting and standalone notes"
ON meeting_notes FOR INSERT
WITH CHECK (
  -- Meeting-linked notes: check meeting ownership
  (meeting_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM meetings
    WHERE meetings.id = meeting_notes.meeting_id
    AND meetings.user_id = auth.uid()
  ))
  OR
  -- Standalone notes: must set user_id to own ID
  (is_standalone = true AND user_id = auth.uid())
);

-- Create new UPDATE policy
CREATE POLICY "Users can update their meeting and standalone notes"
ON meeting_notes FOR UPDATE
USING (
  (meeting_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM meetings
    WHERE meetings.id = meeting_notes.meeting_id
    AND meetings.user_id = auth.uid()
  ))
  OR
  (is_standalone = true AND user_id = auth.uid())
);

-- Create new DELETE policy
CREATE POLICY "Users can delete their meeting and standalone notes"
ON meeting_notes FOR DELETE
USING (
  (meeting_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM meetings
    WHERE meetings.id = meeting_notes.meeting_id
    AND meetings.user_id = auth.uid()
  ))
  OR
  (is_standalone = true AND user_id = auth.uid())
);

-- Add constraint to ensure user_id is set for standalone notes
-- First check if constraint exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_standalone_has_user_id'
  ) THEN
    ALTER TABLE meeting_notes
    ADD CONSTRAINT check_standalone_has_user_id
    CHECK (
      (is_standalone = false OR is_standalone IS NULL) OR
      (is_standalone = true AND user_id IS NOT NULL)
    );
  END IF;
END $$;