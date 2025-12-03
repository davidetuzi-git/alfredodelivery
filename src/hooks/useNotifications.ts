import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  read_at: string | null;
  data: any;
  created_at: string;
}

export interface CommunicationPreferences {
  id: string;
  user_id: string;
  order_updates: boolean;
  promotions: boolean;
  newsletter: boolean;
  loyalty_updates: boolean;
  new_features: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [preferences, setPreferences] = useState<CommunicationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load notifications
      const { data: notifs } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (notifs) {
        setNotifications(notifs as unknown as UserNotification[]);
        setUnreadCount(notifs.filter((n: any) => !n.read).length);
      }

      // Load preferences
      const { data: prefs, error: prefsError } = await supabase
        .from('communication_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefs) {
        setPreferences(prefs as unknown as CommunicationPreferences);
      } else if (!prefsError || prefsError.code === 'PGRST116') {
        // Create default preferences
        const { data: newPrefs } = await supabase
          .from('communication_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (newPrefs) {
          setPreferences(newPrefs as unknown as CommunicationPreferences);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    }
  };

  const updatePreferences = async (updates: Partial<CommunicationPreferences>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !preferences) return false;

    const { error } = await supabase
      .from('communication_preferences')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (!error) {
      setPreferences(prev => prev ? { ...prev, ...updates } : null);
      return true;
    }
    return false;
  };

  return {
    notifications,
    preferences,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    refresh: loadData,
  };
}
