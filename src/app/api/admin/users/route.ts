import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdminRole } from '@/lib/auth';
import { db, Tables, generateId } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase-admin';

/** Convert register number to student email (used for both Auth and DB) */
function toStudentEmail(regNo: string): string {
  return `${regNo.toLowerCase()}@psgtech.ac.in`;
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

    // Build the query for users
    let query = db
      .from(Tables.users)
      .select('*');

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data: users, error } = await query
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    // Get total count with the same filters
    let countQuery = db.from(Tables.users).select('id', { count: 'exact', head: true });
    if (role) {
      countQuery = countQuery.eq('role', role);
    }
    if (search) {
      countQuery = countQuery.or(
        `name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }
    const { count } = await countQuery;
    const total = count || 0;

    // Map to return only needed fields
    const mappedUsers = (users || []).map((u: any) => {
      // Derive registerNumber from email if column doesn't exist yet
      let regNo = u.registerNumber || null;
      if (!regNo && u.email?.endsWith('@psgtech.ac.in')) {
        const prefix = u.email.split('@')[0]; // e.g. "25mx224"
        if (/^\d{2}mx\d{3}$/i.test(prefix)) {
          regNo = prefix.toUpperCase(); // "25MX224"
        }
      }
      return {
        id: u.id,
        name: u.name || null,
        email: u.email,
        role: u.role,
        registerNumber: regNo,
        createdAt: u.createdAt,
      };
    });

    console.log('Users fetched:', { count: users?.length, total, page, limit, mappedCount: mappedUsers.length });
    return NextResponse.json({
      users: mappedUsers,
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
      userEmail = toStudentEmail(registerNumber); // 25mx101@psgtech.ac.in
    } else {
      if (!email) {
        return NextResponse.json({ error: 'Email is required for admin/instructor' }, { status: 400 });
      }
      userEmail = email;
    }

    // Check if user already exists by email
    const { data: existingUser } = await db
      .from(Tables.users)
      .select('id')
      .eq('email', userEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email/register number already exists' }, { status: 409 });
    }

    // Get role-specific default password
    const defaultPassword = getDefaultPassword(userRole, registerNumber);

    // Create (or reuse) user in Supabase Auth
    const supabaseAdmin = createAdminClient();
    let supabaseUserId: string | null = null;

    const { data: supabaseData, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: defaultPassword,
      email_confirm: true,
    });

    if (supabaseError) {
      console.error('Supabase user creation error:', supabaseError.message);

      // If user already exists in Supabase Auth (e.g. from a prior partial failure),
      // look them up and reuse that ID
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = listData?.users?.find(
        (u: any) => u.email === userEmail
      );
      if (existingAuthUser) {
        supabaseUserId = existingAuthUser.id;
        console.log('Reusing existing Supabase Auth user:', supabaseUserId);
      } else {
        return NextResponse.json(
          { error: `Auth error: ${supabaseError.message}` },
          { status: 500 }
        );
      }
    } else {
      supabaseUserId = supabaseData.user?.id || null;
    }

    // Create user in our DB
    // Build insert object — only include registerNumber if we have it
    const insertData: Record<string, any> = {
      id: generateId(),
      email: userEmail,
      name: name || null,
      role: userRole,
      supabaseId: supabaseUserId,
      mustChangePassword: true,
      updatedAt: new Date().toISOString(),
    };

    // Try to include registerNumber (column may not exist yet)
    if (registerNumber) {
      insertData.registerNumber = registerNumber.toUpperCase();
    }

    let newUser: any = null;
    const { data: inserted, error } = await db
      .from(Tables.users)
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      console.error('DB insert error:', error.message, error.code);
      // If error is about registerNumber column not existing, retry without it
      if (error.message?.includes('registerNumber') || error.code === '42703') {
        console.log('Retrying insert without registerNumber column...');
        delete insertData.registerNumber;
        const { data: retryInserted, error: retryError } = await db
          .from(Tables.users)
          .insert(insertData)
          .select('*')
          .single();

        if (retryError) throw retryError;
        newUser = retryInserted;
      } else {
        throw error;
      }
    } else {
      newUser = inserted;
    }

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    const message = error?.message || 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
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
