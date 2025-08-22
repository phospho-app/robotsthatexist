"use client";

import type React from "react";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

interface AuthContextType {
  session: Session | null | false; // false indicates no session (loaded), null indicates loading
  user: User | null;
  profile: Profile | null;
  loading: boolean; // computed from session state
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | false>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const signInWithGitHub = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Error signing in with GitHub:", error);
      }
    } catch (error) {
      console.error("Error signing in with GitHub:", error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    let mounted = true;
    let sessionInitialized = false;
    let isHandlingAuthEvent = false;

    // Set up auth state listener first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || isHandlingAuthEvent) return;

      isHandlingAuthEvent = true;
      
      try {
        console.log(
          "Auth state change:",
          event,
          session ? "session exists" : "no session",
          "Tab:", document.visibilityState
        );

        // Handle auth events properly - avoid duplicate processing
        if (event === 'INITIAL_SESSION') {
          // Always process INITIAL_SESSION to set initial state
          if (!sessionInitialized) {
            sessionInitialized = true;
            
            // Validate session before using it
            if (session) {
              try {
                // Quick session validation - try a simple query
                await supabase.from('profiles').select('id').limit(1);
                console.log('Auth: Session validated successfully');
              } catch (error) {
                console.warn('Auth: Session invalid, clearing:', error);
                session = null;
              }
            }
            
            setSession(session || false);
            setUser(session?.user ?? null);

            if (session?.user) {
              const profileData = await fetchProfile(session.user.id);
              if (mounted) {
                setProfile(profileData);
              }
            } else {
              setProfile(null);
            }
          }
        } else if (event === 'SIGNED_IN' && sessionInitialized) {
          // If we get SIGNED_IN right after INITIAL_SESSION with same user, skip duplicate processing
          const currentUserId = user?.id;
          const newUserId = session?.user?.id;
          
          if (currentUserId === newUserId && session) {
            // Same user, just update session silently (server validation completed)
            setSession(session);
            console.log('Auth: Server validation completed for existing session');
            return;
          }
          
          // Different user or new login, process normally
          setSession(session || false);
          setUser(session?.user ?? null);

          if (session?.user) {
            const profileData = await fetchProfile(session.user.id);
            if (mounted) {
              setProfile(profileData);
            }
          } else {
            setProfile(null);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Handle token refresh - update session but don't refetch profile
          console.log('Auth: Token refreshed');
          setSession(session || false);
        } else {
          // Process all other auth events (SIGNED_OUT, etc.)
          setSession(session || false);
          setUser(session?.user ?? null);

          if (session?.user) {
            const profileData = await fetchProfile(session.user.id);
            if (mounted) {
              setProfile(profileData);
            }
          } else {
            setProfile(null);
          }
        }
      } finally {
        isHandlingAuthEvent = false;
      }
    });

    // Initialize auth with timeout and retry
    const initializeAuth = async () => {
      if (sessionInitialized) return;
      
      try {
        // Add timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout')), 10000)
        );

        const result = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as { data: { session: Session | null } };
        
        const { data: { session } } = result;
        
        if (mounted && !sessionInitialized) {
          sessionInitialized = true;
          setSession(session || false);
          setUser(session?.user ?? null);

          if (session?.user) {
            const profileData = await fetchProfile(session.user.id);
            if (mounted) {
              setProfile(profileData);
            }
          }
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
        if (mounted && !sessionInitialized) {
          sessionInitialized = true;
          setSession(false);
        }
      }
    };

    // Add storage event listener for cross-tab synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'supabase.auth.token' && e.newValue !== e.oldValue) {
        console.log('Auth: Storage change detected from another tab');
        // Let Supabase handle the storage change naturally
        // This will trigger the auth state change listener
      }
    };

    // Add visibility change handler to detect when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sessionInitialized) {
        console.log('Auth: Tab became visible, checking session');
        // Refresh session when tab becomes active
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (currentSession && session && currentSession.access_token !== session.access_token) {
              console.log('Auth: Session changed in another tab, updating');
              setSession(currentSession);
            }
          }).catch(console.warn);
        }, 100);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Small delay to let auth state listener initialize first
    setTimeout(initializeAuth, 100);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading: session === null, // computed loading state from session
        signInWithGitHub,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
