'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  supabaseId: string;
  mustChangePassword: boolean;
  registerNumber: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  supabaseUser: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  async function fetchUser() {
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      setSupabaseUser(sbUser);

      if (sbUser?.email) {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);

          // Redirect to change-password if needed (and not already there)
          if (
            data.user?.mustChangePassword &&
            pathname !== '/auth/change-password'
          ) {
            router.push('/auth/change-password');
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      setSupabaseUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          fetchUser();
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
    window.location.href = '/';
  }

  return (
    <AuthContext.Provider value={{ user, supabaseUser, loading, signOut, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
