-- Create plugs table for contact introductions
CREATE TABLE public.plugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create plug_participants table
CREATE TABLE public.plug_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plug_id UUID NOT NULL REFERENCES plugs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  notified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.plugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plug_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for plugs
CREATE POLICY "Users can view plugs they sent"
ON public.plugs FOR SELECT
USING (sender_id = auth.uid());

CREATE POLICY "Users can view plugs they're part of"
ON public.plugs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM plug_participants 
  WHERE plug_participants.plug_id = plugs.id 
  AND plug_participants.user_id = auth.uid()
));

CREATE POLICY "Users can create plugs"
ON public.plugs FOR INSERT
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own plugs"
ON public.plugs FOR UPDATE
USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own plugs"
ON public.plugs FOR DELETE
USING (sender_id = auth.uid());

-- RLS policies for plug_participants
CREATE POLICY "Users can view participants for their plugs"
ON public.plug_participants FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM plugs 
    WHERE plugs.id = plug_participants.plug_id 
    AND plugs.sender_id = auth.uid()
  )
);

CREATE POLICY "Plug senders can add participants"
ON public.plug_participants FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM plugs 
  WHERE plugs.id = plug_participants.plug_id 
  AND plugs.sender_id = auth.uid()
));

CREATE POLICY "Participants can update their own response"
ON public.plug_participants FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Plug senders can delete participants"
ON public.plug_participants FOR DELETE
USING (EXISTS (
  SELECT 1 FROM plugs 
  WHERE plugs.id = plug_participants.plug_id 
  AND plugs.sender_id = auth.uid()
));

-- Add plug_request to notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'plug_request';

-- Enable realtime for plugs
ALTER PUBLICATION supabase_realtime ADD TABLE public.plugs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plug_participants;

-- Add indexes for performance
CREATE INDEX idx_plugs_sender ON public.plugs(sender_id);
CREATE INDEX idx_plug_participants_plug ON public.plug_participants(plug_id);
CREATE INDEX idx_plug_participants_user ON public.plug_participants(user_id);