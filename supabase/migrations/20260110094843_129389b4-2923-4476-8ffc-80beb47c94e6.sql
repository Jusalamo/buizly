-- Fix 1: RPC Authorization Bypass - Add auth.uid() validation to all functions

-- Recreate increment_connection_count with authorization check
CREATE OR REPLACE FUNCTION public.increment_connection_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  -- CRITICAL: Validate caller matches target user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only increment own connection count';
  END IF;
  
  INSERT INTO public.usage_tracking (user_id, month_year, connections_count)
  VALUES (p_user_id, TO_CHAR(NOW(), 'YYYY-MM'), 1)
  ON CONFLICT (user_id, month_year) 
  DO UPDATE SET 
    connections_count = public.usage_tracking.connections_count + 1,
    updated_at = NOW()
  RETURNING connections_count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$;

-- Recreate get_current_month_usage with authorization check
CREATE OR REPLACE FUNCTION public.get_current_month_usage(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- CRITICAL: Validate caller matches target user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only view own usage data';
  END IF;
  
  SELECT COALESCE(connections_count, 0) INTO v_count
  FROM public.usage_tracking
  WHERE user_id = p_user_id 
  AND month_year = TO_CHAR(NOW(), 'YYYY-MM');
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Recreate can_add_connection with authorization check
CREATE OR REPLACE FUNCTION public.can_add_connection(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.subscription_plan;
  v_count INTEGER;
BEGIN
  -- CRITICAL: Validate caller matches target user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only check own connection quota';
  END IF;
  
  SELECT COALESCE(plan, 'free') INTO v_plan
  FROM public.subscriptions
  WHERE user_id = p_user_id AND status = 'active';
  
  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;
  
  IF v_plan IN ('pro', 'business') THEN
    RETURN true;
  END IF;
  
  v_count := public.get_current_month_usage(p_user_id);
  RETURN v_count < 5;
END;
$$;

-- Fix 2: Create a safe view for profile searches (excludes PII)
DROP VIEW IF EXISTS public.profiles_search;
CREATE VIEW public.profiles_search AS
SELECT 
  id, 
  full_name, 
  avatar_url, 
  job_title, 
  company, 
  bio, 
  website,
  linkedin_url,
  created_at, 
  updated_at
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.profiles_search SET (security_invoker = true);

-- Fix 3: Notification spam prevention - block all client inserts
-- Only edge functions (using service role) can insert notifications
DROP POLICY IF EXISTS "Authenticated users can send notifications" ON public.notifications;

-- Block all direct client inserts - notifications must go through edge function
CREATE POLICY "Only service role can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (false);

-- Users can still read and update their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);