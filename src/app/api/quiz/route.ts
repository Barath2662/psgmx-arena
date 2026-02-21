import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, canManageQuizzes, isAdminRole } from '@/lib/auth';
import { db, Tables, generateId } from '@/lib/db';
import { createQuizSchema } from '@/lib/validations';

// GET /api/quiz - List quizzes for current user
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = db
      .from(Tables.quizzes)
      .select('*, instructor:users(id, name, email), questions(id)', { count: 'exact' })
      .order('updatedAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!isAdminRole(user.role)) {
      query = query.eq('instructorId', user.id);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: quizzes, count, error } = await query;
    if (error) throw error;

    const total = count || 0;
    return NextResponse.json({
      quizzes: quizzes || [],
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/quiz - Create a new quiz
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
    const validation = createQuizSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { scheduledStartTime, scheduledEndTime, ...quizData } = validation.data;

    const { data: quiz, error } = await db
      .from(Tables.quizzes)
      .insert({
        id: generateId(),
        ...quizData,
        scheduledStartTime: scheduledStartTime || null,
        scheduledEndTime: scheduledEndTime || null,
        instructorId: user.id,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    console.error('Error creating quiz:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
