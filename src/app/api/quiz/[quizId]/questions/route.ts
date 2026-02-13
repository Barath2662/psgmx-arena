import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createQuestionSchema } from '@/lib/validations';

// GET /api/quiz/[quizId]/questions
export async function GET(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const questions = await prisma.question.findMany({
      where: { quizId: params.quizId, parentId: null },
      orderBy: { order: 'asc' },
      include: {
        subQuestions: { orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/quiz/[quizId]/questions
export async function POST(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify quiz ownership
    const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId } });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    if (quiz.instructorId !== user.id && !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validation = createQuestionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Get next order index
    const lastQuestion = await prisma.question.findFirst({
      where: { quizId: params.quizId, parentId: null },
      orderBy: { order: 'desc' },
    });
    const nextOrder = (lastQuestion?.order ?? -1) + 1;

    const question = await prisma.question.create({
      data: {
        ...validation.data,
        quizId: params.quizId,
        order: nextOrder,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/quiz/[quizId]/questions - Reorder questions
export async function PUT(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId } });
    if (!quiz || (quiz.instructorId !== user.id && !isAdminRole(user.role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { questionIds } = body as { questionIds: string[] };

    if (!Array.isArray(questionIds)) {
      return NextResponse.json({ error: 'questionIds must be an array' }, { status: 400 });
    }

    // Update order in a transaction
    await prisma.$transaction(
      questionIds.map((id, index) =>
        prisma.question.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ message: 'Questions reordered' });
  } catch (error) {
    console.error('Error reordering questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
