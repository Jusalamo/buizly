
# Notes Search Enhancement & Calendar Linking UI

## Overview
This plan implements two key features:
1. **Enhanced Search Filtering** - Improve the existing search to include category filtering, and show linked calendar event titles in the note cards
2. **Calendar Linking UI** - Add ability to link/unlink notes to calendar events from within the note editor

---

## Part 1: Enhanced Search & Filtering

### Current State
The `NotesList.tsx` already has search functionality that filters by:
- Title
- Content (`text_note`)
- Tags

**What's missing:**
- Category filtering (chips/tabs)
- Calendar event title in search results
- Visual indicator showing linked vs standalone notes

### Changes to NotesList.tsx

**Add category filter tabs:**
```typescript
// Add category tabs below search bar
const categories = ['all', 'meeting', 'personal', 'ideas', 'tasks'];
const [selectedCategory, setSelectedCategory] = useState('all');
```

**Enhance the filtering logic:**
- Include category filtering
- Search by linked meeting title
- Add visual badge for linked notes

### Changes to NoteCard.tsx

**Pass linked event title to cards:**
- Accept `linkedEventTitle` prop (fetched from calendar events)
- Display calendar icon with event title when note is linked to an event
- Add "Standalone" badge for notes without calendar link

### Data Flow Update

**In Notes.tsx:**
- Import `useCalendar` hook to get calendar events
- Map each note to include `linkedEventTitle` by looking up the `meeting_id` in calendar events

---

## Part 2: Calendar Linking UI

### New Component: CalendarLinkModal

**File: `src/components/notes/CalendarLinkModal.tsx`**

A dialog that allows users to:
1. View currently linked event (if any)
2. Search and select a calendar event to link
3. Unlink from current event
4. Quick create a new event and link it

**UI Design:**
```
┌──────────────────────────────────────┐
│  Link to Calendar Event       [X]   │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🔍 Search events...            │  │
│  └────────────────────────────────┘  │
│                                      │
│  Currently Linked:                   │
│  ┌────────────────────────────────┐  │
│  │ 📅 Meeting with John           │  │
│  │    Tomorrow at 2:00 PM   [⊘]   │  │
│  └────────────────────────────────┘  │
│                                      │
│  Upcoming Events:                    │
│  ┌────────────────────────────────┐  │
│  │ Team Standup - Today 9 AM      │  │
│  │ Design Review - Today 3 PM     │  │
│  │ Sprint Planning - Tomorrow     │  │
│  └────────────────────────────────┘  │
│                                      │
│  ───────── or ─────────             │
│                                      │
│  [+ Create New Event & Link]        │
│                                      │
└──────────────────────────────────────┘
```

### Update NoteEditor.tsx

Add calendar link functionality:

1. **New state:**
   - `linkedEvent` - the currently linked calendar event
   - `showCalendarLink` - controls the modal visibility

2. **New UI elements:**
   - Calendar link button in the header (next to pin)
   - Shows linked event badge if linked
   - Opens `CalendarLinkModal` on click

3. **Callback handlers:**
   - `handleLinkToEvent(eventId)` - links note to calendar event
   - `handleUnlinkFromEvent()` - removes calendar link

### Update useMeetingNotes Hook

**Add new function:**
```typescript
const linkNoteToEvent = async (noteId: string, eventId: string) => {
  // 1. Update meeting_notes.meeting_id = eventId
  // 2. Update meeting_notes.is_standalone = false
  // 3. Update calendar_events.has_notes = true
  // 4. Update calendar_events.meeting_notes_id = noteId
};

const unlinkNoteFromEvent = async (noteId: string) => {
  // 1. Get the current meeting_id from the note
  // 2. Update meeting_notes.meeting_id = null
  // 3. Update meeting_notes.is_standalone = true
  // 4. Update calendar_events.has_notes = false
  // 5. Update calendar_events.meeting_notes_id = null
};
```

---

## File Changes Summary

### New Files (1)
1. `src/components/notes/CalendarLinkModal.tsx` - Modal for linking notes to calendar events

### Modified Files (5)
1. `src/components/notes/NotesList.tsx` - Add category filter tabs, enhance search
2. `src/components/notes/NoteCard.tsx` - Add linked event title display, standalone badge
3. `src/components/notes/NoteEditor.tsx` - Add calendar link button and modal trigger
4. `src/hooks/useMeetingNotes.ts` - Add `linkNoteToEvent` and `unlinkNoteFromEvent` functions
5. `src/pages/Notes.tsx` - Integrate calendar events for linked event lookup

---

## Implementation Details

