import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
      const participants = await prisma.sessionParticipant.findMany({
        where: { sessionId },
        orderBy: { totalScore: 'desc' },
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          session: {
            select: {
              quiz: { select: { title: true } },
              startedAt: true,
              endedAt: true,
            },
          },
        },
      });

      return NextResponse.json({
        type: 'session',
        sessionId,
        quizTitle: participants[0]?.session?.quiz?.title || '',
        leaderboard: participants.map((p, i) => ({
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

      const weeklyScores = await prisma.sessionParticipant.groupBy({
        by: ['userId'],
        where: {
          userId: { not: null },
          joinedAt: { gte: weekAgo },
        },
        _sum: { totalScore: true },
        _count: { id: true },
        _max: { streak: true },
        orderBy: { _sum: { totalScore: 'desc' } },
        take: limit,
      });

      // Fetch user details
      const userIds = weeklyScores
        .map((s) => s.userId)
        .filter((id): id is string => id !== null);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      return NextResponse.json({
        type: 'weekly',
        periodStart: weekAgo.toISOString(),
        periodEnd: new Date().toISOString(),
        leaderboard: weeklyScores.map((s, i) => ({
          rank: i + 1,
          userId: s.userId,
          name: userMap.get(s.userId!)?.name || 'Unknown',
          email: userMap.get(s.userId!)?.email || null,
          totalScore: s._sum.totalScore || 0,
          quizzesTaken: s._count.id,
          bestStreak: s._max.streak || 0,
        })),
      });
    }

    // ── Overall (all-time) leaderboard ──
    const overallScores = await prisma.sessionParticipant.groupBy({
      by: ['userId'],
      where: { userId: { not: null } },
      _sum: { totalScore: true },
      _count: { id: true },
      _max: { streak: true },
      _avg: { totalScore: true },
      orderBy: { _sum: { totalScore: 'desc' } },
      take: limit,
    });

    const userIds = overallScores
      .map((s) => s.userId)
      .filter((id): id is string => id !== null);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      type: 'overall',
      leaderboard: overallScores.map((s, i) => ({
        rank: i + 1,
        userId: s.userId,
        name: userMap.get(s.userId!)?.name || 'Unknown',
        email: userMap.get(s.userId!)?.email || null,
        totalScore: s._sum.totalScore || 0,
        avgScore: Math.round(s._avg.totalScore || 0),
        quizzesTaken: s._count.id,
        bestStreak: s._max.streak || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
