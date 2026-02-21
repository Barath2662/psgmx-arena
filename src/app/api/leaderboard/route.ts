import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db, Tables } from '@/lib/db';

// GET /api/leaderboard?type=session&id=xxx  — per-test leaderboard
// GET /api/leaderboard?type=weekly           — weekly leaderboard
// GET /api/leaderboard?type=overall          — all-time leaderboard
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'overall';
    const sessionId = searchParams.get('id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    // ── Per-test leaderboard ──
    if (type === 'session' && sessionId) {
      const { data: participants, error } = await db
        .from(Tables.session_participants)
        .select(`
          *,
          user:users(id, name, email),
          session:quiz_sessions(
            quiz:quizzes(title),
            startedAt, endedAt
          )
        `)
        .eq('sessionId', sessionId)
        .order('totalScore', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return NextResponse.json({
        type: 'session',
        sessionId,
        quizTitle: participants?.[0]?.session?.quiz?.title || '',
        leaderboard: (participants || []).map((p: any, i: number) => ({
          rank: i + 1,
          userId: p.userId,
          name: p.user?.name || p.guestName || 'Anonymous',
          email: p.user?.email || null,
          score: p.totalScore,
          correctCount: p.correctCount,
          streak: p.streak,
        })),
      });
    }

    // ── Weekly leaderboard ──
    if (type === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get all participants from last week with userId
      const { data: weeklyParticipants, error } = await db
        .from(Tables.session_participants)
        .select('userId, totalScore, streak')
        .not('userId', 'is', null)
        .gte('joinedAt', weekAgo.toISOString());

      if (error) throw error;

      // Group by userId manually
      const userScores = new Map<string, { totalScore: number; count: number; maxStreak: number }>();
      (weeklyParticipants || []).forEach((p: any) => {
        if (!p.userId) return;
        const existing = userScores.get(p.userId) || { totalScore: 0, count: 0, maxStreak: 0 };
        existing.totalScore += p.totalScore || 0;
        existing.count += 1;
        existing.maxStreak = Math.max(existing.maxStreak, p.streak || 0);
        userScores.set(p.userId, existing);
      });

      // Sort by total score and limit
      const sorted = Array.from(userScores.entries())
        .sort((a, b) => b[1].totalScore - a[1].totalScore)
        .slice(0, limit);

      // Fetch user details
      const userIds = sorted.map(([id]) => id);
      const { data: users } = await db
        .from(Tables.users)
        .select('id, name, email')
        .in('id', userIds.length > 0 ? userIds : ['__none__']);

      const userMap = new Map((users || []).map((u: any) => [u.id, u]));

      return NextResponse.json({
        type: 'weekly',
        periodStart: weekAgo.toISOString(),
        periodEnd: new Date().toISOString(),
        leaderboard: sorted.map(([userId, s], i) => ({
          rank: i + 1,
          userId,
          name: userMap.get(userId)?.name || 'Unknown',
          email: userMap.get(userId)?.email || null,
          totalScore: s.totalScore,
          quizzesTaken: s.count,
          bestStreak: s.maxStreak,
        })),
      });
    }

    // ── Overall (all-time) leaderboard ──
    const { data: allParticipants, error } = await db
      .from(Tables.session_participants)
      .select('userId, totalScore, streak')
      .not('userId', 'is', null);

    if (error) throw error;

    // Group by userId manually
    const userScores = new Map<string, { totalScore: number; count: number; maxStreak: number; sumScore: number }>();
    (allParticipants || []).forEach((p: any) => {
      if (!p.userId) return;
      const existing = userScores.get(p.userId) || { totalScore: 0, count: 0, maxStreak: 0, sumScore: 0 };
      existing.totalScore += p.totalScore || 0;
      existing.count += 1;
      existing.maxStreak = Math.max(existing.maxStreak, p.streak || 0);
      existing.sumScore += p.totalScore || 0;
      userScores.set(p.userId, existing);
    });

    const sorted = Array.from(userScores.entries())
      .sort((a, b) => b[1].totalScore - a[1].totalScore)
      .slice(0, limit);

    const userIds = sorted.map(([id]) => id);
    const { data: users } = await db
      .from(Tables.users)
      .select('id, name, email')
      .in('id', userIds.length > 0 ? userIds : ['__none__']);

    const userMap = new Map((users || []).map((u: any) => [u.id, u]));

    return NextResponse.json({
      type: 'overall',
      leaderboard: sorted.map(([userId, s], i) => ({
        rank: i + 1,
        userId,
        name: userMap.get(userId)?.name || 'Unknown',
        email: userMap.get(userId)?.email || null,
        totalScore: s.totalScore,
        avgScore: s.count > 0 ? Math.round(s.sumScore / s.count) : 0,
        quizzesTaken: s.count,
        bestStreak: s.maxStreak,
      })),
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
