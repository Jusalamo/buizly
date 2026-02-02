
# AI-Powered Meeting Notes & Dashboard Enhancement Plan

## Overview

This plan addresses the build errors in Notes.tsx, implements AI-powered meeting notes with real-time transcription using ElevenLabs, updates the Dashboard with a Calendar quick action and Today's agenda view, and ensures consistent notification behavior throughout the app.

---

## Phase 1: Fix Build Errors & Enhance useMeetingNotes Hook

### Problem
The Notes.tsx page references functions that don't exist in useMeetingNotes:
- `extractActionItems`, `syncWithCalendar`, `exportNote`, `shareNote`, `duplicateNote`
- `templates`, `createTemplate`, `updateTemplate`, `deleteTemplate`
- Note properties: `agenda`, `attendees`, `sections`, `duration`, `project_id`

### Solution
Rebuild the useMeetingNotes hook with all required functionality:

**File: `src/hooks/useMeetingNotes.ts`**
- Add template management (stored in localStorage for custom templates)
- Add `extractActionItems()` - uses AI to parse content for action items
- Add `syncWithCalendar()` - links note to calendar event
- Add `exportNote()` - generates PDF/DOCX/text export
- Add `shareNote()` - sends note via email using send-email function
- Add `duplicateNote()` - creates a copy of the note

**File: `src/types/calendar.ts`**
- Extend MeetingNote interface with `agenda`, `attendees`, `sections`, `duration` fields
- Add NoteTemplate interface  and let the meeting with the meeting notes show up and be linked on the calendar.

---

## Phase 2: Real-Time Transcription with ElevenLabs

### Implementation
Create edge function and React hook for live speech-to-text transcription.

**File: `supabase/functions/elevenlabs-scribe-token/index.ts`**
```
Purpose: Generate single-use tokens for ElevenLabs real-time transcription
- Validates user authentication
- Calls ElevenLabs API for token
- Returns token for WebSocket connection
```

**File: `src/hooks/useRealtimeTranscription.ts`**
```
Purpose: Manage real-time transcription session using ElevenLabs React SDK
Features:
- Connect to ElevenLabs with token from edge function
- Handle microphone permissions
- Receive partial and committed transcripts
- Identify different speakers
- Bookmark moments during recording
```

**Notes.tsx Integration**
- Replace existing recording logic with ElevenLabs integration
- Show live transcript with speaker labels
- Allow clicking transcript segments to jump to audio timestamp
- Add "Listen to Meeting" mode button

---

## Phase 3: AI Summary Generation & Action Item Extraction

### Edge Function
**File: `supabase/functions/generate-note-summary/index.ts`**
```
Purpose: Generate AI-powered meeting summaries using Lovable AI
Input: Note content (text or transcript)
Output:
- Concise summary with suggested title
- List of decisions made
- Action items with assignees and deadlines
- Key quotes and highlights
```

Uses Lovable AI supported model (no API key required):
- Model: `google/gemini-2.5-flash` for speed and quality balance

---

## Phase 4: Rebuild Notes.tsx Page

### Key Changes
1. Remove references to non-existent functions and properties
2. Use correct MeetingNote type properties from database schema
3. Fix category Select component (use `category.id` and `category.name`)
4. Integrate ElevenLabs real-time transcription
5. Add AI summary generation button with loading state
6. Implement export functionality (PDF, DOCX, Text, Email)

### Component Structure
```
Notes Page
├── Notes List View (default)
│   ├── Search & Filters
│   ├── Template Picker Dialog
│   ├── Note Cards Grid
│   └── Create Note Dialog
│
└── Single Note View (when note selected)
    ├── Header with save/back
    ├── Metadata (title, date, attendees)
    ├── Recording Section
    │   ├── Voice Recording with ElevenLabs
    │   ├── Live Transcript Display
    │   └── Bookmarks Timeline
    ├── Note Content Editor
    ├── AI Actions Panel
    │   ├── Generate Summary
    │   ├── Extract Action Items
    │   └── Highlight Key Decisions
    ├── Action Items Checklist
    └── Export/Share Options
```

---

## Phase 5: Dashboard Updates

### File: `src/pages/Dashboard.tsx`

