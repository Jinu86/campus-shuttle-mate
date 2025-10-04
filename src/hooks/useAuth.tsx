import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { 
  signUp, 
  signIn, 
  signOut as authSignOut, 
  getCurrentUserProfile,
  SignUpData,
  SignInData 
} from '@/services/authService';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Load user profile and check admin role when session changes
        if (session?.user) {
          try {
            const userProfile = await getCurrentUserProfile();
            setProfile(userProfile);
            await checkAdminRole(session.user.id);
          } catch (error) {
            console.error('Error loading user profile:', error);
            setProfile(null);
            setIsAdmin(false);
          }
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          const userProfile = await getCurrentUserProfile();
          setProfile(userProfile);
          await checkAdminRole(session.user.id);
        } catch (error) {
          console.error('Error loading user profile:', error);
          setProfile(null);
          setIsAdmin(false);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    }
  };

  const handleSignUp = async (data: SignUpData) => {
    try {
      const result = await signUp(data);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const handleSignIn = async (data: SignInData) => {
    try {
      const result = await signIn(data);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await authSignOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
    } catch (error) {
      throw error;
    }
  };

  const refreshProfile = async () => {
    try {
      if (user) {
        const userProfile = await getCurrentUserProfile();
        setProfile(userProfile);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    isAdmin,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refreshProfile,
  };
};
