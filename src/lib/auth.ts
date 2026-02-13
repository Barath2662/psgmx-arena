import { createClient } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

export type UserRole = 'ADMIN' | 'PLACEMENT_REP' | 'PLACEMENT_COORDINATOR' | 'STUDENT';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  supabaseId: string;
}

/**
 * Get the current authenticated user from Supabase + local DB.
 * Call this in API routes and Server Components.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const supabase = createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (!supabaseUser?.email) return null;

    // Find or create user in our DB
    let user = await prisma.user.findUnique({
      where: { email: supabaseUser.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: supabaseUser.email,
          supabaseId: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
          role: 'STUDENT',
        },
      });
    } else if (!user.supabaseId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { supabaseId: supabaseUser.id },
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      supabaseId: user.supabaseId || supabaseUser.id,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a role has admin-level access (ADMIN or PLACEMENT_REP)
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'PLACEMENT_REP';
}

/**
 * Check if a role can manage quizzes (all except STUDENT)
 */
export function canManageQuizzes(role: UserRole): boolean {
  return role !== 'STUDENT';
}

