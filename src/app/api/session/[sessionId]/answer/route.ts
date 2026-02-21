import { NextRequest, NextResponse } from 'next/server';
import { db, Tables, generateId } from '@/lib/db';
import { submitAnswerSchema } from '@/lib/validations';

// POST /api/session/[sessionId]/answer - Persist a student answer
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await req.json();
    const { participantId, ...rest } = body;

    if (!participantId) {
      return NextResponse.json({ error: 'participantId is required' }, { status: 400 });
    }

    const validation = submitAnswerSchema.safeParse(rest);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { questionId, answerData, timeTakenMs } = validation.data;

    // Verify session exists
    const { data: session, error: sessionError } = await db
      .from(Tables.quiz_sessions)
      .select('id, state')
      .eq('id', params.sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify participant exists
    const { data: participant, error: partError } = await db
      .from(Tables.session_participants)
      .select('id, userId')
      .eq('id', participantId)
      .single();

    if (partError || !participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Check if answer already exists (upsert)
    const { data: existingAnswer } = await db
      .from(Tables.student_answers)
      .select('id')
      .eq('participantId', participantId)
      .eq('questionId', questionId)
      .single();

    if (existingAnswer) {
      // Update existing answer
      const { data: updated, error: updateError } = await db
        .from(Tables.student_answers)
        .update({
          answerData,
          timeTakenMs,
          submittedAt: new Date().toISOString(),
        })
        .eq('id', existingAnswer.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return NextResponse.json({ answer: updated });
    }

    // Insert new answer
    const { data: answer, error: insertError } = await db
      .from(Tables.student_answers)
      .insert({
        id: generateId(),
        participantId,
        questionId,
        userId: participant.userId || null,
        answerData,
        timeTakenMs,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return NextResponse.json({ answer }, { status: 201 });
  } catch (error) {
    console.error('Error saving answer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
