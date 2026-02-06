-- 1. Drop the existing foreign key constraint
ALTER TABLE public.meeting_notes 
DROP CONSTRAINT IF EXISTS meeting_notes_meeting_id_fkey;

-- 2. Make meeting_id nullable for standalone notes
ALTER TABLE public.meeting_notes 
ALTER COLUMN meeting_id DROP NOT NULL;

-- 3. Drop old constraints if they exist
ALTER TABLE public.meeting_notes 
DROP CONSTRAINT IF EXISTS check_standalone_has_user_id;

ALTER TABLE public.meeting_notes 
DROP CONSTRAINT IF EXISTS check_note_integrity;

-- 4. Add new constraint to ensure data integrity
ALTER TABLE public.meeting_notes
ADD CONSTRAINT check_note_integrity
CHECK (
  -- Standalone notes must have user_id and no meeting_id
  (is_standalone = true AND user_id IS NOT NULL AND meeting_id IS NULL) OR
  -- Linked notes must have meeting_id
  (is_standalone = false AND meeting_id IS NOT NULL) OR
  -- Allow existing notes that might have both or neither (backward compatibility)
  (user_id IS NOT NULL)
);

-- 5. Drop existing policies
DROP POLICY IF EXISTS "Users can view their meeting and standalone notes" ON meeting_notes;
DROP POLICY IF EXISTS "Users can create their meeting and standalone notes" ON meeting_notes;
DROP POLICY IF EXISTS "Users can update their meeting and standalone notes" ON meeting_notes;
DROP POLICY IF EXISTS "Users can delete their meeting and standalone notes" ON meeting_notes;
DROP POLICY IF EXISTS "Users can view their notes" ON meeting_notes;
DROP POLICY IF EXISTS "Users can create notes" ON meeting_notes;
DROP POLICY IF EXISTS "Users can update their notes" ON meeting_notes;
DROP POLICY IF EXISTS "Users can delete their notes" ON meeting_notes;

-- 6. Create simplified policies based on user_id
CREATE POLICY "Users can view their notes"
ON meeting_notes FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create notes"
ON meeting_notes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their notes"
ON meeting_notes FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their notes"
ON meeting_notes FOR DELETE
USING (user_id = auth.uid());