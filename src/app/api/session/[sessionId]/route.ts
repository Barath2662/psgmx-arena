import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, canManageQuizzes } from '@/lib/auth';
import { db, Tables } from '@/lib/db';

// GET /api/session/[sessionId]
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Fetch session with quiz, questions, participants
    const { data: quizSession, error } = await db
      .from(Tables.quiz_sessions)
      .select(`
        *,
        quiz:quizzes(
          *,
          questions(id, type, title, description, mediaUrl, points, timeLimit, optionsData, "order")
        ),
        participants:session_participants(
          id, userId, guestName, guestId, totalScore, correctCount, streak, rank, isConnected, joinedAt,
          user:users(name, image)
        ),
        session_questions(*, question:questions(*))
      `)
      .eq('id', params.sessionId)
      .single();

    // Sort in-memory since nested referencedTable ordering can fail in PostgREST
    if (quizSession) {
      if (quizSession.quiz?.questions) {
        quizSession.quiz.questions.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      }
      if (quizSession.participants) {
        quizSession.participants.sort((a: any, b: any) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
      }
      if (quizSession.session_questions) {
        quizSession.session_questions.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      }
    }

    if (error || !quizSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Auto-start session if scheduled time has passed
    if (quizSession.state === 'WAITING') {
      const scheduledStart = quizSession.quiz?.scheduledStartTime;
      if (scheduledStart && new Date() >= new Date(scheduledStart)) {
        const timeLimit = quizSession.quiz?.timePerQuestion || 1800;
        const { error: startError } = await db
          .from(Tables.quiz_sessions)
          .update({
            state: 'QUESTION_ACTIVE',
            currentQuestionIndex: 0,
            startedAt: new Date().toISOString(),
            questionStartedAt: new Date().toISOString(),
          })
          .eq('id', params.sessionId);

        if (!startError) {
          quizSession.state = 'QUESTION_ACTIVE';
          quizSession.startedAt = new Date().toISOString();
          quizSession.questionStartedAt = new Date().toISOString();
          quizSession.currentQuestionIndex = 0;
        }
      }
    }

    // Strip correct answers for students during active session
    const user = await getAuthUser();
    const isManager = user ? canManageQuizzes(user.role) : false;

    if (!isManager && quizSession.state !== 'COMPLETED') {
      quizSession.quiz.questions = (quizSession.quiz.questions || []).map((q: any) => {
        const sanitized = { ...q, optionsData: q.optionsData as any };
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

// PATCH /api/session/[sessionId] - Instructor: control session state
export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user || !canManageQuizzes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body; // 'start' | 'next' | 'lock' | 'results' | 'end'

    // Get current session
    const { data: session, error: fetchError } = await db
      .from(Tables.quiz_sessions)
      .select('*, quiz:quizzes(*, questions(id, type, "order"))')
      .eq('id', params.sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    let updateData: Record<string, any> = {};

    switch (action) {
      case 'start':
        updateData = {
          state: 'QUESTION_ACTIVE',
          currentQuestionIndex: 0,
          startedAt: new Date().toISOString(),
          questionStartedAt: new Date().toISOString(),
        };
        break;

      case 'next': {
        const totalQuestions = session.quiz?.questions?.length || 0;
        const nextIndex = (session.currentQuestionIndex || 0) + 1;
        if (nextIndex >= totalQuestions) {
          return NextResponse.json({ error: 'No more questions' }, { status: 400 });
        }
        updateData = {
          state: 'QUESTION_ACTIVE',
          currentQuestionIndex: nextIndex,
          questionStartedAt: new Date().toISOString(),
        };
        break;
      }

      case 'lock':
        updateData = { state: 'LOCKED' };
        break;

      case 'results':
        updateData = { state: 'RESULTS' };
        break;

      case 'end':
        updateData = {
          state: 'COMPLETED',
          endedAt: new Date().toISOString(),
        };
        break;

      case 'reschedule': {
        const { scheduledStartTime, scheduledEndTime } = body;
        if (!scheduledStartTime) {
          return NextResponse.json({ error: 'scheduledStartTime is required' }, { status: 400 });
        }
        // Update the quiz's scheduled times
        await db
          .from(Tables.quizzes)
          .update({
            scheduledStartTime: scheduledStartTime || null,
            scheduledEndTime: scheduledEndTime || null,
          })
          .eq('id', session.quiz?.id || (session as any).quizId);

        // Reset session to WAITING
        updateData = {
          state: 'WAITING',
          startedAt: null,
          endedAt: null,
          currentQuestionIndex: 0,
          questionStartedAt: null,
        };
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await db
      .from(Tables.quiz_sessions)
      .update(updateData)
      .eq('id', params.sessionId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/session/[sessionId] - Instructor/Admin: permanently delete a session
export async function DELETE(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user || !canManageQuizzes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify session exists and belongs to this instructor (or user is admin)
    const { data: session, error: fetchErr } = await db
      .from(Tables.quiz_sessions)
      .select('id, quiz:quizzes(instructorId)')
      .eq('id', params.sessionId)
      .single();

    if (fetchErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // All instructors & admins can manage any session

    // Delete student_answers first (they reference session_participants via FK without cascade from session)
    const { data: participants } = await db
      .from(Tables.session_participants)
      .select('id')
      .eq('sessionId', params.sessionId);

    if (participants && participants.length > 0) {
      const participantIds = participants.map((p: any) => p.id);
      await db.from(Tables.student_answers).delete().in('participantId', participantIds);
    }

    // Delete the session (cascades to session_participants, session_questions, student_powerups)
    const { error: deleteErr } = await db
      .from(Tables.quiz_sessions)
      .delete()
      .eq('id', params.sessionId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
