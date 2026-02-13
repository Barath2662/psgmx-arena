import { createClient } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

export type UserRole = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  supabaseId: string;
  mustChangePassword: boolean;
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
          mustChangePassword: true,
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
      mustChangePassword: user.mustChangePassword,
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

