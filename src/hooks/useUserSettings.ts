import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UserSettings } from '@/types/database';

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use the secure RPC function that doesn't expose OAuth tokens
      const { data, error } = await supabase.rpc('get_user_settings_safe');

      if (error) throw error;

      if (data && data.length > 0) {
        // Map the RPC result to UserSettings format (tokens are null/not exposed)
        const settingsData = data[0];
        setSettings({
          ...settingsData,
          google_refresh_token: null, // Token is never exposed to client
          outlook_refresh_token: null, // Token is never exposed to client
        } as UserSettings);
      } else {
        // Create default settings if none exist
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id })
          .select('id, user_id, onboarding_completed, email_notifications, push_notifications, google_calendar_connected, outlook_calendar_connected, profile_visibility, theme, ical_url, created_at, updated_at')
          .single();

        if (insertError) throw insertError;
        setSettings({
          ...newSettings,
          google_refresh_token: null,
          outlook_refresh_token: null,
        } as UserSettings);
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    await updateSettings({ onboarding_completed: true });
  }, [updateSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    updateSettings,
    completeOnboarding,
    refetch: fetchSettings
  };
}
