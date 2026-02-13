import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, canManageQuizzes, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateJoinCode } from '@/lib/utils';
import { setSessionState, sessionKeys } from '@/lib/redis';
import { createSessionSchema, joinSessionSchema } from '@/lib/validations';

// GET /api/session - List sessions
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quizId');
    const state = searchParams.get('state');

    const where: any = {};

    if (!isAdminRole(user.role)) {
      where.quiz = { instructorId: user.id };
    }

    if (quizId) where.quizId = quizId;
    if (state) where.state = state;

    const sessions = await prisma.quizSession.findMany({
      where,
      include: {
        quiz: { select: { id: true, title: true, mode: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/session - Create a new session
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageQuizzes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const validation = createSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Verify quiz exists and is published
    const quiz = await prisma.quiz.findUnique({
      where: { id: validation.data.quizId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (quiz.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Quiz must be published to create a session' }, { status: 400 });
    }

    if (quiz.questions.length === 0) {
      return NextResponse.json({ error: 'Quiz must have at least one question' }, { status: 400 });
    }

    // Generate unique join code
    let joinCode = generateJoinCode();
    let attempts = 0;
    while (await prisma.quizSession.findUnique({ where: { joinCode } })) {
      joinCode = generateJoinCode();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json({ error: 'Failed to generate unique join code' }, { status: 500 });
      }
    }

    const quizSession = await prisma.quizSession.create({
      data: {
        quizId: validation.data.quizId,
        joinCode,
        allowLateJoin: validation.data.allowLateJoin,
        guestMode: validation.data.guestMode,
        questions: {
          create: quiz.questions.map((q: any, index: number) => ({
            questionId: q.id,
            order: index,
          })),
        },
      },
      include: {
        quiz: { select: { id: true, title: true, mode: true } },
        _count: { select: { participants: true } },
      },
    });

    // Initialize Redis session state
    await setSessionState(quizSession.id, 'WAITING');

    return NextResponse.json({ session: quizSession }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
