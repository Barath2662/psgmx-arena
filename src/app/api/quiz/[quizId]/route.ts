import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateQuizSchema } from '@/lib/validations';

// GET /api/quiz/[quizId]
export async function GET(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: params.quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            subQuestions: { orderBy: { order: 'asc' } },
          },
        },
        instructor: { select: { id: true, name: true, email: true } },
        tags: true,
        _count: { select: { sessions: true } },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (!isAdminRole(user.role) && quiz.instructorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/quiz/[quizId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId } });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (quiz.instructorId !== user.id && !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validation = updateQuizSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { scheduledStartTime, scheduledEndTime, ...quizData } = validation.data;

    const updated = await prisma.quiz.update({
      where: { id: params.quizId },
      data: {
        ...quizData,
        ...(scheduledStartTime !== undefined && {
          scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : null,
        }),
        ...(scheduledEndTime !== undefined && {
          scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : null,
        }),
      },
    });

    return NextResponse.json({ quiz: updated });
  } catch (error) {
    console.error('Error updating quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/quiz/[quizId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId } });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (quiz.instructorId !== user.id && !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.quiz.delete({ where: { id: params.quizId } });

    return NextResponse.json({ message: 'Quiz deleted' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
