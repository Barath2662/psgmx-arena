import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
    const quizSession = await prisma.quizSession.findUnique({
      where: { joinCode: joinCode.toUpperCase() },
      include: {
        quiz: { select: { id: true, title: true, mode: true } },
      },
    });

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
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Guest or authenticated join
    if (!userId && !quizSession.guestMode) {
      return NextResponse.json({ error: 'Guest mode is not enabled. Please log in.' }, { status: 401 });
    }

    if (!userId && !guestName) {
      return NextResponse.json({ error: 'Guest name is required' }, { status: 400 });
    }

    // Check if already joined
    let participant;

    if (userId) {
      participant = await prisma.sessionParticipant.findUnique({
        where: { sessionId_userId: { sessionId: quizSession.id, userId } },
      });

      if (!participant) {
        participant = await prisma.sessionParticipant.create({
          data: {
            sessionId: quizSession.id,
            userId,
          },
        });
      } else {
        // Reconnect
        participant = await prisma.sessionParticipant.update({
          where: { id: participant.id },
          data: { isConnected: true },
        });
      }
    } else {
      // Guest join
      const guestId = guestIdGen();
      participant = await prisma.sessionParticipant.create({
        data: {
          sessionId: quizSession.id,
          guestName,
          guestId,
        },
      });
    }

    return NextResponse.json({
      session: quizSession,
      participant: {
        id: participant.id,
        guestId: (participant as any).guestId,
        name: (participant as any).guestName || session?.user?.name,
      },
    });
  } catch (error) {
    console.error('Error joining session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
