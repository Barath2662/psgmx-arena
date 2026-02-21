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
