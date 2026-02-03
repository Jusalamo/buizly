
# iOS-Inspired Notes App Rebuild

## Overview

The current Notes.tsx is 2000+ lines with complex nested UI, multiple dialogs, audio recording logic, templates, sections, and meeting-specific features. This makes it overwhelming and hard to navigate.

The iOS Notes app is elegant because of its simplicity:
- Clean list view with search at top
- Folders/categories in sidebar (on iPad) or as a back navigation (on iPhone)
- Tap a note to edit inline - no separate "view" vs "edit" mode
- Floating "new note" button
- Rich text editing that feels natural
- Swipe actions for delete/pin

---

## Design Principles (Inspired by iOS Notes)

1. **Simple two-level navigation**: Notes list → Note editor (no tabs, no complex filters)
2. **Folders instead of categories**: Sidebar on desktop, back-nav on mobile
3. **Inline editing**: No "save" button - auto-save everything
4. **Minimal chrome**: Title + content, everything else is secondary
5. **Swipe gestures**: Delete, pin, share
6. **Quick actions**: Long-press or swipe for AI features
7. **Search that works**: Full-text search across all notes

---

## New File Structure

```
src/
├── pages/
│   └── Notes.tsx              # ~300 lines (simplified)
│
├── components/
│   └── notes/
│       ├── NotesList.tsx      # Notes list with search + folders
│       ├── NoteEditor.tsx     # Simple rich-text note editing
│       ├── NotesFolder.tsx    # Folder/category component
│       ├── NoteCard.tsx       # Individual note preview card
│       └── NotesEmptyState.tsx # Empty state illustration
```

---

## Phase 1: Delete & Scaffold

### Actions
1. Delete the existing `src/pages/Notes.tsx` (2056 lines)
2. Create new simplified component structure
3. Keep the `useMeetingNotes` hook - it works fine

---

## Phase 2: Notes List View (NotesList.tsx)

### Design
```
+------------------------------------------+
|  < Folders     Notes           [+] [⋮]   |
+------------------------------------------+
|  🔍 Search notes...                      |
+------------------------------------------+
|  📌 PINNED                               |
|  +--------------------------------------+|
|  | Client Meeting - Acme Corp          ||
|  | Yesterday - Meeting notes from...    ||
|  +--------------------------------------+|
|  | Project Kickoff                      ||
|  | Jan 28 - Initial planning session... ||
|  +--------------------------------------+|
+------------------------------------------+
|  ALL NOTES                               |
|  +--------------------------------------+|
|  | Weekly Standup                       ||
|  | Today, 9:00 AM                       ||
|  +--------------------------------------+|
|  | ...more notes...                     ||
+------------------------------------------+
```

### Features
- Sticky search bar at top
- Pinned notes section (collapsible)
- All notes sorted by last modified
- Swipe left: Delete
- Swipe right: Pin/Unpin
- Tap: Open note editor
- Floating action button: New note

---

## Phase 3: Note Editor (NoteEditor.tsx)

### Design
```
+------------------------------------------+
|  < Notes                    [⋯] [Share]  |
+------------------------------------------+
|                                          |
|  Meeting Title                           |
|  ─────────────────────────────────────   |
|  Jan 28, 2025 · 45 min                   |
|                                          |
|  [Start writing your notes here...]     |
|                                          |
|                                          |
|                                          |
|                                          |
+------------------------------------------+
|  [🎤 Record] [✨ AI Summary] [📋 Tasks]  |
+------------------------------------------+
```

### Features
- Auto-save on blur/debounce (no save button)
- Title is just a large input at top
- Date shown as subtitle (non-editable)
- Clean textarea for content
- Bottom toolbar with:
  - Voice recording toggle
  - AI summary button
  - Action items extraction
  - Share/export menu
- Pull-down to show additional metadata (attendees, tags)

---

## Phase 4: Folders/Categories (NotesFolder.tsx)

### Mobile Navigation
- Back button shows "Folders" 
- Tapping goes to folder picker
- Folders: All Notes, Pinned, Client Meetings, Projects, etc.

### Desktop Sidebar
- Left sidebar shows folders
- Click to filter notes
- Drag notes to folders

