import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db, Tables, generateId } from '@/lib/db';
import { joinSessionSchema } from '@/lib/validations';
import { nanoid } from 'nanoid';

const guestIdGen = () => nanoid(12);

// POST /api/session/join - Join a session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = joinSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { joinCode, guestName } = validation.data;

    // Find session
    const { data: quizSession } = await db
      .from(Tables.quiz_sessions)
      .select('*, quiz:quizzes(id, title, mode)')
      .eq('joinCode', joinCode.toUpperCase())
      .single();

    if (!quizSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (quizSession.state === 'COMPLETED') {
      return NextResponse.json({ error: 'Session has ended' }, { status: 400 });
    }

    if (!quizSession.allowLateJoin && quizSession.state !== 'WAITING') {
      return NextResponse.json({ error: 'Late join is not allowed' }, { status: 400 });
    }

    // Check auth
    const user = await getAuthUser();
    const userId = user?.id;

    // If logged-in user provided a guestName, update their DB name
    if (userId && guestName && guestName !== user?.name) {
      await db
        .from(Tables.users)
        .update({ name: guestName })
        .eq('id', userId);
    }

    // Guest or authenticated join
    if (!userId && !quizSession.guestMode) {
      return NextResponse.json({ error: 'Guest mode is not enabled. Please log in.' }, { status: 401 });
    }

    if (!userId && !guestName) {
      return NextResponse.json({ error: 'Guest name is required' }, { status: 400 });
    }

    // Check if already joined
    let participant: any;

    if (userId) {
      const { data: existing } = await db
        .from(Tables.session_participants)
        .select('*')
        .eq('sessionId', quizSession.id)
        .eq('userId', userId)
        .single();

      if (!existing) {
        const { data: created, error } = await db
          .from(Tables.session_participants)
          .insert({
            id: generateId(),
            sessionId: quizSession.id,
            userId,
          })
          .select()
          .single();

        if (error) throw error;
        participant = created;
      } else {
        // Reconnect
        const { data: updated, error } = await db
          .from(Tables.session_participants)
          .update({ isConnected: true })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        participant = updated;
      }
    } else {
      // Guest join
      const guestId = guestIdGen();
      const { data: created, error } = await db
        .from(Tables.session_participants)
        .insert({
          id: generateId(),
          sessionId: quizSession.id,
          guestName,
          guestId,
        })
        .select()
        .single();

      if (error) throw error;
      participant = created;
    }

    return NextResponse.json({
      session: quizSession,
      participant: {
        id: participant.id,
        guestId: participant.guestId,
        name: participant.guestName || user?.name || 'Player',
        registerNumber: user?.registerNumber || null,
      },
    });
  } catch (error) {
    console.error('Error joining session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
