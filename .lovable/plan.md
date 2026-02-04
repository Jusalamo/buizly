
# AI-Powered Meeting Notes & Dashboard Improvements Implementation Plan

## Overview
This plan addresses a comprehensive set of improvements including AI-powered meeting notes with ElevenLabs transcription, dashboard updates to replace 'Check-in' with Calendar functionality, smart location handling, notification system optimization, and component deduplication.

---

## Part 1: Dashboard Updates

### 1.1 Replace 'Check-in' with Calendar Quick Action
**File: `src/pages/Dashboard.tsx`**

Current state: Dashboard has three quick actions (Notes, Quick Scan, Check-in)

Changes needed:
- Replace "Check-in" button with "Calendar" button that navigates to `/calendar`
- Update the icon from `MapPinCheck` to `Calendar`
- The current "Check-in" functionality will be preserved as part of the Calendar/Today's Agenda

### 1.2 Add Today's Agenda Section
**File: `src/pages/Dashboard.tsx`**

Add a new section between Quick Actions and Upcoming Meetings:
- Show today's calendar events from `useCalendar` hook
- Display events with smart location handling (see 1.3)
- Show visual indicator for events with linked notes
- Include quick "Join" button for virtual meeting links

### 1.3 Smart Location Handling
**Files: `src/pages/Dashboard.tsx`, `src/components/calendar/CalendarAgenda.tsx`**

Implement intelligent location detection:
- Parse location string for Zoom, Google Meet, Teams patterns
- If virtual link detected: Show "Join" button that opens the link directly
- If physical address: Show "Directions" button that opens Google Maps
- Display appropriate icon (Video for virtual, MapPin for physical)

Detection patterns:
```javascript
const VIRTUAL_PATTERNS = {
  zoom: /zoom\.us\/j\//i,
  googleMeet: /meet\.google\.com\//i,
  teams: /teams\.microsoft\.com\//i
};
```

---

## Part 2: AI-Powered Meeting Notes Page

### 2.1 Create Notes Page Architecture
**New file: `src/pages/Notes.tsx`**

Build a dedicated notes page with:
- Two-level navigation (Notes List → Note Editor)
- Auto-save with debounced updates
- Sticky search bar with pinned/unpinned sections
- Category organization and tagging

### 2.2 Create Note Editor Component
**New file: `src/components/notes/NoteEditor.tsx`**

Features:
- Borderless, clean editor with auto-expanding textarea
- Bottom action bar for AI features
- Real-time transcription toggle using ElevenLabs
- AI Summary generation button
- Action item extraction

### 2.3 ElevenLabs Real-Time Transcription
**New file: `src/hooks/useRealtimeTranscription.ts`**

Integration with ElevenLabs Speech-to-Text:
- Use the already-linked ElevenLabs connector (`ELEVENLABS_API_KEY` is available)
- Create edge function for Scribe token generation
- Implement `useScribe` hook from `@elevenlabs/react` SDK

**New edge function: `supabase/functions/elevenlabs-scribe-token/index.ts`**
```typescript
// Generate single-use token for realtime transcription
// Returns token to client for WebSocket connection
```

### 2.4 AI Summary Generation
**New edge function: `supabase/functions/generate-note-summary/index.ts`**

Since Lovable AI Gateway is disabled, use OpenAI directly via user-provided key OR implement using available models. The edge function will:
- Accept note content (text or transcript)
- Generate concise summary with suggested title
- Extract action items with assignees and deadlines
- Identify key decisions and highlights
- Return structured JSON response

### 2.5 Notes Components Structure
**New files:**
- `src/components/notes/NotesList.tsx` - List view with search
- `src/components/notes/NoteCard.tsx` - Individual note card (swipeable)
- `src/components/notes/NotesEmptyState.tsx` - Empty state UI
- `src/components/notes/TranscriptionPanel.tsx` - Real-time transcription UI
- `src/components/notes/AIActionsMenu.tsx` - Magic menu for AI features

---

## Part 3: Notification System Optimization

### 3.1 Consolidate Notification Hooks
**Current state:** Two hooks exist (`useNotifications.ts` and `useNotificationsOptimistic.ts`)

Solution:
- Keep `useNotificationsOptimistic.ts` as the primary hook (has global cache, optimistic updates)
- Update `BottomNav.tsx` to use `useNotificationsOptimistic` instead of `useNotifications`
- This eliminates duplicate realtime subscriptions and ensures consistent counts

### 3.2 Fix Real-Time Badge Updates
**File: `src/components/BottomNav.tsx`**

Current issues:
- Uses `useNotifications` which has separate state from `useNotificationsOptimistic`
- Creates duplicate realtime channels

Fix:
- Import and use `useNotificationsOptimistic` hook
- Use the global cache for instant badge updates
- Remove the redundant local notification counting logic

