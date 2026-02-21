import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdminRole } from '@/lib/auth';
import { db, Tables } from '@/lib/db';
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

    const { data: quiz, error } = await db
      .from(Tables.quizzes)
      .select('*, questions(*), instructor:users(id, name, email), quiz_tags(*)')
      .eq('id', params.quizId)
      .single();

    if (error || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Sort questions in-memory
    if (quiz.questions) {
      quiz.questions.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
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
    const validation = updateQuizSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { scheduledStartTime, scheduledEndTime, ...quizData } = validation.data;

    const { data: updated, error } = await db
      .from(Tables.quizzes)
      .update({
        ...quizData,
        ...(scheduledStartTime !== undefined && {
          scheduledStartTime: scheduledStartTime || null,
        }),
        ...(scheduledEndTime !== undefined && {
          scheduledEndTime: scheduledEndTime || null,
        }),
      })
      .eq('id', params.quizId)
      .select()
      .single();

    if (error) throw error;
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

    // Get all session IDs for this quiz
    const { data: sessions } = await db
      .from(Tables.quiz_sessions)
      .select('id')
      .eq('quizId', params.quizId);
    const sessionIds = (sessions || []).map((s: any) => s.id);

    // Get question IDs for this quiz
    const { data: questions } = await db
      .from(Tables.questions)
      .select('id')
      .eq('quizId', params.quizId);
    const questionIds = (questions || []).map((q: any) => q.id);

    // Delete in dependency order:
    // 1. student_answers referencing these questions (FK no-cascade on questionId)
    if (questionIds.length > 0) {
      await db.from(Tables.student_answers).delete().in('questionId', questionIds);
    }

    // 2. session_questions referencing these questions (FK no-cascade on questionId)
    if (questionIds.length > 0) {
      await db.from(Tables.session_questions).delete().in('questionId', questionIds);
    }

    // 3. quiz_analytics for these sessions
    if (sessionIds.length > 0) {
      await db.from(Tables.quiz_analytics).delete().in('sessionId', sessionIds);
    }

    // 4. student_powerups & session_participants via sessions (CASCADE handles answers)
    if (sessionIds.length > 0) {
      // Get participant IDs first for powerups
      const { data: participants } = await db
        .from(Tables.session_participants)
        .select('id')
        .in('sessionId', sessionIds);
      const participantIds = (participants || []).map((p: any) => p.id);

      if (participantIds.length > 0) {
        await db.from(Tables.student_powerups).delete().in('participantId', participantIds);
      }

      await db.from(Tables.session_participants).delete().in('sessionId', sessionIds);
      await db.from(Tables.session_questions).delete().in('sessionId', sessionIds);
    }

    // 5. Delete quiz_sessions
    if (sessionIds.length > 0) {
      await db.from(Tables.quiz_sessions).delete().eq('quizId', params.quizId);
    }

    // 6. Delete quiz (CASCADE handles questions + quiz_tags)
    const { error } = await db
      .from(Tables.quizzes)
      .delete()
      .eq('id', params.quizId);

    if (error) throw error;
    return NextResponse.json({ message: 'Quiz deleted' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
