import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useRouter, useSegments } from "expo-router";

type Role = "resident" | "guard" | "admin" | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: Role;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  isLoading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // 2. Listen for auth changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchRole(session.user.id);
        } else {
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
        
      if (error) {
        console.error("Error fetching role:", error.message);
      }
      
      setRole(data?.role as Role);
    } catch (error) {
      console.error("Fetch role exception:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Routing based on auth state and role
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inPlayground = segments[0] === "playground";

    if (!session) {
      // Not logged in
      if (!inAuthGroup && !inPlayground && segments[0] !== undefined) {
        // Redirect to login if trying to access protected routes
        router.replace("/(auth)");
      }
    } else if (session && role) {
      // Logged in with a role
      if (inAuthGroup || segments[0] === undefined) {
        // Redirect to correct dashboard
        if (role === "admin") {
          router.replace("/(admin)");
        } else if (role === "guard") {
          router.replace("/(guard)");
        } else if (role === "resident") {
          router.replace("/(resident)");
        }
      } else {
        // Prevent users from accessing other roles' dashboards
        const currentGroup = segments[0]; // e.g. "(resident)"
        const expectedGroup = `(${role})`;
        if (currentGroup !== expectedGroup && currentGroup !== "playground") {
          router.replace(`/${expectedGroup}` as any);
        }
      }
    }
  }, [session, role, isLoading, segments]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
