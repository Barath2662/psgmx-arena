import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/analytics - Global analytics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const [
      totalUsers,
      totalInstructors,
      totalStudents,
      totalQuizzes,
      totalSessions,
      totalParticipations,
      recentSessions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.quiz.count(),
      prisma.quizSession.count(),
      prisma.sessionParticipant.count(),
      prisma.quizSession.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          quiz: { select: { title: true } },
          _count: { select: { participants: true } },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalInstructors,
        totalStudents,
        totalQuizzes,
        totalSessions,
        totalParticipations,
      },
      recentSessions,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
