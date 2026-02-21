import { createClient } from '@/lib/supabase-server';
import { db, Tables, generateId } from '@/lib/db';

export type UserRole = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  supabaseId: string;
  mustChangePassword: boolean;
  registerNumber: string | null;
}

/**
 * Get the current authenticated user from Supabase Auth + DB.
 * Call this in API routes and Server Components.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser?.email) return null;

    // Find user in our DB
    let { data: user, error } = await db
      .from(Tables.users)
      .select('*')
      .eq('email', supabaseUser.email)
      .single();

    if (error || !user) {
      // Create user on first login
      const { data: newUser, error: createError } = await db
        .from(Tables.users)
        .insert({
          id: generateId(),
          email: supabaseUser.email,
          supabaseId: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
          role: 'STUDENT',
          mustChangePassword: true,
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !newUser) return null;
      user = newUser;
    } else if (!user.supabaseId) {
      // Link Supabase ID if missing
      const { data: updated } = await db
        .from(Tables.users)
        .update({ supabaseId: supabaseUser.id })
        .eq('id', user.id)
        .select()
        .single();
      if (updated) user = updated;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      supabaseId: user.supabaseId || supabaseUser.id,
      mustChangePassword: user.mustChangePassword,
      registerNumber: user.registerNumber || null,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a role has admin-level access
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'ADMIN';
}

/**
 * Check if a role can manage quizzes (ADMIN or INSTRUCTOR)
 */
export function canManageQuizzes(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'INSTRUCTOR';
}

