

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { Session, User, RealtimeChannel } from '@supabase/supabase-js';
import type { Provider } from '@supabase/supabase-js';
import { Profile } from '../types';

export interface PresenceState {
  [key: string]: {
    presence_ref: string;
    online_at: string;
  }[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signUpWithPassword: (email: string, password: string, fullName: string) => Promise<any>;
  signInWithOAuth: (provider: Provider) => Promise<any>;
  verifyOtp: (email: string, token: string) => Promise<any>;
  resendConfirmationEmail: (email: string) => Promise<any>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
  isOnline: (userId: string) => boolean;
  isBlocked: (userId: string) => boolean;
  toggleBlock: (userId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// NOTE: This is a placeholder public key. In a real application, you should generate your own
// VAPID keys (e.g., using the `web-push` library) and store them securely.
const VAPID_PUBLIC_KEY = 'BNo-zNSL13n6T88_T-4LajBw-5zJ8gLBlsWfPmm2Q53z-m7iFpdSCqM4zCqFb49z1qH5Mtl-7d2d3y-w1HkFpGc';

const PROFILE_COLUMNS = 'id, full_name, avatar_url, bio, status, cover_photo_url, gender, place_of_origin, website, contact_info, education_level, gender_privacy, place_of_origin_privacy, website_privacy, contact_info_privacy, education_level_privacy, message_privacy, read_receipts_enabled, blocked_users';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<PresenceState>({});

  const checkProfileStatus = (profileToCheck: Profile): Profile | null => {
    if (profileToCheck.status === 'banned') {
      supabase.auth.signOut();
      alert('تم حظر هذا الحساب.');
      return null;
    }
    if (profileToCheck.status === 'suspended') {
      supabase.auth.signOut();
      alert('تم تعليق هذا الحساب مؤقتاً.');
      return null;
    }
    return profileToCheck;
  };

  const getOrCreateProfile = async (authUser: User): Promise<Profile | null> => {
    // 1. Try to fetch the profile
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error.message);
      return null;
    }

    if (data) {
      return checkProfileStatus(data as Profile);
    }
    
    // 2. If no profile, create one.
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'مستخدم جديد',
        avatar_url: authUser.user_metadata?.avatar_url,
      })
      .select(PROFILE_COLUMNS)
      .single();
    
    if (insertError) {
      console.error('Error creating profile:', insertError.message);
      return null;
    }

    return checkProfileStatus(newProfile as Profile);
  };

  // Effect for handling Supabase auth state changes
  useEffect(() => {
    // onAuthStateChange fires on load and on every auth event.
    // This is the source of truth for session and user state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false); // Auth state is now determined
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Effect for fetching user profile when user object changes
  useEffect(() => {
    if (user) {
      setProfileLoading(true);
      getOrCreateProfile(user)
        .then(setProfile)
        .finally(() => setProfileLoading(false));
    } else {
      setProfile(null);
    }
  }, [user]);
  
  // Presence tracking useEffect
  useEffect(() => {
    let presenceChannel: RealtimeChannel | null = null;
    if (user && profile) {
        presenceChannel = supabase.channel('online-users', {
            config: {
                presence: { key: user.id },
            },
        });

        presenceChannel
          .on('presence', { event: 'sync' }, () => {
              const newState = presenceChannel!.presenceState();
              setOnlineUsers(newState as PresenceState);
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
              setOnlineUsers(prev => ({
                  ...prev,
                  [key]: newPresences,
              }));
          })
          .on('presence', { event: 'leave' }, ({ key }) => {
              setOnlineUsers(prev => {
                  const newState = { ...prev };
                  delete newState[key];
                  return newState;
              });
          });

        presenceChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel!.track({ online_at: new Date().toISOString() });
            }
        });
    }

    return () => {
        if (presenceChannel) {
            presenceChannel.untrack();
            supabase.removeChannel(presenceChannel);
        }
    };
  }, [user, profile]);

  // Effect for setting up Push Notifications
  useEffect(() => {
    if (!user) return;

    const setupPushNotifications = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('Push notification permission not granted.');
            return;
          }

          let subscription = await registration.pushManager.getSubscription();

          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
          }
          
          const { error } = await supabase
            .from('push_subscriptions')
            .upsert(
              {
                endpoint: subscription.endpoint,
                user_id: user.id,
                subscription_details: subscription.toJSON(),
              },
              { onConflict: 'endpoint' }
            );

          if (error) {
            console.error('Error saving push subscription:', error);
          }
        } catch (err) {
          console.error('Error setting up push notifications:', err);
        }
      }
    };
    
    // Delay setup slightly to not block initial render and to ask for permission at a better time
    setTimeout(setupPushNotifications, 5000);

  }, [user]);
  
  const refreshProfile = async () => {
    if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error refreshing profile:', error.message);
        } else {
          setProfile(data as Profile);
        }
    }
  }

  const signInWithPassword = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithPassword = async (email: string, password: string, fullName: string) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
  };

  const signInWithOAuth = async (provider: Provider) => {
    return supabase.auth.signInWithOAuth({ provider });
  }

  const verifyOtp = async (email: string, token: string) => {
    return supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
  };
  
  const resendConfirmationEmail = async (email: string) => {
    return supabase.auth.resend({ type: 'signup', email });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isOnline = (userId: string) => !!onlineUsers[userId];
  
  const isBlocked = (userId: string) => {
    return profile?.blocked_users?.includes(userId) ?? false;
  };

  const toggleBlock = async (userId: string) => {
    if (!profile) return;

    const currentlyBlocked = profile.blocked_users?.includes(userId) ?? false;
    const newBlockedList = currentlyBlocked
        ? profile.blocked_users?.filter(id => id !== userId)
        : [...(profile.blocked_users || []), userId];

    const originalBlockedList = profile.blocked_users;
    setProfile(p => p ? { ...p, blocked_users: newBlockedList } : null); // Optimistic update

    const { error } = await supabase
        .from('profiles')
        .update({ blocked_users: newBlockedList })
        .eq('id', profile.id);

    if (error) {
        setProfile(p => p ? { ...p, blocked_users: originalBlockedList } : null); // Revert on error
        console.error("Failed to update block list", error);
        alert(`فشل تحديث قائمة الحظر: ${error.message}`);
    }
  };


  const value = {
    session,
    user,
    profile,
    // The app is loading if we are waiting for the auth state OR
    // if we have a user but are still fetching their profile.
    loading: authLoading || (!!user && profileLoading),
    signInWithPassword,
    signUpWithPassword,
    signInWithOAuth,
    verifyOtp,
    resendConfirmationEmail,
    signOut,
    refreshProfile,
    isOnline,
    isBlocked,
    toggleBlock,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};