### NotesList.tsx Changes

```typescript
// Add category filter chips
const categories = [
  { id: 'all', label: 'All', icon: FileText },
  { id: 'meeting', label: 'Meeting', icon: Calendar },
  { id: 'personal', label: 'Personal', icon: User },
];

// Enhanced filter logic
const filteredNotes = useMemo(() => {
  let filtered = [...notes];
  
  // Search by query (title, content, tags, category, linked event)
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(note =>
      note.title?.toLowerCase().includes(query) ||
      note.text_note?.toLowerCase().includes(query) ||
      note.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      note.category?.toLowerCase().includes(query) ||
      note.linkedEventTitle?.toLowerCase().includes(query)
    );
  }
  
  // Filter by category
  if (selectedCategory !== 'all') {
    filtered = filtered.filter(note => note.category === selectedCategory);
  }
  
  // ... existing pinned/sort logic
}, [notes, searchQuery, selectedCategory, showPinnedOnly]);
```

### CalendarLinkModal.tsx Structure

```typescript
interface CalendarLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEventId?: string | null;
  currentEventTitle?: string | null;
  onLinkEvent: (eventId: string) => void;
  onUnlinkEvent: () => void;
  onCreateAndLink: () => void;
}

export function CalendarLinkModal({
  open,
  onOpenChange,
  currentEventId,
  currentEventTitle,
  onLinkEvent,
  onUnlinkEvent,
  onCreateAndLink,
}: CalendarLinkModalProps) {
  const { events } = useCalendar();
  const [search, setSearch] = useState('');
  
  // Filter events by search query
  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase())
  );
  
  // Group by today, tomorrow, upcoming
  const groupedEvents = useMemo(() => {
    // ... group logic
  }, [filteredEvents]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Modal content */}
    </Dialog>
  );
}
```

### useMeetingNotes.ts New Functions

```typescript
const linkNoteToEvent = useCallback(async (noteId: string, eventId: string) => {
  try {
    // Optimistic update
    setNotes(prev => prev.map(n => 
      n.id === noteId ? { ...n, meeting_id: eventId, is_standalone: false } : n
    ));
    
    // Update note
    await supabase
      .from('meeting_notes')
      .update({ meeting_id: eventId, is_standalone: false })
      .eq('id', noteId);
    
    // Update calendar event
    await supabase
      .from('calendar_events')
      .update({ has_notes: true, meeting_notes_id: noteId })
      .eq('id', eventId);
      
  } catch (error) {
    console.error('Error linking note to event:', error);
    throw error;
  }
}, []);

const unlinkNoteFromEvent = useCallback(async (noteId: string, eventId: string) => {
  try {
    // Optimistic update
    setNotes(prev => prev.map(n => 
      n.id === noteId ? { ...n, meeting_id: undefined, is_standalone: true } : n
    ));
    
    // Update note
    await supabase
      .from('meeting_notes')
      .update({ meeting_id: null, is_standalone: true })
      .eq('id', noteId);
    
    // Update calendar event
    await supabase
      .from('calendar_events')
      .update({ has_notes: false, meeting_notes_id: null })
      .eq('id', eventId);
      
  } catch (error) {
    console.error('Error unlinking note from event:', error);
    throw error;
  }
}, []);
```

---

## Technical Considerations

### Database Relationships
- `meeting_notes.meeting_id` references `calendar_events.id` (nullable for standalone)
- `calendar_events.meeting_notes_id` references `meeting_notes.id` (bidirectional link)
- `calendar_events.has_notes` boolean flag for quick checks

### Search Performance
- Client-side filtering is sufficient for typical note volumes (~100-500 notes)
- If performance becomes an issue, can add database-level full-text search later

### Calendar Event Lookup
- Use `useCalendar` hook which already caches events
- Create a map `{ eventId: eventTitle }` for O(1) lookup in note cards

---

## Implementation Order

1. **Phase 1: Enhanced Search**
   - Add category filter chips to NotesList
   - Enhance filtering logic to include category
   - Update NoteCard to display linked event info

2. **Phase 2: Calendar Link Modal**
   - Create CalendarLinkModal component
   - Add event search and selection UI
   - Add unlink functionality

3. **Phase 3: Hook Integration**
   - Add `linkNoteToEvent` and `unlinkNoteFromEvent` to useMeetingNotes
   - Add calendar link button to NoteEditor
   - Wire up modal with callbacks

4. **Phase 4: Data Flow**
   - Update Notes.tsx to pass calendar events
   - Create event title lookup map
   - Display linked event titles in NoteCard
