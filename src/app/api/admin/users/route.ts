import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdminRole } from '@/lib/auth';
import { db, Tables, generateId } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase-admin';

/** Convert register number to synthetic email for Supabase Auth */
function toSyntheticEmail(regNo: string): string {
  return `${regNo.toLowerCase()}@student.psgmx`;
}

/** Get default password based on role */
function getDefaultPassword(role: string, registerNumber?: string): string {
  switch (role) {
    case 'ADMIN':
      return 'admin@123';
    case 'INSTRUCTOR':
      return 'instruct@123';
    case 'STUDENT':
      return registerNumber || 'student@123';
    default:
      return 'student@123';
  }
}

// GET /api/admin/users - Admin: list all users
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    let query = db
      .from(Tables.users)
      .select('id, name, email, role, registerNumber, createdAt', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (role) query = query.eq('role', role);
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,registerNumber.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query;
    if (error) throw error;

    const total = count || 0;
    return NextResponse.json({
      users: users || [],
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/users - Update user role
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, role } = await req.json();
    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    if (!['ADMIN', 'INSTRUCTOR', 'STUDENT'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const { data: updated, error } = await db
      .from(Tables.users)
      .update({ role })
      .eq('id', userId)
      .select('id, name, email, role')
      .single();

    if (error) throw error;
    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/users - Admin: create a new user with role-specific default password
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email, name, role, registerNumber } = await req.json();

    const userRole = role || 'STUDENT';
    if (!['ADMIN', 'INSTRUCTOR', 'STUDENT'].includes(userRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // For students: require registerNumber, auto-generate email
    // For admin/instructor: require email
    let userEmail: string;
    if (userRole === 'STUDENT') {
      if (!registerNumber) {
        return NextResponse.json({ error: 'Register number is required for students' }, { status: 400 });
      }
      if (!/^\d{2}MX\d{3}$/i.test(registerNumber)) {
        return NextResponse.json({ error: 'Invalid register number format (e.g. 25MX444)' }, { status: 400 });
      }
      userEmail = toSyntheticEmail(registerNumber);
    } else {
      if (!email) {
        return NextResponse.json({ error: 'Email is required for admin/instructor' }, { status: 400 });
      }
      userEmail = email;
    }

    // Check if user already exists
    const { data: existingUser } = await db
      .from(Tables.users)
      .select('id')
      .eq('email', userEmail)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email/register number already exists' }, { status: 409 });
    }

    // Get role-specific default password
    const defaultPassword = getDefaultPassword(userRole, registerNumber);

    // Create user in Supabase with default password
    const supabaseAdmin = createAdminClient();
    const { data: supabaseData, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: defaultPassword,
      email_confirm: true,
    });

    if (supabaseError) {
      console.error('Supabase user creation error:', supabaseError);
      return NextResponse.json({ error: 'Failed to create user in auth system' }, { status: 500 });
    }

    // Create user in our DB
    const { data: newUser, error } = await db
      .from(Tables.users)
      .insert({
        id: generateId(),
        email: userEmail,
        name: name || (registerNumber ? registerNumber : userEmail.split('@')[0]),
        role: userRole,
        registerNumber: registerNumber || null,
        supabaseId: supabaseData.user?.id || null,
        mustChangePassword: true,
        updatedAt: new Date().toISOString(),
      })
      .select('id, name, email, role, registerNumber, createdAt')
      .single();

    if (error) throw error;
    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/users?userId=X - Admin: delete a user
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Get user to find supabaseId for auth deletion
    const { data: targetUser, error: fetchError } = await db
      .from(Tables.users)
      .select('id, email, supabaseId')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete from our DB first (cascades handle related records)
    const { error: deleteError } = await db
      .from(Tables.users)
      .delete()
      .eq('id', userId);

    if (deleteError) throw deleteError;

    // Also delete from Supabase Auth if they have a supabaseId
    if (targetUser.supabaseId) {
      try {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.auth.admin.deleteUser(targetUser.supabaseId);
      } catch (authErr) {
        console.warn('Failed to delete user from Supabase Auth:', authErr);
        // User is already removed from our DB, don't fail the request
      }
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
