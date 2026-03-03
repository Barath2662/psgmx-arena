import { NextRequest, NextResponse } from 'next/server';
import { db, Tables, generateId } from '@/lib/db';
import { submitAnswerSchema } from '@/lib/validations';

// ─── Grading logic ─────────────────────────────────────
function gradeAnswer(question: any, answerData: any): { isCorrect: boolean; score: number } {
  const { type, correctAnswer, optionsData, points } = question;

  switch (type) {
    case 'MCQ':
    case 'TRUE_FALSE': {
      // answerData is the selected option ID
      const options = optionsData?.options || [];
      const selectedOption = options.find((o: any) => o.id === answerData);
      // Primary: check isCorrect flag on the option
      let isCorrect = selectedOption?.isCorrect === true;
      // Fallback: check against correctAnswer field (comma-separated correct IDs)
      if (!isCorrect && correctAnswer) {
        const correctIds = correctAnswer.split(',').map((s: string) => s.trim());
        isCorrect = correctIds.includes(String(answerData));
      }
      return { isCorrect, score: isCorrect ? points : 0 };
    }

    case 'MULTI_SELECT': {
      // answerData is comma-separated option IDs
      const selectedIds = new Set(String(answerData).split(',').filter(Boolean));
      const correctIds = new Set(
        (optionsData?.options || [])
          .filter((o: any) => o.isCorrect)
          .map((o: any) => o.id)
      );
      const isCorrect =
        selectedIds.size === correctIds.size &&
        Array.from(selectedIds).every((id) => correctIds.has(id));
      return { isCorrect, score: isCorrect ? points : 0 };
    }

    case 'FILL_BLANK': {
      const answer = String(answerData).trim().toLowerCase();
      const correct = String(correctAnswer || '').trim().toLowerCase();
      const blanks = optionsData?.blanks || [];
      let isCorrect = answer === correct;
      if (!isCorrect && blanks.length > 0) {
        const accepted: string[] = blanks[0]?.acceptedAnswers || [];
        isCorrect = accepted.some((a: string) => String(a).trim().toLowerCase() === answer);
      }
      return { isCorrect, score: isCorrect ? points : 0 };
    }

    case 'NUMERIC': {
      const answer = parseFloat(String(answerData));
      const correct = parseFloat(String(correctAnswer || optionsData?.answer || '0'));
      const tolerance = optionsData?.tolerance || 0;
      if (isNaN(answer) || isNaN(correct)) return { isCorrect: false, score: 0 };
      const isCorrect = Math.abs(answer - correct) <= tolerance;
      return { isCorrect, score: isCorrect ? points : 0 };
    }

    case 'SHORT_ANSWER': {
      const answer = String(answerData).trim().toLowerCase();
      const correct = String(correctAnswer || '').trim().toLowerCase();
      const isCorrect = answer !== '' && answer === correct;
      return { isCorrect, score: isCorrect ? points : 0 };
    }

    default:
      // CODE, LONG_ANSWER, etc. — needs manual grading
      return { isCorrect: false, score: 0 };
  }
}

// ─── Recalculate participant totals ────────────────────
async function updateParticipantTotals(participantId: string) {
  const { data: answers } = await db
    .from(Tables.student_answers)
    .select('isCorrect, score')
    .eq('participantId', participantId);

  const totalScore = (answers || []).reduce((sum: number, a: any) => sum + (a.score || 0), 0);
  const correctCount = (answers || []).filter((a: any) => a.isCorrect === true).length;

  await db
    .from(Tables.session_participants)
    .update({ totalScore, correctCount })
    .eq('id', participantId);
}

// POST /api/session/[sessionId]/answer - Persist and grade a student answer
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

    // Fetch the question for grading
    const { data: question, error: qError } = await db
      .from(Tables.questions)
      .select('id, type, correctAnswer, optionsData, points')
      .eq('id', questionId)
      .single();

    if (qError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Grade the answer
    const { isCorrect, score } = gradeAnswer(question, answerData);

    // Check if answer already exists (upsert)
    const { data: existingAnswer } = await db
      .from(Tables.student_answers)
      .select('id')
      .eq('participantId', participantId)
      .eq('questionId', questionId)
      .single();

    let answer;

    if (existingAnswer) {
      // Update existing answer
      const { data: updated, error: updateError } = await db
        .from(Tables.student_answers)
        .update({
          answerData,
          timeTakenMs,
          isCorrect,
          score,
          submittedAt: new Date().toISOString(),
        })
        .eq('id', existingAnswer.id)
        .select()
        .single();

      if (updateError) throw updateError;
      answer = updated;
    } else {
      // Insert new answer
      const { data: created, error: insertError } = await db
        .from(Tables.student_answers)
        .insert({
          id: generateId(),
          participantId,
          questionId,
          userId: participant.userId || null,
          answerData,
          timeTakenMs,
          isCorrect,
          score,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      answer = created;
    }

    // Recalculate participant scores
    await updateParticipantTotals(participantId);

    return NextResponse.json({ answer, isCorrect, score }, { status: existingAnswer ? 200 : 201 });
  } catch (error) {
    console.error('Error saving answer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
