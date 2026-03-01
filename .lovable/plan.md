
# Fixes: Prompts 1-6

## Prompt 1: Move QR Scanner to Quick Scan Button

**Current**: The QR scanner lives in `Discover.tsx` (Add People page). The Dashboard's "Quick Scan" button navigates to `/capture?scan=true` which is the old Capture page -- it doesn't open a scanner.

**Fix**:
- Remove scanner code from `Discover.tsx` (lines 29-32 refs, 136-255 scanner logic, 265-293 scanner UI, and the Scan QR button)
- Create a new page `src/pages/QuickScan.tsx` with the scanner code (QR Mode + Card Mode toggle for future OCR) and register it at `/quick-scan` in `App.tsx`
- Update Dashboard "Quick Scan" button to navigate to `/quick-scan` instead of `/capture?scan=true`

**Files**: `src/pages/Discover.tsx`, `src/pages/Dashboard.tsx`, `src/pages/QuickScan.tsx` (new), `src/App.tsx`

---

## Prompt 2: Notification Accept/Decline Instantly Removes Item

**Current**: In `NotificationItem.tsx`, after accept/decline, it shows a "Connection accepted!" / "Request declined" confirmation state instead of disappearing. In `NotificationList.tsx`, `onDelete` is called after the action, but the item stays visible with the confirmation state.

**Fix**:
- In `NotificationItem.tsx`: After successful accept/decline, instead of showing a confirmation message, immediately call `onDelete` to remove the notification from the list. Remove the `actionTaken` state and the confirmation UI block entirely -- just keep the `isProcessing` spinner during the action.
- The parent `NotificationList.tsx` already calls `onDelete(notificationId)` which removes it from the list.

**Files**: `src/components/notifications/NotificationItem.tsx`

---

## Prompt 3: Speaker Diarization Fix

**Current**: The `elevenlabs-transcribe` edge function sends `diarize: true` and `num_speakers` to the ElevenLabs API. The response processing in `useRealtimeTranscription.ts` looks for `data.words` with speaker labels. The issue is likely that:
1. The edge function uses `formData.append("diarize", "true")` but the ElevenLabs API parameter might be `enable_speaker_diarization` per their docs
2. The word grouping logic doesn't handle the ElevenLabs response format correctly (speaker IDs may be numeric, not strings)

**Fix**:
- Update `elevenlabs-transcribe/index.ts` to use the correct API parameter name (`enable_speaker_diarization` instead of `diarize`)
- Add response logging for debugging
- In `useRealtimeTranscription.ts`, make the speaker label parsing more robust -- handle both `speaker_0` format and numeric speaker IDs

**Files**: `supabase/functions/elevenlabs-transcribe/index.ts`, `src/hooks/useRealtimeTranscription.ts`

---

## Prompt 4: Profile/Business Card Toggle on Public Profile

**Current**: `PublicProfile.tsx` shows a single business card layout for all visitors.

**Fix**:
- Add a `viewMode` state toggle: `'profile'` (default) and `'card'`
- **Profile View**: Full profile page with avatar, name, bio, gallery, social links, contact details (existing layout, slightly restructured)
- **Business Card View**: Compact horizontal card with logo on left, name/email/phone on right, QR code on the side, styled like a real business card
- Add toggle buttons at the top of the page to switch between views

**Files**: `src/pages/PublicProfile.tsx`

---

## Prompt 5: Theme Selector Saves & Applies to Business Card/Profile

**Current**: `BusinessCardCustomizer.tsx` has a save button and preview section. The `onSave` prop is available but the parent (`Settings.tsx`) doesn't pass it -- the component renders standalone without connecting to the database.

**Fix**:
- In `Settings.tsx`, pass an `onSave` handler to `BusinessCardCustomizer` that writes the customization to `user_settings` table (columns `qr_foreground`, `qr_background`, `accent_color` already exist)
- Pass `initialCustomization` from the current user settings
- Remove the inline "Preview" section from `BusinessCardCustomizer.tsx` (the card preview at lines 396-457) since the user doesn't want it
- Keep the "Save Customization" button

**Files**: `src/pages/Settings.tsx`, `src/components/BusinessCardCustomizer.tsx`

---

## Prompt 6: Auto-Generate Business Card Layout

**Current**: The business card preview in `BusinessCardCustomizer.tsx` shows placeholder text ("Your Name", "Job Title - Company"). The actual public profile card in `PublicProfile.tsx` already auto-generates with real user data.

**Fix**:
- In `BusinessCardCustomizer.tsx`, fetch the user's profile data and use it in the preview instead of placeholders (show real name, title, email, phone)
- Add a small QR code to the preview card layout
- Ensure the `PublicProfile.tsx` business card view (from Prompt 4) uses the saved theme customization colors from `user_settings`

**Files**: `src/components/BusinessCardCustomizer.tsx`, `src/pages/PublicProfile.tsx`

---

## Implementation Order

1. Create `QuickScan.tsx` page, register route, update Dashboard link, remove scanner from Discover
2. Fix notification item to disappear on accept/decline
3. Fix speaker diarization API parameter and deploy edge function
4. Add profile/card toggle to PublicProfile
5. Connect theme selector to database and remove preview
6. Auto-populate business card with real user data

## Files Summary

| Action | File |
|--------|------|
| Create | `src/pages/QuickScan.tsx` |
| Modify | `src/App.tsx` (add route) |
| Modify | `src/pages/Dashboard.tsx` (Quick Scan link) |
| Modify | `src/pages/Discover.tsx` (remove scanner) |
| Modify | `src/components/notifications/NotificationItem.tsx` (instant remove) |
| Modify | `supabase/functions/elevenlabs-transcribe/index.ts` (fix API param) |
| Modify | `src/hooks/useRealtimeTranscription.ts` (robust speaker parsing) |
| Modify | `src/pages/PublicProfile.tsx` (profile/card toggle) |
| Modify | `src/pages/Settings.tsx` (connect customizer to DB) |
| Modify | `src/components/BusinessCardCustomizer.tsx` (remove preview, use real data) |
