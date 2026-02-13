import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, canManageQuizzes } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
      // ── Single session report ──
      await addSessionSheet(workbook, sessionId);
    } else if (all) {
      // ── All sessions the user has access to ──
      const where: any = {};
      if (user.role !== 'ADMIN') {
        where.quiz = { instructorId: user.id };
      }

      const sessions = await prisma.quizSession.findMany({
        where,
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: 50, // cap at 50 sheets
      });

      if (sessions.length === 0) {
        return NextResponse.json({ error: 'No sessions found' }, { status: 404 });
      }

      // Also add a summary sheet
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

    // Generate buffer
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

// ── Helper: add a worksheet for one session ──────────────

async function addSessionSheet(workbook: ExcelJS.Workbook, sessionId: string) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: { select: { title: true } },
      participants: {
        orderBy: { totalScore: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          answers: {
            include: {
              question: { select: { title: true, type: true, points: true } },
            },
            orderBy: { submittedAt: 'asc' },
          },
        },
      },
    },
  });

  if (!session) return null;

  const sheetName = (session.quiz?.title || sessionId).slice(0, 31); // Excel 31-char limit
  const sheet = workbook.addWorksheet(sheetName);

  // Build columns: fixed columns + one per question
  const questions = session.participants[0]?.answers.map((a) => a.question) || [];
  const fixedColumns: Partial<ExcelJS.Column>[] = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Total Score', key: 'totalScore', width: 13 },
    { header: 'Correct', key: 'correctCount', width: 10 },
    { header: 'Streak', key: 'streak', width: 9 },
  ];

  const questionColumns: Partial<ExcelJS.Column>[] = questions.map((q, i) => ({
    header: `Q${i + 1}: ${q.title.slice(0, 40)}`,
    key: `q${i}`,
    width: 18,
  }));

  sheet.columns = [...fixedColumns, ...questionColumns];
  styleHeaderRow(sheet);

  session.participants.forEach((p, idx) => {
    const row: Record<string, any> = {
      rank: idx + 1,
      name: p.user?.name || p.guestName || 'Anonymous',
      email: p.user?.email || '—',
      totalScore: p.totalScore,
      correctCount: p.correctCount,
      streak: p.streak,
    };

    // Add per-question scores
    p.answers.forEach((a, qi) => {
      row[`q${qi}`] = `${a.score}/${a.question.points}${a.isCorrect ? ' ✓' : ' ✗'}`;
    });

    sheet.addRow(row);
  });

  // Return summary data for the summary sheet
  const avgScore =
    session.participants.length > 0
      ? Math.round(
          session.participants.reduce((s, p) => s + p.totalScore, 0) /
            session.participants.length
        )
      : 0;

  return {
    quiz: session.quiz?.title || sessionId,
    code: session.joinCode,
    state: session.state,
    participants: session.participants.length,
    avgScore,
    startedAt: session.startedAt?.toISOString() || '—',
    endedAt: session.endedAt?.toISOString() || '—',
  };
}

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }, // indigo
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;
}
