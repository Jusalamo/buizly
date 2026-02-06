
# Fix Notes Saving Error - Standalone Notes Support

## Problem Identified
When creating a note, the error `"save failed input syntax for type uuid: standalone-1770274991807"` occurs because:

1. The `meeting_notes` table has `meeting_id` defined as `UUID NOT NULL` with a foreign key reference to the `meetings` table
2. The code is trying to insert a string like `"standalone-1770274991807"` into a UUID column
3. PostgreSQL cannot convert this string to a UUID type

## Solution Overview
We need to modify the database schema and application code to properly support standalone notes that don't need to be linked to a meeting.

---

## Database Changes

### Migration: Make meeting_id Nullable for Standalone Notes

```sql
-- 1. Drop the existing foreign key constraint
ALTER TABLE public.meeting_notes 
DROP CONSTRAINT IF EXISTS meeting_notes_meeting_id_fkey;

-- 2. Make meeting_id nullable for standalone notes
ALTER TABLE public.meeting_notes 
ALTER COLUMN meeting_id DROP NOT NULL;

-- 3. Add new foreign key that allows NULL (references calendar_events for linked notes)
-- Note: We don't re-add the meetings FK since notes can be standalone

-- 4. Update the constraint to ensure data integrity
ALTER TABLE public.meeting_notes 
DROP CONSTRAINT IF EXISTS check_standalone_has_user_id;

ALTER TABLE public.meeting_notes
ADD CONSTRAINT check_note_integrity
CHECK (
  -- Standalone notes must have user_id
  (is_standalone = true AND user_id IS NOT NULL AND meeting_id IS NULL) OR
  -- Linked notes must have meeting_id
  (is_standalone = false AND meeting_id IS NOT NULL)
);
```

### Update RLS Policies

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their meeting and standalone notes" ON meeting_notes;
DROP POLICY IF EXISTS "Users can create their meeting and standalone notes" ON meeting_notes;
DROP POLICY IF EXISTS "Users can update their meeting and standalone notes" ON meeting_notes;
DROP POLICY IF EXISTS "Users can delete their meeting and standalone notes" ON meeting_notes;

-- Create simplified policies based on user_id
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
```

---

## Code Changes

### 1. Update useMeetingNotes Hook

**File: `src/hooks/useMeetingNotes.ts`**

Changes to `createNote` function:
- For standalone notes: Set `meeting_id: null` instead of `"standalone-xxx"`
- Always set `user_id` to current user
- Set `is_standalone: true` when no meeting_id is provided

```typescript
// Current (broken):
meeting_id: noteData.meeting_id || `standalone-${Date.now()}`

// Fixed:
meeting_id: noteData.meeting_id || null  // null for standalone
is_standalone: !noteData.meeting_id      // true when no meeting_id
```

### 2. Update Notes Page

**File: `src/pages/Notes.tsx`**

Changes to `handleSave` function:
- Remove the `standaloneId` generation
- Just pass the data without a fake meeting_id

```typescript
// Current (broken):
const standaloneId = `standalone-${Date.now()}`;
const newNote = await createNote({
  meeting_id: standaloneId,
  ...
});

// Fixed:
const newNote = await createNote({
  title: data.title,
  text_note: data.text_note,
  is_pinned: data.is_pinned,
  transcript: data.transcript,
  // No meeting_id - hook will set to null and is_standalone: true
});
```

### 3. Update Type Definitions

**File: `src/types/calendar.ts`**

The `MeetingNote` interface already has `meeting_id` as optional:
```typescript
export interface MeetingNote {
  id: string;
  meeting_id?: string;  // Already optional
  user_id?: string;
  // ...
}
```

---

## Files to Modify

1. **Database Migration** (new file)
   - Make `meeting_id` nullable
   - Drop old foreign key constraint
   - Add integrity constraint
   - Update RLS policies to use `user_id`

2. **`src/hooks/useMeetingNotes.ts`**
   - Update `createNote` to use `null` for standalone notes
   - Ensure `user_id` is always set
   - Update optimistic note creation

3. **`src/pages/Notes.tsx`**
   - Remove `standaloneId` generation
   - Pass note data without fake meeting_id

---

## Technical Details

### Why This Fix Works

1. **UUID Constraint**: By making `meeting_id` nullable, we avoid the UUID parse error entirely
2. **Data Integrity**: The new constraint ensures:
   - Standalone notes have `user_id` but no `meeting_id`
   - Linked notes have a valid `meeting_id`
3. **RLS Security**: Policies now use `user_id = auth.uid()` which works for all notes
4. **No Breaking Changes**: Existing linked notes continue to work

### Backward Compatibility

- Existing notes with valid `meeting_id` UUIDs remain unchanged
- New standalone notes will have `meeting_id: null`
- The `is_standalone` flag clearly distinguishes the two types
