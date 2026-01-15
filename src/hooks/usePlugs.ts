import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Plug {
  id: string;
  sender_id: string;
  message: string | null;
  status: 'pending' | 'completed' | 'expired';
  created_at: string;
  participants?: PlugParticipant[];
  sender_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface PlugParticipant {
  id: string;
  plug_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  notified_at: string;
  responded_at: string | null;
  user_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    job_title: string | null;
    company: string | null;
  };
}

export function usePlugs() {
  const [sentPlugs, setSentPlugs] = useState<Plug[]>([]);
  const [receivedPlugs, setReceivedPlugs] = useState<Plug[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlugs = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch plugs I sent
      const { data: sent, error: sentError } = await supabase
        .from('plugs')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      // Fetch plugs I'm a participant in
      const { data: participantData, error: participantError } = await supabase
        .from('plug_participants')
        .select('plug_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      const plugIds = participantData?.map(p => p.plug_id) || [];
      
      let received: Plug[] = [];
      if (plugIds.length > 0) {
        const { data: receivedData, error: receivedError } = await supabase
          .from('plugs')
          .select('*')
          .in('id', plugIds)
          .neq('sender_id', user.id)
          .order('created_at', { ascending: false });

        if (receivedError) throw receivedError;
        received = (receivedData || []).map(p => ({
          ...p,
          status: p.status as 'pending' | 'completed' | 'expired'
        }));
      }

      // Fetch participants for all plugs
      const allPlugIds = [...(sent?.map(p => p.id) || []), ...received.map(p => p.id)];
      
      if (allPlugIds.length > 0) {
        const { data: allParticipants } = await supabase
          .from('plug_participants')
          .select('*')
          .in('plug_id', allPlugIds);

        // Get unique user IDs
        const userIds = new Set<string>();
        allParticipants?.forEach(p => userIds.add(p.user_id));
        (sent || []).forEach(p => userIds.add(p.sender_id));
        received.forEach(p => userIds.add(p.sender_id));

        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, job_title, company')
          .in('id', Array.from(userIds));

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Enrich participants
        const enrichedParticipants = allParticipants?.map(p => ({
          ...p,
          status: p.status as 'pending' | 'accepted' | 'declined',
          user_profile: profileMap.get(p.user_id)
        })) || [];

        // Attach to plugs
        const enrichSent = (sent || []).map(plug => ({
          ...plug,
          status: plug.status as 'pending' | 'completed' | 'expired',
          participants: enrichedParticipants.filter(p => p.plug_id === plug.id),
          sender_profile: profileMap.get(plug.sender_id)
        }));

        const enrichReceived = received.map(plug => ({
          ...plug,
          status: plug.status as 'pending' | 'completed' | 'expired',
          participants: enrichedParticipants.filter(p => p.plug_id === plug.id),
          sender_profile: profileMap.get(plug.sender_id)
        }));

        setSentPlugs(enrichSent);
        setReceivedPlugs(enrichReceived);
      } else {
        setSentPlugs([]);
        setReceivedPlugs([]);
      }
    } catch (error) {
      console.error('Error fetching plugs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPlug = useCallback(async (connectionIds: string[], message?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (connectionIds.length < 2) {
        throw new Error('At least 2 contacts are required');
      }

      if (connectionIds.length > 5) {
        throw new Error('Maximum 5 contacts allowed');
      }

      // Get sender's profile
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      // Get connection details to find associated user emails
      const { data: connectionDetails, error: connError } = await supabase
        .from('connections')
        .select('id, connection_name, connection_email')
        .in('id', connectionIds);

      if (connError) throw connError;

      // Find user profiles by email (connections might be linked to real users)
      const emails = connectionDetails?.map(c => c.connection_email).filter(Boolean) || [];
      
      let userProfiles: { id: string; email: string; full_name: string }[] = [];
      if (emails.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('email', emails);
        userProfiles = profiles || [];
      }

      const emailToUserId = new Map(userProfiles.map(p => [p.email, p.id]));

      // Create plug
      const { data: plug, error: plugError } = await supabase
        .from('plugs')
        .insert({
          sender_id: user.id,
          message: message || null
        })
        .select()
        .single();

      if (plugError) throw plugError;

      // Add participants - only those who have user accounts
      const participantUserIds: string[] = [];
      const connectionNamesForNotification: string[] = [];
      
      for (const conn of connectionDetails || []) {
        const userId = conn.connection_email ? emailToUserId.get(conn.connection_email) : null;
        if (userId) {
          participantUserIds.push(userId);
        }
        connectionNamesForNotification.push(conn.connection_name);
      }

      if (participantUserIds.length > 0) {
        const participantInserts = participantUserIds.map(userId => ({
          plug_id: plug.id,
          user_id: userId
        }));

        const { error: participantsError } = await supabase
          .from('plug_participants')
          .insert(participantInserts);

        if (participantsError) {
          console.error('Participant insert error:', participantsError);
          // Continue even if participants fail - the plug was created
        }

        // Create notifications for users who have accounts
        const profileMap = new Map(userProfiles.map(p => [p.id, p.full_name]));
        
        for (const participantId of participantUserIds) {
          const otherNames = participantUserIds
            .filter(id => id !== participantId)
            .map(id => profileMap.get(id) || 'Someone')
            .join(', ');

          try {
            await supabase.functions.invoke('create-notification', {
              body: {
                user_id: participantId,
                type: 'plug_request',
                title: 'New Introduction',
                message: `${myProfile?.full_name || 'Someone'} wants to introduce you to ${otherNames}`,
                data: {
                  plug_id: plug.id,
                  sender_id: user.id,
                  sender_name: myProfile?.full_name
                }
              }
            });
          } catch (notifError) {
            console.error('Notification error:', notifError);
          }
        }
      }

      toast({
        title: 'Plug sent!',
        description: `Introduction created for ${connectionNamesForNotification.join(', ')}`
      });

      await fetchPlugs();
      return { success: true, plug };
    } catch (error: any) {
      console.error('Create plug error:', error);
      toast({
        title: 'Error creating plug',
        description: error.message || 'Failed to create introduction',
        variant: 'destructive'
      });
      return { success: false };
    }
  }, [fetchPlugs, toast]);

  const respondToPlug = useCallback(async (plugId: string, accept: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('plug_participants')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('plug_id', plugId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: accept ? 'Introduction accepted!' : 'Introduction declined'
      });

      await fetchPlugs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }, [fetchPlugs, toast]);

  // Real-time subscription
  useEffect(() => {
    fetchPlugs();

    const channel = supabase
      .channel('plugs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plugs' },
        () => fetchPlugs()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plug_participants' },
        () => fetchPlugs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPlugs]);

  return {
    sentPlugs,
    receivedPlugs,
    loading,
    createPlug,
    respondToPlug,
    refetch: fetchPlugs
  };
}
