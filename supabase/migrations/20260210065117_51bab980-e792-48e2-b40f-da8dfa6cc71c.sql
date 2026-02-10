
-- RPC function to create mutual connections when all plug participants accept
CREATE OR REPLACE FUNCTION public.complete_plug_connections(p_plug_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participants RECORD;
  v_all_accepted BOOLEAN;
  v_participant_ids UUID[];
  v_sender_id UUID;
  v_i INTEGER;
  v_j INTEGER;
  v_user_a UUID;
  v_user_b UUID;
  v_profile_a RECORD;
  v_profile_b RECORD;
  v_existing_count INTEGER;
  v_connections_created INTEGER := 0;
BEGIN
  -- Check if all participants have accepted
  SELECT 
    NOT EXISTS(
      SELECT 1 FROM plug_participants 
      WHERE plug_id = p_plug_id AND status != 'accepted'
    ) INTO v_all_accepted;
  
  IF NOT v_all_accepted THEN
    RETURN json_build_object('success', false, 'reason', 'not_all_accepted');
  END IF;

  -- Get all participant user_ids
  SELECT array_agg(user_id) INTO v_participant_ids
  FROM plug_participants
  WHERE plug_id = p_plug_id;

  -- Get sender_id
  SELECT sender_id INTO v_sender_id FROM plugs WHERE id = p_plug_id;

  -- Create bidirectional connections between all participants
  FOR v_i IN 1..array_length(v_participant_ids, 1) LOOP
    FOR v_j IN (v_i + 1)..array_length(v_participant_ids, 1) LOOP
      v_user_a := v_participant_ids[v_i];
      v_user_b := v_participant_ids[v_j];

      -- Get profiles
      SELECT id, full_name, email, job_title, company, phone, avatar_url 
        INTO v_profile_a FROM profiles WHERE id = v_user_a;
      SELECT id, full_name, email, job_title, company, phone, avatar_url 
        INTO v_profile_b FROM profiles WHERE id = v_user_b;

      -- Check if connection already exists (A -> B)
      SELECT COUNT(*) INTO v_existing_count FROM connections
        WHERE user_id = v_user_a AND connection_email = v_profile_b.email;
      
      IF v_existing_count = 0 THEN
        INSERT INTO connections (user_id, connection_name, connection_email, connection_title, connection_company, connection_phone, connection_avatar_url)
        VALUES (v_user_a, v_profile_b.full_name, v_profile_b.email, v_profile_b.job_title, v_profile_b.company, v_profile_b.phone, v_profile_b.avatar_url);
        v_connections_created := v_connections_created + 1;
      END IF;

      -- Check if connection already exists (B -> A)
      SELECT COUNT(*) INTO v_existing_count FROM connections
        WHERE user_id = v_user_b AND connection_email = v_profile_a.email;
      
      IF v_existing_count = 0 THEN
        INSERT INTO connections (user_id, connection_name, connection_email, connection_title, connection_company, connection_phone, connection_avatar_url)
        VALUES (v_user_b, v_profile_a.full_name, v_profile_a.email, v_profile_a.job_title, v_profile_a.company, v_profile_a.phone, v_profile_a.avatar_url);
        v_connections_created := v_connections_created + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- Update plug status to completed
  UPDATE plugs SET status = 'completed' WHERE id = p_plug_id;

  RETURN json_build_object('success', true, 'connections_created', v_connections_created);
END;
$$;
