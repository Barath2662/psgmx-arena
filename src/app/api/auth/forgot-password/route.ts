import { NextRequest, NextResponse } from 'next/server';
import { db, Tables, generateId } from '@/lib/db';

// POST /api/auth/forgot-password - Submit a password reset request
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const { data: user } = await db
      .from(Tables.users)
      .select('id')
      .eq('email', email)
      .single();

    if (!user) {
      // Don't reveal if the email exists or not (security)
      return NextResponse.json({ success: true, message: 'If an account exists, a reset request has been submitted' });
    }

    // Check for existing pending request
    const { data: existingRequest } = await db
      .from(Tables.password_reset_requests)
      .select('id')
      .eq('userId', user.id)
      .eq('status', 'PENDING')
      .limit(1)
      .single();

    if (existingRequest) {
      return NextResponse.json({
        success: true,
        message: 'A reset request is already pending for this account',
      });
    }

    // Create password reset request
    const { error } = await db
      .from(Tables.password_reset_requests)
      .insert({
        id: generateId(),
        userId: user.id,
        status: 'PENDING',
      });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Password reset request submitted. An admin will review it.',
    });
  } catch (error) {
    console.error('Error submitting password reset request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
