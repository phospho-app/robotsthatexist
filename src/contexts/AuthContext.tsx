"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // Always start in a loading state

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
      console.error(
        "An unexpected error occurred fetching the profile:",
        error
      );
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
      console.error("Error during GitHub sign-in process:", error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
      }
    } catch (error) {
      console.error("Error during sign-out process:", error);
    }
  };

  useEffect(() => {
    // Let Supabase handle session restoration and updates.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth state change event: ${event}`);

      // Update session and user state
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // Fetch profile if there is a user, otherwise clear it
      if (currentUser) {
        // Only fetch profile on initial sign-in or if the user changes
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          const profileData = await fetchProfile(currentUser.id);
          setProfile(profileData);
        }
      } else {
        setProfile(null);
      }

      // Once the first auth event is received, we are no longer loading.
      setLoading(false);
    });

    // Cleanup the subscription when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
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
