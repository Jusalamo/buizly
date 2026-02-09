

# Fix Transcription Saving & Improve Request Button Feedback

## Issue 1: Transcription Not Saved to Note

### Root Cause
In `NoteEditor.tsx` (lines 143-151), the effect that appends the transcription to the note content has a logic flaw:

```typescript
useEffect(() => {
  if (transcription.fullTranscript && !transcription.isConnected) {
    setContent(prev => {
      if (prev.includes(transcription.fullTranscript)) return prev;
      return prev + (prev ? '\n\n---\n\n' : '') + transcription.fullTranscript;
    });
  }
}, [transcription.fullTranscript, transcription.isConnected]);
```

**Problem 1**: The `prev.includes(transcription.fullTranscript)` check is fragile. Since `fullTranscript` builds incrementally during recording (e.g., "Hello" then "Hello world"), partial matches can cause false positives, preventing the final transcript from being appended.

**Problem 2**: When the user stops recording, `isConnected` becomes `false` and the effect runs once. But the `showTranscription` panel stays open, so the user doesn't see the editor. When they toggle back, the auto-save may have already fired with the old content. Additionally, the auto-save (lines 112-141) does NOT include the `transcript` field -- it only saves `title`, `text_note`, and `is_pinned`. So while the transcript text may get appended to `text_note`, the dedicated `transcript` column is never updated by auto-save.

**Problem 3**: For new notes, auto-save is disabled entirely (`if (!hasChanges || isNew) return`). The transcript is appended to `content` state, but the user must manually click "Create Note." If they click it before the effect runs (or if the effect's `includes` check blocks it), the transcript is lost.

### Fix

1. **Auto-switch back to editor view when recording stops** -- so the user sees the transcript appended to their content immediately
2. **Use a ref to track the last appended transcript** instead of `prev.includes()` to avoid false-positive duplicate detection
3. **Include `transcript` in auto-save** so the dedicated transcript column also gets saved
4. **Trigger a save after transcript append** to persist it immediately

### Files to Change
- `src/components/notes/NoteEditor.tsx`

---

## Issue 2: Request Accept/Decline Buttons Have No Visual Feedback

### Root Cause
In `Discover.tsx` (lines 408-422), the Accept and Decline buttons for connection requests have no loading or disabled state:

```tsx
<Button onClick={() => acceptRequest(request.id)} size="sm" className="bg-green-600 ...">
  <Check className="h-4 w-4" />
</Button>
<Button onClick={() => declineRequest(request.id)} size="sm" variant="outline" className="border-destructive/50 ...">
  <X className="h-4 w-4" />
</Button>
```

Both `acceptRequest` and `declineRequest` in `useConnectionRequests.ts` are async operations that make multiple database calls and API requests. During this time:
- No loading spinner is shown
- Buttons remain clickable, so users press multiple times
- No visual distinction for active/hover states beyond default

### Fix

1. **Add per-request loading state** in `Discover.tsx` to track which request is being processed
2. **Disable both buttons** while an action is in progress on that specific request
3. **Show a spinner** on the active button (accept or decline) during processing
4. **Improve hover states** with distinct colors: green hover for accept, red hover for decline
5. **Add optimistic UI removal** -- remove the request card immediately from the list while the async action completes in the background

### Files to Change
- `src/pages/Discover.tsx`

---

## Detailed Technical Changes

### NoteEditor.tsx Changes

```typescript
// 1. Add a ref to track the last transcript we appended
const lastAppendedTranscriptRef = useRef<string>('');

// 2. Replace the existing "Append transcription to content" effect
useEffect(() => {
  if (
    transcription.fullTranscript &&
    !transcription.isConnected &&
    transcription.fullTranscript !== lastAppendedTranscriptRef.current
  ) {
    lastAppendedTranscriptRef.current = transcription.fullTranscript;
    setContent(prev => {
      const separator = prev.trim() ? '\n\n---\n\n' : '';
      return prev + separator + transcription.fullTranscript;
    });
    // Switch back to editor view so user sees the appended text
    setShowTranscription(false);
  }
}, [transcription.fullTranscript, transcription.isConnected]);

// 3. Include transcript in auto-save
// In the auto-save effect, add transcript to the save payload:
await onSave({
  id: note?.id,
  title: title || null,
  text_note: content || null,
  is_pinned: isPinned,
  transcript: transcription.fullTranscript || note?.transcript,
});
```

### Discover.tsx Changes

```typescript
// 1. Add processing state
const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
const [processingAction, setProcessingAction] = useState<'accept' | 'decline' | null>(null);

// 2. Wrap accept/decline handlers
const handleAcceptRequest = async (requestId: string) => {
  setProcessingRequestId(requestId);
  setProcessingAction('accept');
  try {
    await acceptRequest(requestId);
  } finally {
    setProcessingRequestId(null);
    setProcessingAction(null);
  }
};

const handleDeclineRequest = async (requestId: string) => {
  setProcessingRequestId(requestId);
  setProcessingAction('decline');
  try {
    await declineRequest(requestId);
  } finally {
    setProcessingRequestId(null);
    setProcessingAction(null);
  }
};

// 3. Update button rendering with loading/disabled states
<Button
  onClick={() => handleAcceptRequest(request.id)}
  size="sm"
  disabled={processingRequestId === request.id}
  className="bg-green-600 hover:bg-green-500 active:bg-green-700 
             active:scale-95 transition-all text-white h-8 px-3"
>
  {processingRequestId === request.id && processingAction === 'accept' ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Check className="h-4 w-4" />
  )}
</Button>

<Button
  onClick={() => handleDeclineRequest(request.id)}
  size="sm"
  variant="outline"
  disabled={processingRequestId === request.id}
  className="border-destructive/50 text-destructive 
             hover:bg-destructive hover:text-destructive-foreground 
             active:scale-95 transition-all h-8 px-3"
>
  {processingRequestId === request.id && processingAction === 'decline' ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <X className="h-4 w-4" />
  )}
</Button>
```

---

## Files to Modify

1. **`src/components/notes/NoteEditor.tsx`**
   - Add `lastAppendedTranscriptRef` to prevent duplicate appends
   - Fix transcript append effect with reliable dedup
   - Auto-switch from transcription panel to editor after recording stops
   - Include `transcript` field in auto-save payload

2. **`src/pages/Discover.tsx`**
   - Add `processingRequestId` and `processingAction` state
   - Wrap `acceptRequest`/`declineRequest` with loading handlers
   - Add `Loader2` import
   - Update Accept button with spinner, disabled state, and green hover
   - Update Decline button with spinner, disabled state, and red hover
   - Add `active:scale-95` press feedback to both buttons

