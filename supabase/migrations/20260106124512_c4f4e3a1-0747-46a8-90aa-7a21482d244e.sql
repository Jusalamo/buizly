-- Create connection_requests table for mutual connection system
CREATE TABLE public.connection_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, target_id)
);

-- Enable RLS
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view requests where they are requester or target
CREATE POLICY "Users can view their own connection requests"
ON public.connection_requests
FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- Policy: Users can create requests where they are the requester
CREATE POLICY "Users can create connection requests"
ON public.connection_requests
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Policy: Target users can update requests (accept/decline)
CREATE POLICY "Target users can update connection requests"
ON public.connection_requests
FOR UPDATE
USING (auth.uid() = target_id);

-- Policy: Users can delete their own requests
CREATE POLICY "Users can delete their own requests"
ON public.connection_requests
FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- Add trigger for updated_at
CREATE TRIGGER update_connection_requests_updated_at
BEFORE UPDATE ON public.connection_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for connection requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests;

-- Add new notification types for connection requests
-- Note: We'll use existing notification_type enum values where possible
-- 'new_connection' can be used for connection requests