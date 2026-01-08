import { useState, useEffect, useCallback, useRef } from 'react';
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

// Cache for connection statuses - persists across component mounts
const connectionStatusCache = new Map<string, 'none' | 'pending' | 'accepted' | 'declined'>();
const myConnectionsCache = new Set<string>(); // Emails of users I'm connected with

export function useConnectionRequests() {
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const fetchingRef = useRef(false);

  const fetchRequests = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        fetchingRef.current = false;
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      // Parallel fetch: requests AND my actual connections
      const [requestsResult, connectionsResult] = await Promise.all([
        supabase
          .from('connection_requests')
          .select('*')
          .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('connections')
          .select('connection_email')
          .eq('user_id', user.id)
      ]);

      // Update connections cache - these are ACTUAL connections
      myConnectionsCache.clear();
      if (connectionsResult.data) {
        connectionsResult.data.forEach(c => {
          if (c.connection_email) {
            myConnectionsCache.add(c.connection_email.toLowerCase());
          }
        });
      }

      const requests = requestsResult.data || [];

      if (requests.length === 0) {
        connectionStatusCache.clear();
        setIncomingRequests([]);
        setOutgoingRequests([]);
        setLoading(false);
        fetchingRef.current = false;
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
        .select('id, full_name, avatar_url, job_title, company, email')
        .in('id', Array.from(profileIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Map requests with profiles and update status cache
      const enrichedRequests = requests.map(r => {
        const req = {
          ...r,
          status: r.status as 'pending' | 'accepted' | 'declined',
          requester_profile: profileMap.get(r.requester_id),
          target_profile: profileMap.get(r.target_id),
        };

        // Update cache: Check if user is requester or target
        const otherId = r.requester_id === user.id ? r.target_id : r.requester_id;
        
        // Only set status if actually accepted and still connected
        if (r.status === 'accepted') {
          const otherProfile = profileMap.get(otherId);
          const isActuallyConnected = otherProfile?.email && 
            myConnectionsCache.has(otherProfile.email.toLowerCase());
          
          if (isActuallyConnected) {
            connectionStatusCache.set(otherId, 'accepted');
          } else {
            // Request was accepted but connection was removed
            connectionStatusCache.set(otherId, 'none');
          }
        } else if (r.status === 'pending') {
          connectionStatusCache.set(otherId, 'pending');
        } else if (r.status === 'declined') {
          connectionStatusCache.set(otherId, 'declined');
        }
        
        return req;
      });

      setIncomingRequests(enrichedRequests.filter(r => r.target_id === user.id && r.status === 'pending'));
      setOutgoingRequests(enrichedRequests.filter(r => r.requester_id === user.id));
    } catch (error) {
      console.error('Error fetching connection requests:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const sendRequest = useCallback(async (targetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current user's profile for notification
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

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
          // Check if actually still connected
          const { data: targetProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', targetId)
            .single();
          
          if (targetProfile?.email && myConnectionsCache.has(targetProfile.email.toLowerCase())) {
            toast({ title: 'Already connected' });
            return { success: false, status: 'connected' };
          }
          // Connection was removed, delete old request and allow new one
          await supabase
            .from('connection_requests')
            .delete()
            .eq('id', existing.id);
        }
        if (existing.status === 'declined') {
          // Allow re-requesting after decline - delete old request
          await supabase
            .from('connection_requests')
            .delete()
            .eq('id', existing.id);
        }
      }

      const { error } = await supabase
        .from('connection_requests')
        .insert({ requester_id: user.id, target_id: targetId });

      if (error) throw error;

      // Create notification for target user with requester info
      await supabase.from('notifications').insert({
        user_id: targetId,
        type: 'new_connection',
        title: 'New Connection Request',
        message: `${myProfile?.full_name || 'Someone'} wants to connect with you`,
        data: { requester_id: user.id, requester_name: myProfile?.full_name, requester_avatar: myProfile?.avatar_url }
      });

      // Update local cache immediately for instant UI feedback
      connectionStatusCache.set(targetId, 'pending');
      
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

      // Update local caches immediately
      connectionStatusCache.set(request.requester_id, 'accepted');
      if (requesterProfile.email) {
        myConnectionsCache.add(requesterProfile.email.toLowerCase());
      }

      // Notify requester that connection was accepted
      await supabase.from('notifications').insert({
        user_id: request.requester_id,
        type: 'new_connection',
        title: 'Connection Accepted!',
        message: `${myProfile?.full_name || 'Someone'} accepted your connection request`,
        data: { 
          connection_id: user.id, 
          accepter_name: myProfile?.full_name,
          accepter_avatar: myProfile?.avatar_url
        }
      });

      // Notify myself (optional - for UI confirmation)
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'new_connection',
        title: 'New Connection!',
        message: `You are now connected with ${requesterProfile.full_name}`,
        data: { 
          connection_id: request.requester_id,
          connection_name: requesterProfile.full_name,
          connection_avatar: requesterProfile.avatar_url
        }
      });

      toast({ title: 'Connected!', description: `You're now connected with ${requesterProfile.full_name}` });
      await fetchRequests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [fetchRequests, toast]);

  const declineRequest = useCallback(async (requestId: string) => {
    try {
      const { data: request } = await supabase
        .from('connection_requests')
        .select('requester_id')
        .eq('id', requestId)
        .single();
        
      const { error } = await supabase
        .from('connection_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      // Update cache
      if (request) {
        connectionStatusCache.set(request.requester_id, 'declined');
      }

      toast({ title: 'Request declined' });
      await fetchRequests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [fetchRequests, toast]);

  // Check actual connection status - considers both requests AND actual connections
  const getRequestStatus = useCallback((targetId: string): 'none' | 'pending' | 'accepted' | 'declined' => {
    // First check cache
    const cached = connectionStatusCache.get(targetId);
    if (cached) return cached;

    // Check outgoing requests
    const outgoing = outgoingRequests.find(r => r.target_id === targetId);
    if (outgoing) return outgoing.status;
    
    // Check incoming requests
    const incoming = incomingRequests.find(r => r.requester_id === targetId);
    if (incoming) return incoming.status;
    
    return 'none';
  }, [outgoingRequests, incomingRequests]);

  // Check if connected via email (more reliable for removal detection)
  const isConnectedWithEmail = useCallback((email: string): boolean => {
    return myConnectionsCache.has(email.toLowerCase());
  }, []);

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connections' },
        () => {
          // Also refetch when connections change (removal detection)
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
    isConnectedWithEmail,
    refetch: fetchRequests,
  };
}
