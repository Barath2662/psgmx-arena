import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdminRole } from '@/lib/auth';
import { db, Tables } from '@/lib/db';

// GET /api/admin/analytics - Global analytics
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const [
      usersResult,
      instructorsResult,
      studentsResult,
      quizzesResult,
      sessionsResult,
      participantsResult,
      recentSessionsResult,
    ] = await Promise.all([
      db.from(Tables.users).select('*', { count: 'exact', head: true }),
      db.from(Tables.users).select('*', { count: 'exact', head: true }).eq('role', 'INSTRUCTOR'),
      db.from(Tables.users).select('*', { count: 'exact', head: true }).eq('role', 'STUDENT'),
      db.from(Tables.quizzes).select('*', { count: 'exact', head: true }),
      db.from(Tables.quiz_sessions).select('*', { count: 'exact', head: true }),
      db.from(Tables.session_participants).select('*', { count: 'exact', head: true }),
      db.from(Tables.quiz_sessions)
        .select('*, quiz:quizzes(title)')
        .order('createdAt', { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers: usersResult.count || 0,
        totalInstructors: instructorsResult.count || 0,
        totalStudents: studentsResult.count || 0,
        totalQuizzes: quizzesResult.count || 0,
        totalSessions: sessionsResult.count || 0,
        totalParticipations: participantsResult.count || 0,
      },
      recentSessions: recentSessionsResult.data || [],
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
