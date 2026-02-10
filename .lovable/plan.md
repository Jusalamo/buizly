

# Plug Visibility, Connection Flow, Privacy, Business Card, QR Scan & Speaker Diarization

This plan addresses multiple interconnected improvements across the app.

---

## 1. Plugs: Both Participants See Who They're Being Introduced To

**Current state**: When Person C introduces Person A and Person B, each participant can only see themselves and the "other" person. They cannot see the full picture of who is involved.

**Fix**: Update `PlugsList.tsx` and `PlugIntroduction.tsx` to show all participants to each recipient. When Person A views the plug, they see: "Person C wants to introduce you to Person B" (with Person B's profile details visible). Person B sees the same but with Person A's details.

### Changes:
- **`src/components/PlugsList.tsx`**: In the "received" plug visualization, show all other participants with their full profile info (name, avatar, job title, company) instead of just avatars.
- **`src/hooks/usePlugs.ts`**: Ensure the `respondToPlug` function, when both participants accept, triggers a mutual connection creation via a new RPC function.

---

## 2. Clear/Delete Introductions

**Current state**: There is no way to clear/remove a plug introduction, especially if no one acted on it.

**Fix**: Add a delete/clear action to both sent and received plugs.

### Changes:
- **`src/hooks/usePlugs.ts`**: Add a `deletePlug` function that:
  - For sent plugs: deletes the plug and all participants
  - For received plugs: removes the current user's participant record (effectively hiding it)
- **`src/components/PlugsList.tsx`**: Add a trash/clear button on each plug card with confirmation

---

## 3. Mutual Connection on Plug Accept

**Current state**: When a participant accepts a plug, their status updates to "accepted" but no actual connection is created between participants.

**Fix**: When ALL participants of a plug have accepted, automatically create mutual connections between them using the existing `accept_connection_request` pattern.

### Changes:
- **`src/hooks/usePlugs.ts`**: After `respondToPlug` succeeds with `accept=true`, check if all participants have accepted. If yes, create bidirectional connections between all participants by inserting into the `connections` table for each pair.
- Add notifications to each participant confirming the new connections.

---

## 4. Private Profile Visibility Fix

**Current state**: The Settings page has a profile visibility selector (Public/Connections/Private) that saves to the database. However, the `PublicProfile.tsx` page already handles private visibility by showing only name and avatar. The issue is that when set to "private," it should also show the user's company/business but hide contact info (email, phone).

**Fix**: Update the private profile view to show name, avatar, AND company/job title, but hide contact details.

### Changes:
- **`src/pages/PublicProfile.tsx`**: Update the private profile view (lines 196-218) to also fetch and display `job_title` and `company` from the public profile RPC. Update the `get_public_profile_safe` data display to include these fields.
- **`src/hooks/useProfileSearch.ts`**: Ensure private profiles in search results show name and company but no contact info (already partially done with `isPrivate` flag).

---

## 5. Business Card View for QR Code Scans

**Current state**: When someone scans a QR code, they see a full profile page (`PublicProfile.tsx`) with a social media-like layout. The user wants a proper business card layout instead.

**Fix**: Redesign the `PublicProfile.tsx` to render as a digital business card when accessed via QR scan. The card should display:
- Profile photo and business logo
- Name, job title, company
- Phone, email
- Arranged in a business card layout (compact, professional)

### Changes:
- **`src/pages/PublicProfile.tsx`**: Redesign the main profile display to use a business card layout:
  - Horizontal card-like container with profile photo on the left
  - Name, title, company stacked on the right
  - Contact details (phone, email) displayed below in a clean row
  - Keep the "Save Contact" and "Open App" buttons below the card
  - Remove the social media-style vertical layout

---

## 6. Remove Requests Tab from Add Page

**Current state**: The Discover page has three tabs: Find, Requests, Manual. Connection requests should only appear in notifications.

**Fix**: Remove the "Requests" tab entirely from `Discover.tsx`. Connection request notifications (accept/decline/new request) will be handled through the existing notification system.

### Changes:
- **`src/pages/Discover.tsx`**: 
  - Remove the "Requests" tab trigger and content (lines 186-197 and 367-529)
  - Change grid from `grid-cols-3` to `grid-cols-2`
  - Remove the request count badge
  - Remove `processingRequestId`, `processingAction` state and handlers
  - Remove `useConnectionRequests` import (unless needed for `getRequestStatus` in search)
  - Keep `getRequestStatus` and `sendRequest` for the Find tab
- **`src/components/BottomNav.tsx`**: Update the notification count for "Add" tab -- remove `incomingRequests.length` since requests now only show in notifications.

---

## 7. QR Code Scanner for Connection Requests

**Current state**: The "Quick Scan" or camera functionality should scan QR codes and create connection requests based on the scanned user's profile.

**Fix**: The QR scan flow should: scan QR code -> extract user ID from the URL -> send a connection request to that user.

### Changes:
- **`src/pages/Discover.tsx`** or a new scanner component: Add a "Scan QR" button that opens the device camera, reads a QR code URL (e.g., `buizly.lovable.app/u/{userId}`), extracts the userId, and calls `sendRequest(userId)` to send a connection request. If already connected, show a toast.
- This uses the browser's native `BarcodeDetector` API or a lightweight QR scanning library.

---

## 8. Speaker Diarization in Transcription

**Current state**: The realtime transcription uses `useScribe` with `scribe_v2_realtime` model but does not support speaker diarization (realtime Scribe does not have a `num_speakers` parameter -- that is only available for batch transcription).

**Fix**: Since the `scribe_v2_realtime` model does NOT support speaker diarization natively, we will:
1. Add a speaker count selector to the transcription UI
2. After recording stops, send the recorded audio to the **batch** transcription API (`scribe_v2`) with `enable_speaker_diarization=true` and `num_speakers` set
3. Replace the realtime segments with the diarized result, showing speaker labels

### Changes:
- **`src/components/notes/NoteEditor.tsx`**: Add a speaker count selector (1-6) near the transcribe button
- **`src/components/notes/TranscriptionPanel.tsx`**: Add speaker count selector UI, pass the value up
- **`src/hooks/useRealtimeTranscription.ts`**: After stopping, if speaker count > 1, collect the audio and send to a new batch transcription edge function
- **`supabase/functions/elevenlabs-transcribe/index.ts`** (new): Create batch transcription endpoint that accepts audio + speaker count, calls ElevenLabs batch STT API with diarization enabled, returns speaker-labeled transcript
- **`src/components/notes/TranscriptionPanel.tsx`**: Display speaker labels (e.g., "Speaker 1", "Speaker 2") on each segment

---

## Technical Details

### Files to Create:
1. `supabase/functions/elevenlabs-transcribe/index.ts` -- Batch transcription with diarization

### Files to Modify:
1. `src/components/PlugsList.tsx` -- Show full participant details, add delete button
2. `src/hooks/usePlugs.ts` -- Add `deletePlug`, mutual connection creation on all-accept
3. `src/pages/PublicProfile.tsx` -- Business card layout, private profile shows company
4. `src/pages/Discover.tsx` -- Remove Requests tab, add QR scan button
5. `src/components/BottomNav.tsx` -- Update Add tab badge count
6. `src/components/notes/NoteEditor.tsx` -- Speaker count selector
7. `src/components/notes/TranscriptionPanel.tsx` -- Speaker count UI, speaker labels
8. `src/hooks/useRealtimeTranscription.ts` -- Post-recording batch diarization flow

### Database Changes:
- New RPC function `complete_plug_connections` that creates mutual connections between all accepted plug participants

### Implementation Order:
1. Remove Requests tab from Discover (simplest, reduces code)
2. Fix private profile visibility (show name + company)
3. Redesign PublicProfile as business card
4. Plug participant visibility fix
5. Plug delete/clear functionality
6. Mutual connection on plug accept
7. QR scanner for connection requests
8. Speaker diarization (batch transcription edge function + UI)

