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

  const createPlug = useCallback(async (participantIds: string[], message?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (participantIds.length < 2) {
        throw new Error('At least 2 contacts are required');
      }

      if (participantIds.length > 5) {
        throw new Error('Maximum 5 contacts allowed');
      }

      // Get sender's profile
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

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

      // Add participants
      const participantInserts = participantIds.map(userId => ({
        plug_id: plug.id,
        user_id: userId
      }));

      const { error: participantsError } = await supabase
        .from('plug_participants')
        .insert(participantInserts);

      if (participantsError) throw participantsError;

      // Get participant names for notification
      const { data: participantProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', participantIds);

      const profileMap = new Map(participantProfiles?.map(p => [p.id, p.full_name]) || []);

      // Create notifications for all participants
      for (const participantId of participantIds) {
        const otherNames = participantIds
          .filter(id => id !== participantId)
          .map(id => profileMap.get(id) || 'Someone')
          .join(', ');

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
      }

      toast({
        title: 'Plug sent!',
        description: `Introduction sent to ${participantIds.length} contacts`
      });

      await fetchPlugs();
      return { success: true, plug };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
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
