-- Create a secure function for accepting connection requests
-- This runs with SECURITY DEFINER to bypass RLS and create reciprocal connections
CREATE OR REPLACE FUNCTION public.accept_connection_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
  v_requester record;
  v_accepter record;
  v_current_user_id uuid;
  v_my_connection_id uuid;
  v_their_connection_id uuid;
BEGIN
  -- Get the current user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get the request and verify the current user is the target
  SELECT * INTO v_request FROM connection_requests 
  WHERE id = p_request_id AND target_id = v_current_user_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or you are not authorized');
  END IF;

  -- Get requester profile
  SELECT * INTO v_requester FROM profiles WHERE id = v_request.requester_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requester profile not found');
  END IF;

  -- Get accepter profile
  SELECT * INTO v_accepter FROM profiles WHERE id = v_current_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your profile not found');
  END IF;

  -- Check if connections already exist to prevent duplicates
  -- Add requester to accepter's connections (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM connections 
    WHERE user_id = v_current_user_id AND connection_email = v_requester.email
  ) THEN
    INSERT INTO connections (
      user_id, connection_name, connection_email, connection_title, 
      connection_company, connection_phone, connection_avatar_url,
      connection_linkedin, connection_instagram, connection_gallery_photos
    ) VALUES (
      v_current_user_id, v_requester.full_name, v_requester.email, 
      v_requester.job_title, v_requester.company, v_requester.phone,
      v_requester.avatar_url, v_requester.linkedin_url, v_requester.instagram_url,
      v_requester.gallery_photos
    ) RETURNING id INTO v_my_connection_id;
  END IF;

  -- Add accepter to requester's connections (RECIPROCAL - if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM connections 
    WHERE user_id = v_request.requester_id AND connection_email = v_accepter.email
  ) THEN
    INSERT INTO connections (
      user_id, connection_name, connection_email, connection_title, 
      connection_company, connection_phone, connection_avatar_url,
      connection_linkedin, connection_instagram, connection_gallery_photos
    ) VALUES (
      v_request.requester_id, v_accepter.full_name, v_accepter.email, 
      v_accepter.job_title, v_accepter.company, v_accepter.phone,
      v_accepter.avatar_url, v_accepter.linkedin_url, v_accepter.instagram_url,
      v_accepter.gallery_photos
    ) RETURNING id INTO v_their_connection_id;
  END IF;

  -- Delete the request after successful acceptance
  DELETE FROM connection_requests WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true, 
    'requester_id', v_request.requester_id,
    'requester_name', v_requester.full_name,
    'requester_email', v_requester.email,
    'requester_avatar', v_requester.avatar_url,
    'accepter_name', v_accepter.full_name
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_connection_request(uuid) TO authenticated;

-- Create function for removing connection (also needs to be reciprocal)
CREATE OR REPLACE FUNCTION public.remove_connection_reciprocal(p_connection_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id uuid;
  v_current_user_email text;
  v_my_deleted integer;
  v_their_deleted integer;
BEGIN
  -- Get the current user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get current user's email
  SELECT email INTO v_current_user_email FROM profiles WHERE id = v_current_user_id;
  IF v_current_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your profile not found');
  END IF;

  -- Delete my connection to them
  DELETE FROM connections 
  WHERE user_id = v_current_user_id AND connection_email = p_connection_email;
  GET DIAGNOSTICS v_my_deleted = ROW_COUNT;

  -- Delete their connection to me (reciprocal)
  DELETE FROM connections 
  WHERE connection_email = v_current_user_email 
  AND user_id = (SELECT id FROM profiles WHERE email = p_connection_email LIMIT 1);
  GET DIAGNOSTICS v_their_deleted = ROW_COUNT;

  -- Also clean up any pending connection requests between us
  DELETE FROM connection_requests
  WHERE (requester_id = v_current_user_id AND target_id = (SELECT id FROM profiles WHERE email = p_connection_email))
     OR (target_id = v_current_user_id AND requester_id = (SELECT id FROM profiles WHERE email = p_connection_email));

  RETURN jsonb_build_object(
    'success', true, 
    'my_deleted', v_my_deleted,
    'their_deleted', v_their_deleted
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.remove_connection_reciprocal(text) TO authenticated;