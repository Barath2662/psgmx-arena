import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

/**
 * Supabase Admin client for server-side DB operations.
 * Uses service_role key — NEVER expose to client.
 * Replaces Prisma ORM for all database operations.
 * 
 * We use `createClient<any, 'public', any>` so TypeScript accepts
 * any table name and any data shape without generated types.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const globalForSupabase = globalThis as unknown as {
  supabaseDb: SupabaseClient | undefined;
};

export const db: SupabaseClient =
  globalForSupabase.supabaseDb ??
  createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: { schema: 'public' },
  });

if (process.env.NODE_ENV !== 'production') globalForSupabase.supabaseDb = db;

// ─── Helper: generate cuid-like IDs ──────────────────────
// Supabase tables use cuid() default in Prisma — but Prisma generates IDs
// client-side. When using Supabase client directly, we must generate IDs.
export function generateId(): string {
  return 'c' + nanoid(24);
}

/**
 * Table name mapping (Prisma @@map names)
 */
export const Tables = {
  users: 'users',
  quizzes: 'quizzes',
  quiz_tags: 'quiz_tags',
  questions: 'questions',
  quiz_sessions: 'quiz_sessions',
  session_questions: 'session_questions',
  session_participants: 'session_participants',
  student_answers: 'student_answers',
  student_powerups: 'student_powerups',
  quiz_analytics: 'quiz_analytics',
  abuse_reports: 'abuse_reports',
  password_reset_requests: 'password_reset_requests',
} as const;