---

## Phase 5: Note Card (NoteCard.tsx)

### Design
```
+------------------------------------------+
|  📌 Client Meeting - Acme Corp           |
|  Yesterday · 2 action items              |
|  Initial discussion about quarterly...   |
+------------------------------------------+
```

### Features
- Title (with pin icon if pinned)
- Relative date + metadata badges
- Two-line preview of content
- Swipeable wrapper for actions

---

## Phase 6: AI Features (Streamlined)

### Simplified AI Access
Instead of multiple buttons and dialogs, use a single "✨" magic menu:

1. **Generate Summary** - Creates AI summary of content
2. **Extract Tasks** - Pulls out action items
3. **Transcribe Meeting** - Starts ElevenLabs recording
4. **Send to Attendees** - Email formatted notes

### Recording Experience
- Tap microphone → Recording starts
- Live transcript appears below content
- Tap stop → Transcript merges into note
- No separate "audio recordings" management

---

## Phase 7: Calendar Integration

### Linking Notes to Events
- When creating from Calendar, note is pre-linked
- Show subtle calendar icon if linked
- Tap to see linked event details
- Two-way sync maintained via `useMeetingNotes` hook

---

## Technical Implementation

### New Notes.tsx (~250 lines)
```typescript
// Simple router between list and editor
export default function Notes() {
  const { noteId } = useParams();
  const [searchParams] = useSearchParams();
  const noteIdFromQuery = searchParams.get("note");
  
  const activeNoteId = noteId || noteIdFromQuery;
  
  if (activeNoteId) {
    return <NoteEditor noteId={activeNoteId} />;
  }
  
  return <NotesList />;
}
```

### NotesList.tsx (~200 lines)
- Search input with debounce
- Pinned section (collapsible)
- All notes grid/list
- Swipeable cards using existing SwipeableCard component
- Floating "+" button

### NoteEditor.tsx (~250 lines)
- Back navigation
- Title input (large, borderless)
- Content textarea (auto-expanding)
- Bottom action bar
- Auto-save with useDebounce
- AI actions in dropdown

### NoteCard.tsx (~80 lines)
- Wrapped in SwipeableCard
- Title, date, preview
- Pin indicator
- Action items badge

---

## State Management

### Keep existing hooks:
- `useMeetingNotes` - All CRUD operations
- `useRealtimeTranscription` - ElevenLabs integration

### Remove:
- Complex template system (simplified to just "blank note")
- Audio recordings list (transcription goes directly into note)
- Sections/structured data (just plain text with markdown)
- Multiple dialogs (use inline editing)

---

## Migration Notes

### Data Compatibility
- Existing notes in database remain unchanged
- `text_note` field used for content
- `ai_summary`, `ai_action_items` still populated by AI
- `is_pinned`, `category` still respected

### Templates
- Remove complex template picker
- Keep 3 quick-start options: Blank, Meeting, Quick Note
- Apply inline rather than through dialog

---

## Files to Create

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/Notes.tsx` | ~50 | Router/wrapper |
| `src/components/notes/NotesList.tsx` | ~200 | List view with search |
| `src/components/notes/NoteEditor.tsx` | ~300 | Note editing experience |
| `src/components/notes/NoteCard.tsx` | ~80 | Individual note card |
| `src/components/notes/NotesEmptyState.tsx` | ~40 | Empty state component |

**Total: ~670 lines** (down from 2056)

---

## Visual Style

Following existing app patterns:
- Use `Card` component for note cards
- Use `Sheet` for mobile folder picker
- Use `DropdownMenu` for actions
- Consistent with iOS: Rounded corners, subtle shadows
- Clean typography with clear hierarchy
- Smooth transitions (no loading screens as per memory)

---

## Implementation Order

1. Create `src/components/notes/` directory
2. Build `NoteCard.tsx` component
3. Build `NotesEmptyState.tsx` component
4. Build `NotesList.tsx` with search and cards
5. Build `NoteEditor.tsx` with auto-save
6. Replace `src/pages/Notes.tsx` with simple router
7. Test navigation and data persistence
8. Add AI features (summary, transcription)
9. Polish animations and transitions
