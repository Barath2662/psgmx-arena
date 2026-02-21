import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdminRole } from '@/lib/auth';
import { db, Tables } from '@/lib/db';
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

    const { data: requests, error } = await db
      .from(Tables.password_reset_requests)
      .select('*, user:users(id, name, email, role)')
      .eq('status', status)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ requests: requests || [] });
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
    const { data: resetRequest } = await db
      .from(Tables.password_reset_requests)
      .select('*, user:users(*)')
      .eq('id', requestId)
      .single();

    if (!resetRequest) {
      return NextResponse.json({ error: 'Reset request not found' }, { status: 404 });
    }

    if (resetRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    if (action === 'APPROVED') {
      // Reset password in Supabase to default
      if (resetRequest.user?.supabaseId) {
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
      await db
        .from(Tables.users)
        .update({ mustChangePassword: true })
        .eq('id', resetRequest.userId);
    }

    // Update the request status
    const { error } = await db
      .from(Tables.password_reset_requests)
      .update({
        status: action,
        resolvedAt: new Date().toISOString(),
        resolvedBy: user.id,
      })
      .eq('id', requestId);

    if (error) throw error;

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
