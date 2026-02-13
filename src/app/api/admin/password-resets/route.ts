import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase-admin';

const DEFAULT_PASSWORD = 'Psgmx123';

// GET /api/admin/password-resets - List password reset requests
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'PENDING';

    const requests = await prisma.passwordResetRequest.findMany({
      where: { status },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching password reset requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/password-resets - Approve or reject a password reset request
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { requestId, action } = await req.json();

    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId and action are required' }, { status: 400 });
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use APPROVED or REJECTED' }, { status: 400 });
    }

    // Find the reset request
    const resetRequest = await prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!resetRequest) {
      return NextResponse.json({ error: 'Reset request not found' }, { status: 404 });
    }

    if (resetRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    if (action === 'APPROVED') {
      // Reset password in Supabase to default
      if (resetRequest.user.supabaseId) {
        const supabaseAdmin = createAdminClient();
        const { error: supabaseError } = await supabaseAdmin.auth.admin.updateUserById(
          resetRequest.user.supabaseId,
          { password: DEFAULT_PASSWORD }
        );

        if (supabaseError) {
          console.error('Supabase password reset error:', supabaseError);
          return NextResponse.json({ error: 'Failed to reset password in auth system' }, { status: 500 });
        }
      }

      // Set mustChangePassword = true
      await prisma.user.update({
        where: { id: resetRequest.userId },
        data: { mustChangePassword: true },
      });
    }

    // Update the request status
    await prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: action,
        resolvedAt: new Date(),
        resolvedBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: action === 'APPROVED'
        ? 'Password reset to default. User must change it on next login.'
        : 'Password reset request rejected.',
    });
  } catch (error) {
    console.error('Error processing password reset request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
