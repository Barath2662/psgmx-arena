import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db, Tables } from '@/lib/db';

// GET /api/analytics/session/[sessionId]
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: quizSession, error } = await db
      .from(Tables.quiz_sessions)
      .select(`
        *,
        quiz:quizzes(*, questions(*)),
        participants:session_participants(
          *,
          user:users(name, email),
          answers:student_answers(*)
        )
      `)
      .eq('id', params.sessionId)
      .order('order', { referencedTable: 'quiz_sessions.quiz.questions', ascending: true })
      .order('totalScore', { referencedTable: 'session_participants', ascending: false })
      .single();

    if (error || !quizSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Compute analytics
    const participants = quizSession.participants || [];
    const questions = quizSession.quiz?.questions || [];

    const scores = participants.map((p: any) => p.totalScore);
    const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
    const sortedScores = [...scores].sort((a: number, b: number) => a - b);
    const medianScore = sortedScores.length > 0
      ? sortedScores[Math.floor(sortedScores.length / 2)]
      : 0;

    // Per-question stats
    const questionStats = questions.map((q: any) => {
      const answers = participants.flatMap((p: any) =>
        (p.answers || []).filter((a: any) => a.questionId === q.id)
      );
      const correct = answers.filter((a: any) => a.isCorrect).length;
      const total = answers.length;
      const avgTime = total > 0
        ? answers.reduce((sum: number, a: any) => sum + (a.timeTakenMs || 0), 0) / total
        : 0;

      return {
        questionId: q.id,
        title: q.title,
        type: q.type,
        totalAnswers: total,
        correctCount: correct,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        avgTimeMs: Math.round(avgTime),
      };
    });

    // Score distribution (buckets of 10%)
    const maxPossible = questions.reduce((sum: number, q: any) => sum + q.points, 0);
    const distribution = Array.from({ length: 10 }, (_, i) => ({
      min: i * 10,
      max: (i + 1) * 10,
      count: 0,
    }));

    participants.forEach((p: any) => {
      const pct = maxPossible > 0 ? (p.totalScore / maxPossible) * 100 : 0;
      const bucket = Math.min(Math.floor(pct / 10), 9);
      distribution[bucket].count++;
    });

    // Student-wise report
    const studentReports = participants.map((p: any) => ({
      id: p.id,
      name: p.guestName || p.user?.name || 'Unknown',
      email: p.user?.email,
      totalScore: p.totalScore,
      correctCount: p.correctCount,
      totalQuestions: questions.length,
      accuracy: questions.length > 0
        ? Math.round((p.correctCount / questions.length) * 100)
        : 0,
      rank: p.rank,
      answers: (p.answers || []).map((a: any) => ({
        questionId: a.questionId,
        isCorrect: a.isCorrect,
        score: a.score,
        timeTakenMs: a.timeTakenMs,
      })),
    }));

    return NextResponse.json({
      analytics: {
        sessionId: quizSession.id,
        quizTitle: quizSession.quiz?.title,
        totalParticipants: participants.length,
        avgScore: Math.round(avgScore),
        medianScore,
        maxPossibleScore: maxPossible,
        completionRate: 100,
        questionStats,
        scoreDistribution: distribution,
        studentReports,
        startedAt: quizSession.startedAt,
        endedAt: quizSession.endedAt,
      },
    });
  } catch (error) {
    console.error('Error computing analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
