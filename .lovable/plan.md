
# OCR Scanner, Team Handoffs, Heat Triage & Search (Prompts 7-14)

This plan covers building the OCR scanner, team handoff system, heat triage/lead management, and search/filters -- in order, frontend first then backend for each feature.

---

## Phase 1: OCR Scanner Frontend (Prompt 7)

Update `src/pages/QuickScan.tsx` to replace the placeholder Card Mode with a full camera-based card scanner experience.

**Card Mode flow:**
1. Camera opens with a guide box overlay ("Align card here")
2. User taps "Capture" to take a photo (grab frame from video)
3. Show loading state: "Extracting details..."
4. Display an edit screen with pre-filled mock fields: Name, Company, Title, Phone, Email, Address, Website
5. Priority selector with three options (Hot, Warm, Cold)
6. "Save Contact" button (saves to local state for now)

**Changes:**
- `src/pages/QuickScan.tsx`: Replace the Card Mode placeholder with camera view, capture logic, extraction loading state, edit form with mock data, and priority selector

---

## Phase 2: OCR Backend Integration (Prompt 8)

Connect Card Mode to Google Cloud Vision API for real OCR text extraction.

**Changes:**
- Create `supabase/functions/ocr-extract/index.ts`: Accepts an image, calls Google Cloud Vision API for text detection, parses extracted text using regex patterns for email, phone, name, company, etc., returns structured contact fields
- Update `src/pages/QuickScan.tsx`: Replace mock data with real API call to the edge function; on success, populate edit form with parsed fields; on "Save Contact", insert into `connections` table and optionally store the card image in storage
- Generate vCard file download after save

**Secret required:** `GOOGLE_CLOUD_VISION_API_KEY` -- will need to be added via the secrets tool.

**Database:** Create a storage bucket `card-images` for storing scanned card photos.

---

## Phase 3: Team Handoff Frontend (Prompt 9)

Add team handoff UI with mock data.

**Changes:**
- Create `src/components/AssignToColleague.tsx`: A dialog/modal triggered by an "Assign to Colleague" button. Contains: colleague selector (dropdown from mock team list), context notes textarea, priority selector (Hot/Warm/Cold), attached card image preview
- Update `src/pages/ConnectionDetail.tsx`: Add "Assign to Colleague" button that opens the dialog
- Create `src/pages/TeamHandoffs.tsx`: New page with two tabs: "Assigned to Me" and "Assigned by Me", showing mock handoff cards with status badges
- Register `/team-handoffs` route in `src/App.tsx`
- Add "Team Handoffs" link to Dashboard or navigation

---

## Phase 4: Team Handoff Backend (Prompt 10)

Create database tables and wire up the handoff system.

**Database migration:**
```sql
-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Team members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- Handoffs
CREATE TABLE public.handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL,
  to_user UUID NOT NULL,
  connection_id UUID REFERENCES public.connections(id),
  contact_name TEXT NOT NULL,
  contact_company TEXT,
  note TEXT,
  priority TEXT DEFAULT 'warm',
  status TEXT DEFAULT 'pending',
  card_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

With RLS policies: users can see handoffs where they are from_user or to_user; team members can view other members.

**Changes:**
- Update `src/components/AssignToColleague.tsx`: Replace mock data with real team member queries and handoff insertion
- Update `src/pages/TeamHandoffs.tsx`: Replace mock data with real database queries
- Create notification on handoff: "[Name] assigned you a contact: [Person] from [Company]"
- Add status tracking: Pending, Contacted, Deal Closed, Lost

---

## Phase 5: Team Admin Dashboard (Prompt 11)

**Changes:**
- Create `src/pages/TeamAdmin.tsx`: Admin dashboard with three sections:
  1. Member management: list team members, invite (by email), remove, change roles
  2. Handoff analytics: total handoffs, conversion rate (Deal Closed / total), top givers/receivers
  3. CSV export button for team contacts
- Register `/team-admin` route in `src/App.tsx`
- Add admin check using a `team_members.role = 'admin'` query
- Create `src/hooks/useTeam.ts`: Hook for team CRUD operations

---

## Phase 6: Heat Triage Frontend (Prompt 12)

Add lead priority system with dashboard tabs.

**Changes:**
- Create `src/components/PriorityPopup.tsx`: Modal that appears when saving ANY contact, asking "How hot is this lead?" with options: Hot (follow up within 24h), Warm (follow up this week), Cold (archive), Later (custom reminder date picker)
- Update `src/pages/QuickScan.tsx`: Show PriorityPopup after saving a scanned contact
- Update `src/pages/Discover.tsx`: Show PriorityPopup after adding a manual connection
- Create `src/pages/LeadsDashboard.tsx` or update Dashboard with three tabs:
  - Hot Leads: Large pinned cards with "Mark Contacted" button
  - Warm Contacts: List view with "Message" button
  - My Library: All contacts
- Use mock data initially

---

## Phase 7: Heat Triage Backend (Prompt 13)

**Database migration:**
```sql
ALTER TABLE public.connections 
  ADD COLUMN priority TEXT DEFAULT 'warm',
  ADD COLUMN reminder_date TIMESTAMPTZ,
  ADD COLUMN last_contacted_at TIMESTAMPTZ,
  ADD COLUMN archived BOOLEAN DEFAULT false;
