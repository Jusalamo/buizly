-- Enable realtime for connections table (if not already)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for meetings table (if not already)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for connection_requests table (if not already)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;