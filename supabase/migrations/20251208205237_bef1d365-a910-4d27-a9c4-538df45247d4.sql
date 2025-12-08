-- Fix function search paths
CREATE OR REPLACE FUNCTION public.get_current_month_usage(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(connections_count, 0) INTO v_count
  FROM public.usage_tracking
  WHERE user_id = p_user_id 
  AND month_year = TO_CHAR(NOW(), 'YYYY-MM');
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_connection_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO public.usage_tracking (user_id, month_year, connections_count)
  VALUES (p_user_id, TO_CHAR(NOW(), 'YYYY-MM'), 1)
  ON CONFLICT (user_id, month_year) 
  DO UPDATE SET 
    connections_count = public.usage_tracking.connections_count + 1,
    updated_at = NOW()
  RETURNING connections_count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_add_connection(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan public.subscription_plan;
  v_count INTEGER;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;