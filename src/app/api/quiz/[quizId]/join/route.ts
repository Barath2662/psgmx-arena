import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db, Tables, generateId } from '@/lib/db';

// POST /api/quiz/[quizId]/join - Join the active session for a quiz
export async function POST(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Please log in to join' }, { status: 401 });
    }

    const { quizId } = params;

    // Find an active (non-COMPLETED) session for this quiz
    const { data: sessions, error: sErr } = await db
      .from(Tables.quiz_sessions)
      .select('id, state, quizId, allowLateJoin')
      .eq('quizId', quizId)
      .neq('state', 'COMPLETED')
      .order('createdAt', { ascending: false })
      .limit(1);

    if (sErr) throw sErr;

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: 'No active session for this quiz yet. Please wait for the instructor to start.' },
        { status: 404 }
      );
    }

    const session = sessions[0];

    // Check late join policy
    if (!session.allowLateJoin && session.state !== 'WAITING') {
      return NextResponse.json(
        { error: 'This session does not allow late joining.' },
        { status: 400 }
      );
    }

    // Check if already joined
    const { data: existing } = await db
      .from(Tables.session_participants)
      .select('id')
      .eq('sessionId', session.id)
      .eq('userId', user.id)
      .single();

    let participantId: string;

    if (!existing) {
      // Create participant record
      const pid = generateId();
      const { error: pErr } = await db
        .from(Tables.session_participants)
        .insert({
          id: pid,
          sessionId: session.id,
          userId: user.id,
        });

      if (pErr) throw pErr;
      participantId = pid;
    } else {
      participantId = existing.id;
    }

    return NextResponse.json({
      sessionId: session.id,
      participantId,
      state: session.state,
    });
  } catch (error) {
    console.error('Error joining quiz session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
