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
    email?: string;
  };
  target_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    job_title: string | null;
    company: string | null;
    email?: string;
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
          .eq('status', 'pending') // Only fetch pending requests
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

        // Update cache
        const otherId = r.requester_id === user.id ? r.target_id : r.requester_id;
        connectionStatusCache.set(otherId, 'pending');
        
        return req;
      });

      setIncomingRequests(enrichedRequests.filter(r => r.target_id === user.id));
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

      // Create notification via edge function (bypasses RLS, has rate limiting)
      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: targetId,
          type: 'new_connection',
          title: 'New Connection Request',
          message: `${myProfile?.full_name || 'Someone'} wants to connect with you`,
          data: { requester_id: user.id, requester_name: myProfile?.full_name, requester_avatar: myProfile?.avatar_url }
        }
      });

      // Send email notification for connection request
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', targetId)
        .single();

      if (targetProfile?.email) {
        try {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('email_notifications')
            .eq('user_id', targetId)
            .single();

          if (settings?.email_notifications !== false) {
            await supabase.functions.invoke('send-email', {
              body: {
                type: 'connectionRequest',
                to: targetProfile.email,
                payload: {
                  requesterName: myProfile?.full_name || 'Someone',
                  appUrl: `${window.location.origin}/discover`
                }
              }
            });
          }
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      }

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

      // Use the secure RPC function that handles reciprocal connections
      const { data, error: rpcError } = await supabase.rpc('accept_connection_request', {
        p_request_id: requestId
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw new Error(rpcError.message);
      }

      // Cast the result to the expected type
      const result = data as {
        success: boolean;
        error?: string;
        requester_id?: string;
        requester_name?: string;
        requester_email?: string;
        requester_avatar?: string;
        accepter_name?: string;
      } | null;

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to accept connection');
      }

      // Update local caches immediately
      if (result.requester_id) {
        connectionStatusCache.set(result.requester_id, 'accepted');
      }
      if (result.requester_email) {
        myConnectionsCache.add(result.requester_email.toLowerCase());
      }

      // Notify both users in parallel
      const notificationPromises = [
        // Notify requester that connection was accepted
        supabase.functions.invoke('create-notification', {
          body: {
            user_id: result.requester_id,
            type: 'new_connection',
            title: 'Connection Accepted!',
            message: `${result.accepter_name || 'Someone'} accepted your connection request`,
            data: { 
              connection_id: user.id, 
              accepter_name: result.accepter_name,
              accepter_avatar: null
            }
          }
        }),
        // Notify myself (for UI confirmation)
        supabase.functions.invoke('create-notification', {
          body: {
            user_id: user.id,
            type: 'new_connection',
            title: 'New Connection!',
            message: `You are now connected with ${result.requester_name}`,
            data: { 
              connection_id: result.requester_id,
              connection_name: result.requester_name,
              connection_avatar: result.requester_avatar
            }
          }
        })
      ];

      // Fire notifications without blocking
      Promise.all(notificationPromises).catch(err => console.error('Notification error:', err));

      // Send email notification for accepted connection
      if (result.requester_email && result.requester_id) {
        try {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('email_notifications')
            .eq('user_id', result.requester_id)
            .single();

          if (settings?.email_notifications !== false) {
            supabase.functions.invoke('send-email', {
              body: {
                type: 'connectionAccepted',
                to: result.requester_email,
                payload: {
                  accepterName: result.accepter_name || 'Someone',
                  appUrl: `${window.location.origin}/network`
                }
              }
            }).catch(err => console.error('Email error:', err));
          }
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      }

      toast({ title: 'Connected!', description: `You're now connected with ${result.requester_name}` });
      await fetchRequests();
    } catch (error: any) {
      console.error('Accept request error:', error);
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
        
      // Delete the request instead of just updating status
      const { error } = await supabase
        .from('connection_requests')
        .delete()
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
