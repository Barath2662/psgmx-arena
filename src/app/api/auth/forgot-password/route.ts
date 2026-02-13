import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/auth/forgot-password - Submit a password reset request
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if the email exists or not (security)
      return NextResponse.json({ success: true, message: 'If an account exists, a reset request has been submitted' });
    }

    // Check for existing pending request
    const existingRequest = await prisma.passwordResetRequest.findFirst({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return NextResponse.json({
        success: true,
        message: 'A reset request is already pending for this account',
      });
    }

    // Create password reset request
    await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset request submitted. An admin will review it.',
    });
  } catch (error) {
    console.error('Error submitting password reset request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
