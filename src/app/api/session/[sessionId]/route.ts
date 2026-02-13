import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, canManageQuizzes } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLeaderboard } from '@/lib/redis';

// GET /api/session/[sessionId]
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const quizSession = await prisma.quizSession.findUnique({
      where: { id: params.sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                type: true,
                title: true,
                description: true,
                mediaUrl: true,
                points: true,
                timeLimit: true,
                optionsData: true,
                order: true,
                // Don't send correctAnswer to students during live quiz
              },
            },
          },
        },
        participants: {
          select: {
            id: true,
            userId: true,
            guestName: true,
            guestId: true,
            totalScore: true,
            correctCount: true,
            streak: true,
            rank: true,
            isConnected: true,
            joinedAt: true,
            user: { select: { name: true, image: true } },
          },
          orderBy: { totalScore: 'desc' },
        },
        questions: {
          orderBy: { order: 'asc' },
          include: { question: true },
        },
      },
    });

    if (!quizSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Strip correct answers for students during active session
    const user = await getAuthUser();
    const isManager = user ? canManageQuizzes(user.role) : false;

    if (!isManager && quizSession.state !== 'COMPLETED') {
      quizSession.quiz.questions = quizSession.quiz.questions.map((q: any) => {
        const sanitized = { ...q, optionsData: q.optionsData as any };
        // Remove isCorrect from options
        if (sanitized.optionsData?.options) {
          sanitized.optionsData = {
            ...sanitized.optionsData,
            options: sanitized.optionsData.options.map((opt: any) => ({
              id: opt.id,
              text: opt.text,
            })),
          };
        }
        return sanitized;
      });
    }

    return NextResponse.json({ session: quizSession });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
