import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, canManageQuizzes } from '@/lib/auth';
import { db, Tables } from '@/lib/db';
import ExcelJS from 'exceljs';

// GET /api/export/report?sessionId=xxx         — single session report
// GET /api/export/report?all=true              — all sessions report
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !canManageQuizzes(user.role)) {
      return NextResponse.json(
        { error: 'Admin or Instructor access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const all = searchParams.get('all') === 'true';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PSGMX Arena';
    workbook.created = new Date();

    if (sessionId) {
      await addSessionSheet(workbook, sessionId);
    } else if (all) {
      let query = db
        .from(Tables.quiz_sessions)
        .select('id')
        .order('createdAt', { ascending: false })
        .limit(50);

      if (user.role !== 'ADMIN') {
        const { data: userQuizzes } = await db
          .from(Tables.quizzes)
          .select('id')
          .eq('instructorId', user.id);
        const quizIds = (userQuizzes || []).map((q: any) => q.id);
        if (quizIds.length === 0) {
          return NextResponse.json({ error: 'No sessions found' }, { status: 404 });
        }
        query = query.in('quizId', quizIds);
      }

      const { data: sessions } = await query;

      if (!sessions || sessions.length === 0) {
        return NextResponse.json({ error: 'No sessions found' }, { status: 404 });
      }

      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Quiz Title', key: 'quiz', width: 30 },
        { header: 'Session Code', key: 'code', width: 12 },
        { header: 'State', key: 'state', width: 14 },
        { header: 'Participants', key: 'participants', width: 14 },
        { header: 'Avg Score', key: 'avgScore', width: 12 },
        { header: 'Started At', key: 'startedAt', width: 22 },
        { header: 'Ended At', key: 'endedAt', width: 22 },
      ];
      styleHeaderRow(summarySheet);

      for (const s of sessions) {
        const summary = await addSessionSheet(workbook, s.id);
        if (summary) {
          summarySheet.addRow(summary);
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Provide ?sessionId=xxx or ?all=true' },
        { status: 400 }
      );
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const filename = sessionId
      ? `report-${sessionId}.xlsx`
      : `all-reports-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function addSessionSheet(workbook: ExcelJS.Workbook, sessionId: string) {
  const { data: session } = await db
    .from(Tables.quiz_sessions)
    .select(`
      *,
      quiz:quizzes(title),
      participants:session_participants(
        *,
        user:users(name, email),
        answers:student_answers(
          *,
          question:questions(title, type, points)
        )
      )
    `)
    .eq('id', sessionId)
    .order('totalScore', { referencedTable: 'session_participants', ascending: false })
    .order('submittedAt', { referencedTable: 'session_participants.student_answers', ascending: true })
    .single();

  if (!session) return null;

  const sheetName = (session.quiz?.title || sessionId).slice(0, 31);
  const sheet = workbook.addWorksheet(sheetName);

  const questions = session.participants?.[0]?.answers?.map((a: any) => a.question) || [];
  const fixedColumns: Partial<ExcelJS.Column>[] = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Total Score', key: 'totalScore', width: 13 },
    { header: 'Correct', key: 'correctCount', width: 10 },
    { header: 'Streak', key: 'streak', width: 9 },
  ];

  const questionColumns: Partial<ExcelJS.Column>[] = questions.map((q: any, i: number) => ({
    header: `Q${i + 1}: ${(q.title || '').slice(0, 40)}`,
    key: `q${i}`,
    width: 18,
  }));

  sheet.columns = [...fixedColumns, ...questionColumns];
  styleHeaderRow(sheet);

  (session.participants || []).forEach((p: any, idx: number) => {
    const row: Record<string, any> = {
      rank: idx + 1,
      name: p.user?.name || p.guestName || 'Anonymous',
      email: p.user?.email || '—',
      totalScore: p.totalScore,
      correctCount: p.correctCount,
      streak: p.streak,
    };

    (p.answers || []).forEach((a: any, qi: number) => {
      row[`q${qi}`] = `${a.score}/${a.question?.points || 0}${a.isCorrect ? ' ✓' : ' ✗'}`;
    });

    sheet.addRow(row);
  });

  const avgScore =
    session.participants.length > 0
      ? Math.round(
          session.participants.reduce((s: number, p: any) => s + p.totalScore, 0) /
            session.participants.length
        )
      : 0;

  return {
    quiz: session.quiz?.title || sessionId,
    code: session.joinCode,
    state: session.state,
    participants: session.participants.length,
    avgScore,
    startedAt: session.startedAt || '—',
    endedAt: session.endedAt || '—',
  };
}

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;
}
