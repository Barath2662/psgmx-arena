import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdminRole } from '@/lib/auth';
import { db, Tables, generateId } from '@/lib/db';
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

    const { data: questions, error } = await db
      .from(Tables.questions)
      .select('*')
      .eq('quizId', params.quizId)
      .is('parentId', null)
      .order('order', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ questions: questions || [] });
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
    const { data: quiz } = await db
      .from(Tables.quizzes)
      .select('id, instructorId')
      .eq('id', params.quizId)
      .single();

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
    const { data: lastQuestion } = await db
      .from(Tables.questions)
      .select('order')
      .eq('quizId', params.quizId)
      .is('parentId', null)
      .order('order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastQuestion?.order ?? -1) + 1;

    const { data: question, error } = await db
      .from(Tables.questions)
      .insert({
        id: generateId(),
        ...validation.data,
        quizId: params.quizId,
        order: nextOrder,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
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

    const { data: quiz } = await db
      .from(Tables.quizzes)
      .select('id, instructorId')
      .eq('id', params.quizId)
      .single();

    if (!quiz || (quiz.instructorId !== user.id && !isAdminRole(user.role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { questionIds } = body as { questionIds: string[] };

    if (!Array.isArray(questionIds)) {
      return NextResponse.json({ error: 'questionIds must be an array' }, { status: 400 });
    }

    // Update order sequentially (no transaction in Supabase client)
    for (let i = 0; i < questionIds.length; i++) {
      const { error } = await db
        .from(Tables.questions)
        .update({ order: i })
        .eq('id', questionIds[i]);

      if (error) throw error;
    }

    return NextResponse.json({ message: 'Questions reordered' });
  } catch (error) {
    console.error('Error reordering questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/quiz/[quizId]/questions - Delete a question
export async function DELETE(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: quiz } = await db
      .from(Tables.quizzes)
      .select('id, instructorId')
      .eq('id', params.quizId)
      .single();

    if (!quiz || (quiz.instructorId !== user.id && !isAdminRole(user.role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required' }, { status: 400 });
    }

    const { error } = await db
      .from(Tables.questions)
      .delete()
      .eq('id', questionId)
      .eq('quizId', params.quizId);

    if (error) throw error;
    return NextResponse.json({ message: 'Question deleted' });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
