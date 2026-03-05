import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdminRole } from '@/lib/auth';
import { db, Tables } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase-admin';

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
      // Derive the new password from the register number (format: 00MX000)
      // If user has an email like 23mx105@psgtech.ac.in, the password becomes 23MX105
      const userEmail = resetRequest.user?.email || '';
      const userRole = resetRequest.user?.role || 'STUDENT';
      const prefix = userEmail.split('@')[0] || '';
      const isRegNo = /^\d{2}mx\d{3}$/i.test(prefix);
      // Role-specific default passwords
      let newPassword: string;
      if (isRegNo) {
        newPassword = prefix.toUpperCase(); // e.g. 25MX105
      } else if (userRole === 'ADMIN') {
        newPassword = 'admin@123';
      } else if (userRole === 'INSTRUCTOR') {
        newPassword = 'instruct@123';
      } else {
        newPassword = 'student@123';
      }

      const supabaseAdmin = createAdminClient();
      let supabaseId = resetRequest.user?.supabaseId;

      // If supabaseId is missing, look up the user in Supabase Auth by email
      if (!supabaseId && userEmail) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const authUser = listData?.users?.find((u: any) => u.email === userEmail);
        if (authUser) {
          supabaseId = authUser.id;
          // Also update the supabaseId in our DB for future use
          await db
            .from(Tables.users)
            .update({ supabaseId })
            .eq('id', resetRequest.userId);
        }
      }

      if (!supabaseId) {
        return NextResponse.json(
          { error: 'Could not find user in auth system. Please recreate the account.' },
          { status: 500 }
        );
      }

      // Reset password in Supabase Auth
      const { error: supabaseError } = await supabaseAdmin.auth.admin.updateUserById(
        supabaseId,
        { password: newPassword }
      );

      if (supabaseError) {
        console.error('Supabase password reset error:', supabaseError);
        return NextResponse.json({ error: 'Failed to reset password in auth system' }, { status: 500 });
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
        ? 'Password reset to register number. User must change it on next login.'
        : 'Password reset request rejected.',
    });
  } catch (error) {
    console.error('Error processing password reset request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
