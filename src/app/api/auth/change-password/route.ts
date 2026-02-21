import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db, Tables } from '@/lib/db';

// POST /api/auth/change-password - Mark password as changed
export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { error } = await db
      .from(Tables.users)
      .update({ mustChangePassword: false })
      .eq('id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
