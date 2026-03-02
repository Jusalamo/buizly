
-- =====================================================
-- Phase 1: Add priority/triage columns to connections
-- =====================================================
ALTER TABLE public.connections 
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'warm',
  ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- =====================================================
-- Phase 2: Teams table (no team_members references yet)
-- =====================================================
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view teams they created"
  ON public.teams FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their teams"
  ON public.teams FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their teams"
  ON public.teams FOR DELETE
  USING (auth.uid() = created_by);

-- =====================================================
-- Phase 3: Team members table
-- =====================================================
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Now add the teams policy that references team_members
CREATE POLICY "Team members can view their teams"
  ON public.teams FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = teams.id
    AND team_members.user_id = auth.uid()
  ));

-- Members can see other members in their team
CREATE POLICY "Team members can view teammates"
  ON public.team_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Team admins can insert members"
  ON public.team_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_members.team_id
    AND teams.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'admin'
  ));

CREATE POLICY "Team admins can update members"
  ON public.team_members FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_members.team_id
    AND teams.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'admin'
  ));

CREATE POLICY "Team admins can delete members"
  ON public.team_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = team_members.team_id
    AND teams.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.team_members AS tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'admin'
  ));

-- =====================================================
-- Phase 4: Handoffs table
-- =====================================================
CREATE TABLE public.handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL,
  to_user UUID NOT NULL,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_company TEXT,
  note TEXT,
  priority TEXT NOT NULL DEFAULT 'warm',
  status TEXT NOT NULL DEFAULT 'pending',
  card_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view handoffs they sent or received"
  ON public.handoffs FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users can create handoffs"
  ON public.handoffs FOR INSERT
  WITH CHECK (auth.uid() = from_user);

CREATE POLICY "Involved users can update handoffs"
  ON public.handoffs FOR UPDATE
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Senders can delete handoffs"
  ON public.handoffs FOR DELETE
  USING (auth.uid() = from_user);

CREATE TRIGGER update_handoffs_updated_at
  BEFORE UPDATE ON public.handoffs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Phase 5: Card images storage bucket
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('card-images', 'card-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload card images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their card images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their card images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'card-images' AND auth.uid()::text = (storage.foldername(name))[1]);
