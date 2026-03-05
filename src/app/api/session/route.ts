import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, canManageQuizzes, isAdminRole } from '@/lib/auth';
import { db, Tables, generateId } from '@/lib/db';
import { generateJoinCode } from '@/lib/utils';
import { setSessionState } from '@/lib/redis';
import { createSessionSchema } from '@/lib/validations';

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

    let query = db
      .from(Tables.quiz_sessions)
      .select('*, quiz:quizzes(id, title, mode, timePerQuestion, scheduledStartTime, scheduledEndTime, syllabus), participants:session_participants(id, userId)')
      .order('createdAt', { ascending: false })
      .limit(50);

    if (user.role === 'STUDENT') {
      // Students: show sessions for published quizzes only
      const { data: publishedQuizzes } = await db
        .from(Tables.quizzes)
        .select('id')
        .eq('status', 'PUBLISHED');
      const quizIds = (publishedQuizzes || []).map((q: any) => q.id);
      if (quizIds.length === 0) {
        return NextResponse.json({ sessions: [] });
      }
      query = query.in('quizId', quizIds);
    }
    // Instructors & Admins: see ALL sessions (no additional filter)

    if (quizId) query = query.eq('quizId', quizId);
    if (state) query = query.eq('state', state);

    const { data: sessions, error } = await query;
    if (error) throw error;

    // Auto-fix stale session states: auto-start scheduled sessions, auto-end expired ones
    const now = new Date();
    const updatedSessions = [];
    for (const s of sessions || []) {
      let updated = { ...s };

      // Auto-start: WAITING sessions whose scheduledStartTime has passed
      if (updated.state === 'WAITING' && updated.quiz) {
        const scheduledStart = (updated.quiz as any).scheduledStartTime;
        if (scheduledStart && now >= new Date(scheduledStart)) {
          await db
            .from(Tables.quiz_sessions)
            .update({
              state: 'QUESTION_ACTIVE',
              currentQuestionIndex: 0,
              startedAt: now.toISOString(),
              questionStartedAt: now.toISOString(),
            })
            .eq('id', s.id);
          updated.state = 'QUESTION_ACTIVE';
          updated.startedAt = now.toISOString();
        }
      }

      updatedSessions.push(updated);
    }

    return NextResponse.json({ sessions: updatedSessions });
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
    const { data: quiz, error: quizError } = await db
      .from(Tables.quizzes)
      .select('*, questions(*)')
      .eq('id', validation.data.quizId)
      .order('order', { referencedTable: 'questions', ascending: true })
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (quiz.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Quiz must be published to create a session' }, { status: 400 });
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      return NextResponse.json({ error: 'Quiz must have at least one question' }, { status: 400 });
    }

    // Generate unique join code
    let joinCode = generateJoinCode();
    let attempts = 0;
    while (true) {
      const { data: existing } = await db
        .from(Tables.quiz_sessions)
        .select('id')
        .eq('joinCode', joinCode)
        .single();
      if (!existing) break;
      joinCode = generateJoinCode();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json({ error: 'Failed to generate unique join code' }, { status: 500 });
      }
    }

    // Create the session
    const { data: quizSession, error: sessionError } = await db
      .from(Tables.quiz_sessions)
      .insert({
        id: generateId(),
        quizId: validation.data.quizId,
        joinCode,
        allowLateJoin: validation.data.allowLateJoin,
        guestMode: validation.data.guestMode,
      })
      .select('*, quiz:quizzes(id, title, mode)')
      .single();

    if (sessionError) throw sessionError;

    // Create session_questions
    const sessionQuestions = quiz.questions.map((q: any, index: number) => ({
      id: generateId(),
      sessionId: quizSession.id,
      questionId: q.id,
      order: index,
    }));

    const { error: sqError } = await db
      .from(Tables.session_questions)
      .insert(sessionQuestions);

    if (sqError) throw sqError;

    // Initialize in-memory session state
    await setSessionState(quizSession.id, 'WAITING');

    return NextResponse.json({ session: quizSession }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
