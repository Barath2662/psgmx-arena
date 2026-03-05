import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, canManageQuizzes } from '@/lib/auth';
import { db, Tables, generateId } from '@/lib/db';

// POST /api/session/[sessionId]/restart-user
// Body: { participantId?: string, userId?: string }
// Resets a participant's answers and score so they can retake the session.
// If userId is provided and participant doesn't exist, creates the participant.
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user || !canManageQuizzes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { participantId, userId } = body;

    if (!participantId && !userId) {
      return NextResponse.json({ error: 'participantId or userId is required' }, { status: 400 });
    }

    let participant = null;

    if (participantId) {
      // Verify the participant belongs to this session
      const { data: p, error: pErr } = await db
        .from(Tables.session_participants)
        .select('id, sessionId')
        .eq('id', participantId)
        .eq('sessionId', params.sessionId)
        .single();

      if (pErr || !p) {
        return NextResponse.json({ error: 'Participant not found in this session' }, { status: 404 });
      }
      participant = p;
    } else if (userId) {
      // Find or create participant for this user in this session
      const { data: existing } = await db
        .from(Tables.session_participants)
        .select('id')
        .eq('userId', userId)
        .eq('sessionId', params.sessionId)
        .single();

      if (existing) {
        participant = existing;
      } else {
        // Create new participant for this user
        const { data: newParticipant, error: createErr } = await db
          .from(Tables.session_participants)
          .insert({
            id: generateId(),
            sessionId: params.sessionId,
            userId,
            totalScore: 0,
            correctCount: 0,
            streak: 0,
            isConnected: false,
          })
          .select('id')
          .single();

        if (createErr || !newParticipant) {
          return NextResponse.json({ error: 'Failed to create participant' }, { status: 500 });
        }
        participant = newParticipant;
      }
    }

    if (!participant) {
      return NextResponse.json({ error: 'Could not determine participant' }, { status: 400 });
    }

    // 1. Delete all student answers for this participant
    const { error: deleteErr } = await db
      .from(Tables.student_answers)
      .delete()
      .eq('participantId', participant.id);

    if (deleteErr) throw deleteErr;

    // 2. Delete the participant record so the student can re-join fresh
    const { error: deletePartErr } = await db
      .from(Tables.session_participants)
      .delete()
      .eq('id', participant.id);

    if (deletePartErr) throw deletePartErr;

    // 3. Re-open the session so the student can enter it again
    // Remove the state condition so we always reopen regardless of current state
    // (COMPLETED → reopen, QUESTION_ACTIVE → reset timer, WAITING → keep waiting but student can join when it starts)
    const currentSession = await db
      .from(Tables.quiz_sessions)
      .select('state')
      .eq('id', params.sessionId)
      .single();

    const sessionState = currentSession.data?.state;

    if (sessionState === 'COMPLETED') {
      // Fully reopen the session for retesting
      await db
        .from(Tables.quiz_sessions)
        .update({
          state: 'QUESTION_ACTIVE',
          currentQuestionIndex: 0,
          startedAt: new Date().toISOString(),
          questionStartedAt: new Date().toISOString(),
          endedAt: null,
        })
        .eq('id', params.sessionId);
    }
    // For WAITING/QUESTION_ACTIVE, the session is already open — participant deletion is enough

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restarting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
