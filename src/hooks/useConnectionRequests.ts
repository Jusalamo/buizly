import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConnectionRequest {
  id: string;
  requester_id: string;
  target_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  requester_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    job_title: string | null;
    company: string | null;
  };
  target_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    job_title: string | null;
    company: string | null;
  };
}

export function useConnectionRequests() {
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all requests for this user
      const { data: requests, error } = await supabase
        .from('connection_requests')
        .select('*')
        .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!requests || requests.length === 0) {
        setIncomingRequests([]);
        setOutgoingRequests([]);
        setLoading(false);
        return;
      }

      // Get unique profile IDs
      const profileIds = new Set<string>();
      requests.forEach(r => {
        profileIds.add(r.requester_id);
        profileIds.add(r.target_id);
      });

      // Fetch profiles in one query
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, job_title, company')
        .in('id', Array.from(profileIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Map requests with profiles
      const enrichedRequests = requests.map(r => ({
        ...r,
        status: r.status as 'pending' | 'accepted' | 'declined',
        requester_profile: profileMap.get(r.requester_id),
        target_profile: profileMap.get(r.target_id),
      }));

      setIncomingRequests(enrichedRequests.filter(r => r.target_id === user.id && r.status === 'pending'));
      setOutgoingRequests(enrichedRequests.filter(r => r.requester_id === user.id));
    } catch (error) {
      console.error('Error fetching connection requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendRequest = useCallback(async (targetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if request already exists
      const { data: existing } = await supabase
        .from('connection_requests')
        .select('id, status')
        .or(`and(requester_id.eq.${user.id},target_id.eq.${targetId}),and(requester_id.eq.${targetId},target_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          toast({ title: 'Request already sent', description: 'Waiting for response' });
          return { success: false, status: 'pending' };
        }
        if (existing.status === 'accepted') {
          toast({ title: 'Already connected' });
          return { success: false, status: 'connected' };
        }
      }

      const { error } = await supabase
        .from('connection_requests')
        .insert({ requester_id: user.id, target_id: targetId });

      if (error) throw error;

      // Create notification for target user
      await supabase.from('notifications').insert({
        user_id: targetId,
        type: 'new_connection',
        title: 'New Connection Request',
        message: 'Someone wants to connect with you',
        data: { requester_id: user.id }
      });

      toast({ title: 'Request sent!', description: 'Waiting for approval' });
      await fetchRequests();
      return { success: true, status: 'pending' };
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { success: false, status: 'error' };
    }
  }, [fetchRequests, toast]);

  const acceptRequest = useCallback(async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the request
      const { data: request } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) throw new Error('Request not found');

      // Get requester profile
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', request.requester_id)
        .single();

      if (!requesterProfile) throw new Error('Requester profile not found');

      // Update request status
      const { error: updateError } = await supabase
        .from('connection_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add to connections (both ways)
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Add requester to my connections
      await supabase.from('connections').insert({
        user_id: user.id,
        connection_name: requesterProfile.full_name,
        connection_email: requesterProfile.email,
        connection_title: requesterProfile.job_title,
        connection_company: requesterProfile.company,
        connection_phone: requesterProfile.phone,
      });

      // Add me to requester's connections
      if (myProfile) {
        await supabase.from('connections').insert({
          user_id: request.requester_id,
          connection_name: myProfile.full_name,
          connection_email: myProfile.email,
          connection_title: myProfile.job_title,
          connection_company: myProfile.company,
          connection_phone: myProfile.phone,
        });
      }

      // Notify requester
      await supabase.from('notifications').insert({
        user_id: request.requester_id,
        type: 'new_connection',
        title: 'Connection Accepted!',
        message: `${myProfile?.full_name || 'Someone'} accepted your connection request`,
        data: { connection_id: user.id }
      });

      toast({ title: 'Connected!', description: `You're now connected with ${requesterProfile.full_name}` });
      await fetchRequests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [fetchRequests, toast]);

  const declineRequest = useCallback(async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: 'Request declined' });
      await fetchRequests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [fetchRequests, toast]);

  const getRequestStatus = useCallback((targetId: string): 'none' | 'pending' | 'accepted' | 'declined' => {
    const outgoing = outgoingRequests.find(r => r.target_id === targetId);
    if (outgoing) return outgoing.status;
    
    const incoming = incomingRequests.find(r => r.requester_id === targetId);
    if (incoming) return incoming.status;
    
    return 'none';
  }, [outgoingRequests, incomingRequests]);

  // Real-time subscription
  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('connection-requests-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connection_requests' },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  return {
    incomingRequests,
    outgoingRequests,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
    getRequestStatus,
    refetch: fetchRequests,
  };
}