### 3.3 Instant Button Press Feedback
**Files: `src/components/notifications/NotificationList.tsx`, `src/components/notifications/NotificationItem.tsx`**

Ensure all actions have immediate visual feedback:
- Optimistic UI updates already in place
- Add loading spinners to Accept/Decline buttons during processing
- Animate removal of notifications on delete

---

## Part 4: Component Deduplication

### 4.1 Location Link Utility
**New file: `src/lib/locationUtils.ts`**

Create shared utility for location handling used across:
- Dashboard (Today's Agenda, Upcoming Meetings)
- Calendar components
- Meeting Detail page

```typescript
export function parseLocation(location: string) {
  // Returns { type: 'virtual' | 'physical', url: string, label: string }
}

export function LocationLink({ location, className }) {
  // Reusable component for rendering clickable locations
}
```

### 4.2 Meeting Card Component
**New file: `src/components/MeetingCard.tsx`**

Create unified meeting card component used in:
- Dashboard upcoming meetings
- Today's agenda
- Schedule page

This consolidates the duplicated meeting card rendering logic.

### 4.3 Notification Count Hook
**Already addressed in 3.1** - Single source of truth via `useNotificationsOptimistic`

---

## Part 5: Route & Navigation Updates

### 5.1 Add Notes Route
**File: `src/App.tsx`**

Add new routes:
```jsx
<Route path="/notes" element={<Notes />} />
<Route path="/notes/:id" element={<Notes />} />
<Route path="/notes/new" element={<Notes />} />
```

### 5.2 Update Bottom Navigation (Optional Enhancement)
**File: `src/components/BottomNav.tsx`**

Consider adding Calendar to the nav items array if the Schedule item should link to Calendar instead:
- Update `/schedule` matchPaths to include `/calendar`
- Or keep separate and add visual consistency

---

## Technical Implementation Details

### Database Dependencies
The existing schema supports all features:
- `calendar_events` table with `has_notes`, `meeting_notes_id` columns
- `meeting_notes` table with `ai_summary`, `transcript`, `ai_action_items` columns
- `notes_categories` for organization

### ElevenLabs Integration
The connector is already linked with `ELEVENLABS_API_KEY` available as a secret.

Required packages to install:
```bash
npm install @elevenlabs/react
```

### Edge Functions to Create
1. `elevenlabs-scribe-token` - Get transcription token
2. `generate-note-summary` - AI summary generation (requires AI model access)

---

## File Changes Summary

### New Files (10)
1. `src/pages/Notes.tsx`
2. `src/components/notes/NotesList.tsx`
3. `src/components/notes/NoteEditor.tsx`
4. `src/components/notes/NoteCard.tsx`
5. `src/components/notes/NotesEmptyState.tsx`
6. `src/components/notes/TranscriptionPanel.tsx`
7. `src/components/notes/AIActionsMenu.tsx`
8. `src/components/MeetingCard.tsx`
9. `src/lib/locationUtils.ts`
10. `supabase/functions/elevenlabs-scribe-token/index.ts`

### Modified Files (7)
1. `src/pages/Dashboard.tsx` - Add Calendar button, Today's Agenda, smart locations
2. `src/components/BottomNav.tsx` - Fix notification hook, update counts
3. `src/components/calendar/CalendarAgenda.tsx` - Add smart location links
4. `src/components/calendar/EventModal.tsx` - Add location link preview
5. `src/App.tsx` - Add notes routes
6. `src/hooks/useMeetingNotes.ts` - Add transcription methods
7. `package.json` - Add @elevenlabs/react dependency

---

## Implementation Order

1. **Phase 1: Dashboard Updates** (Quick wins)
   - Replace Check-in → Calendar button
   - Add Today's Agenda section
   - Implement smart location handling

2. **Phase 2: Notification Optimization**
   - Consolidate to single hook
   - Fix BottomNav real-time updates
   - Ensure instant feedback

3. **Phase 3: Component Cleanup**
   - Create LocationLink utility
   - Create MeetingCard component
   - Refactor duplicated code

4. **Phase 4: Notes Page Foundation**
   - Create Notes page structure
   - Build NotesList and NoteCard
   - Implement search and categories

5. **Phase 5: AI Features**
   - Create ElevenLabs token edge function
   - Add real-time transcription hook
   - Build TranscriptionPanel UI
   - Create AI summary edge function
   - Build AIActionsMenu

---

## Note on AI Summary Generation

Since the Lovable AI Gateway is disabled, the `generate-note-summary` edge function will need one of these approaches:

1. **User provides OpenAI API key** - Store in secrets and use directly
2. **Use ElevenLabs for voice features only** - Skip AI summary, allow manual summaries
3. **Enable Lovable AI Gateway** - Best option for seamless AI integration

The plan proceeds assuming option 2 (ElevenLabs for transcription, basic note-taking without AI summary) unless the user enables the Lovable AI Gateway or provides an OpenAI API key.