```

**Changes:**
- Update `src/components/PriorityPopup.tsx`: Save priority to connections table
- Update `src/pages/LeadsDashboard.tsx`: Query connections filtered by priority
- Create `supabase/functions/weekly-digest/index.ts`: Checks for unmessaged warm contacts, creates notification: "You have X warm contacts you haven't messaged: [names]"
- Add "Message on WhatsApp" button: opens `https://wa.me/{phone}` with the contact's number
- Auto-archive: contacts marked Cold for over 6 months get `archived = true`
- Set up a cron job for the weekly digest

---

## Phase 8: Search & Filters (Prompt 14)

**Changes:**
- Create `src/components/ContactFilters.tsx`: Filter bar with dropdowns for priority, date range, company, assigned status
- Create `src/hooks/useContactSearch.ts`: Hook that queries connections with filters applied
- Update contact views (Network, LeadsDashboard, TeamHandoffs) to include the filter bar and search input
- Search across name, company, and notes fields using Supabase `ilike` queries

---

## Files Summary

| Action | File |
|--------|------|
| Modify | `src/pages/QuickScan.tsx` (Card Mode camera + OCR form) |
| Create | `supabase/functions/ocr-extract/index.ts` (Google Vision OCR) |
| Create | `src/components/AssignToColleague.tsx` (handoff dialog) |
| Create | `src/pages/TeamHandoffs.tsx` (handoff tracking page) |
| Create | `src/pages/TeamAdmin.tsx` (admin dashboard) |
| Create | `src/hooks/useTeam.ts` (team operations hook) |
| Create | `src/components/PriorityPopup.tsx` (lead triage modal) |
| Create | `src/pages/LeadsDashboard.tsx` or modify Dashboard (lead tabs) |
| Create | `supabase/functions/weekly-digest/index.ts` (warm contact digest) |
| Create | `src/components/ContactFilters.tsx` (search + filter bar) |
| Create | `src/hooks/useContactSearch.ts` (filtered contact queries) |
| Modify | `src/pages/ConnectionDetail.tsx` (add assign button) |
| Modify | `src/pages/Discover.tsx` (priority popup on add) |
| Modify | `src/App.tsx` (new routes) |
| Modify | `src/components/BottomNav.tsx` (team handoffs link) |
| DB Migration | teams, team_members, handoffs tables |
| DB Migration | priority + reminder_date columns on connections |

## Implementation Order

1. QuickScan Card Mode frontend (mock data)
2. OCR edge function + backend integration
3. Team Handoff frontend (mock data)
4. Team Handoff backend (tables + real data)
5. Team Admin dashboard
6. Heat Triage frontend (priority popup + dashboard tabs)
7. Heat Triage backend (columns + digest + WhatsApp)
8. Search & Filters across all views
