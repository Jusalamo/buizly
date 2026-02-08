

# Fix Notes Disappearing on Click & Add "Create Event" to Calendar Link Modal

## Problems Identified

### Problem 1: Notes disappear when clicking to view them
When a user clicks on a note card and navigates to `/notes/:id`, the note editor opens blank because of a **timing/sync issue**:

1. In `Notes.tsx` (line 43-50), the `useEffect` calls `getNote(id)` which searches the `notes` array in memory
2. `getNote` depends on the `notes` state from `useMeetingNotes`, but when navigating to a new route, the component remounts and `notes` may still be loading from the database
3. Even if `getNote` eventually finds the note (after fetch completes), the `NoteEditor` only reads the `note` prop **once** via `useState` initial values (lines 54-56):
   ```typescript
   const [title, setTitle] = useState(note?.title || '');
   const [content, setContent] = useState(note?.text_note || '');
   ```
   So if the note is `null` initially and becomes available later, the editor still shows empty fields

**Root cause**: No synchronization between when `notes` data loads and when the editor initializes its state from the `note` prop.

### Problem 2: No option to create a calendar event from the link modal
When the `CalendarLinkModal` shows "No upcoming events found" (line 135-139), there is no button to create a new event. Users are stuck with no way to link their note to the calendar.

---

## Solution

### Fix 1: Sync note data into editor when it loads
  ensure to remove the magic note summary it is not currnently necessary 
**File: `src/pages/Notes.tsx`**

- Update the `useEffect` that loads the note to also react to changes in `notes` array (not just `id` and `getNote`)
- When `notes` finishes loading and the note is found, update `selectedNote` so the editor gets the data

**File: `src/components/notes/NoteEditor.tsx`**

- Add a `useEffect` that watches the `note` prop and syncs local state when it changes from `null` to a real note object
- This ensures that even if the note loads asynchronously, the editor updates its title/content fields

```typescript
// Sync state when note prop changes (e.g., after async load)
useEffect(() => {
  if (note) {
    setTitle(note.title || '');
    setContent(note.text_note || '');
    setIsPinned(note.is_pinned || false);
  }
}, [note?.id]); // Only re-sync when we get a different note
```

### Fix 2: Add "Create Event & Link" option to CalendarLinkModal

**File: `src/components/notes/CalendarLinkModal.tsx`**

- Add a "Create New Event" button that appears always (not just when empty)
- When clicked, navigate to the Calendar page or open a quick event creation form
- Pass a callback so the note gets linked after the event is created

**File: `src/pages/Notes.tsx`**

- Add a handler for creating a new event and linking it to the current note

---

## Technical Details

### NoteEditor.tsx Changes
Add a sync effect after the existing state declarations (around line 56):

```typescript
// Sync local state when note prop updates (handles async loading)
useEffect(() => {
  if (note) {
    setTitle(note.title || '');
    setContent(note.text_note || '');
    setIsPinned(note.is_pinned || false);
    setHasChanges(false);
  }
}, [note?.id]);
```

This effect:
- Only triggers when a **different** note loads (keyed on `note?.id`)
- Resets local state to match the loaded note
- Resets `hasChanges` to prevent auto-save from firing immediately

### Notes.tsx Changes
Update the `useEffect` that loads the selected note to properly handle the async nature:

```typescript
useEffect(() => {
  if (id && id !== 'new') {
    const note = getNote(id);
    if (note) {
      setSelectedNote(note);
    }
    // If note is null, don't clear selectedNote - it may still be loading
  } else if (isNew) {
    setSelectedNote(null);
  } else {
    setSelectedNote(null);
  }
}, [id, isNew, getNote, notes]); // Add notes dependency
```

Add `notes` to the dependency array so the effect re-runs when notes finish loading from the database.

### CalendarLinkModal.tsx Changes
Add a "Create New Event" button at the bottom of the modal:

```typescript
{/* Always show create event option */}
<div className="pt-2 border-t border-border">
  <Button
    variant="outline"
    className="w-full gap-2"
    onClick={handleCreateEvent}
  >
    <Plus className="h-4 w-4" />
    Create New Event & Link
  </Button>
</div>
```

Add a new prop `onCreateAndLink` to the modal interface, and a simple inline event creation form with:
- Event title (pre-filled with note title)
- Date and time picker
- A "Create & Link" button that creates the event via `useCalendar().createEvent()` and then calls `onLinkEvent` with the new event ID

---

## Files to Modify

1. **`src/components/notes/NoteEditor.tsx`** - Add `useEffect` to sync state when note prop changes
2. **`src/pages/Notes.tsx`** - Fix note loading dependency, add create-and-link handler
3. **`src/components/notes/CalendarLinkModal.tsx`** - Add inline event creation form with "Create New Event & Link" button

## Implementation Order

1. Fix `NoteEditor.tsx` state sync (resolves disappearing notes)
2. Fix `Notes.tsx` loading dependency (ensures note data is found after fetch)
3. Add create event form to `CalendarLinkModal.tsx` (enables linking even with no existing events)