**Quick Actions - Replace Check-in with Calendar**
```
Current: Notes | Quick Scan | Check-in
New:     Notes | Quick Scan | Calendar
```

The Calendar button navigates to /calendar with today's view.

**Add Today's Agenda Section**
- Show events from calendar_events table for today
- Display time, title, location (clickable for Google Maps)
- Show meeting link if virtual (Zoom/Meet/Teams links)
- Display note icon if notes exist for the event

**Location Link Enhancements**
- Detect if location is a URL (Zoom/Meet/Teams) → open directly
- Otherwise → open in Google Maps
- Visual indicator for virtual vs in-person meetings

---

## Phase 6: Notification System Optimization

### Goal
Ensure instant real-time updates without delays, like native apps.

### Files to Update

**`src/hooks/useNotificationsOptimistic.ts`**
- Already implements optimistic updates ✓
- Already has global cache for instant access ✓
- Ensure badge count updates immediately on all actions

**`src/components/NotificationBell.tsx`**
- Badge animation already implemented ✓
- Toast notifications working ✓

**`src/components/notifications/NotificationList.tsx`**
- Add click-to-navigate functionality
- Each notification type redirects to appropriate page:
  - `meeting_request` → /meeting/:id
  - `new_connection` → /discover or /connection/:id
  - `plug_request` → /discover
  - `meeting_confirmed` → /meeting/:id
  - `profile_shared` → /u/:userId

**`src/components/notifications/NotificationItem.tsx`**
- Handle onClick to navigate and mark as read
- Immediate visual feedback on click

---

## Phase 7: Remove Component Redundancy

### Audit & Consolidate
1. **SwipeableCard** - ensure single implementation used everywhere
2. **NotificationItem** - consistent styling across list and toasts
3. **Avatar/OptimizedAvatar** - use OptimizedAvatar consistently
4. **Loading states** - use consistent skeleton/spinner patterns

---

## Database Migration Required

**Add missing columns to meeting_notes if not present:**
```sql
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS agenda text;
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS attendees text[];
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '[]'::jsonb;
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS duration integer;
```

---

## ElevenLabs Integration Setup

**Required:**
1. Connect ElevenLabs connector for API access
2. Edge function will use `ELEVENLABS_API_KEY` environment variable
3. Install `@elevenlabs/react` package in frontend

---

## Technical Details

### Type Fixes in Notes.tsx

| Line | Error | Fix |
|------|-------|-----|
| 209-218 | Missing hook functions | Add to useMeetingNotes hook |
| 303-304 | `agenda`, `attendees` don't exist | Use `text_note` or add migration |
| 307 | `sections` doesn't exist | Store in existing JSON columns |
| 477, 2021 | `placeholder` on sections | Handled in template application |
| 898 | `project_id` doesn't exist | Use `linked_project` |
| 1567 | Category type mismatch | Use `category.id` as key |
| 1640 | `agenda` doesn't exist | Use `ai_summary` or `text_note` |
| 1667-1670 | `duration` doesn't exist | Add to migration |

### Files Created
- `supabase/functions/elevenlabs-scribe-token/index.ts`
- `supabase/functions/generate-note-summary/index.ts`
- `src/hooks/useRealtimeTranscription.ts`

### Files Modified
- `src/hooks/useMeetingNotes.ts` (major rewrite)
- `src/pages/Notes.tsx` (fix errors, add features)
- `src/pages/Dashboard.tsx` (Calendar quick action, today's agenda)
- `src/types/calendar.ts` (extend MeetingNote type)
- `src/components/notifications/NotificationItem.tsx` (click navigation)
- `src/components/notifications/NotificationList.tsx` (consistent behavior)

---

## Implementation Order
1. Fix useMeetingNotes hook with all required functions
2. Update MeetingNote type and add database migration
3. Fix Notes.tsx build errors
4. Create ElevenLabs edge function for transcription token
5. Create AI summary edge function using Lovable AI
6. Add useRealtimeTranscription hook
7. Integrate real-time transcription into Notes page
8. Update Dashboard with Calendar action and Today's agenda
9. Enhance notification click navigation
10. Test end-to-end functionality

