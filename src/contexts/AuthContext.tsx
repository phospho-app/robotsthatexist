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

    // Set up auth state listener first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log(
        "Auth state change:",
        event,
        session ? "session exists" : "no session"
      );

      // Handle auth events properly - avoid duplicate processing
      if (event === 'INITIAL_SESSION') {
        // Only process INITIAL_SESSION if we haven't initialized yet
        if (!sessionInitialized) {
          sessionInitialized = true;
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
      } else {
        // Process all other auth events (SIGNED_IN, SIGNED_OUT, etc.)
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

    // Small delay to let auth state listener initialize first
    setTimeout(initializeAuth, 100);

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
