import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Generate a cuid-like ID */
function generateId(): string {
  return 'c' + crypto.randomBytes(12).toString('hex').slice(0, 24);
}

const ADMIN_EMAIL = 'barathvikramansk@gmail.com';
const ADMIN_NAME = 'BarathVikraman S K';
const ADMIN_PASSWORD = 'admin@123';

// Tables ordered by dependency (children first)
const TABLES_TO_CLEAR = [
  'student_answers',
  'student_powerups',
  'session_questions',
  'quiz_analytics',
  'session_participants',
  'quiz_sessions',
  'questions',
  'quiz_tags',
  'quizzes',
  'abuse_reports',
  'password_reset_requests',
  'users',
];

async function clearAllData() {
  console.log('🗑️  Clearing all data...\n');

  for (const table of TABLES_TO_CLEAR) {
    // Delete all rows (neq id to empty string matches everything)
    const { error } = await db.from(table).delete().neq('id', '');
    if (error) {
      console.warn(`  ⚠️  ${table}: ${error.message}`);
    } else {
      console.log(`  ✅ Cleared ${table}`);
    }
  }

  // Clear all Supabase Auth users
  console.log('\n🗑️  Clearing Supabase Auth users...');
  const { data: authUsers, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.warn('  ⚠️  Failed to list auth users:', listError.message);
  } else if (authUsers?.users) {
    for (const authUser of authUsers.users) {
      const { error: delError } = await db.auth.admin.deleteUser(authUser.id);
      if (delError) {
        console.warn(`  ⚠️  Failed to delete auth user ${authUser.email}:`, delError.message);
      } else {
        console.log(`  ✅ Deleted auth user: ${authUser.email}`);
      }
    }
  }
}

async function createAdmin() {
  console.log('\n👤 Creating admin user...\n');

  // Create in Supabase Auth
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (authError) {
    console.error('  ❌ Failed to create admin in Supabase Auth:', authError.message);
    return;
  }

  console.log('  ✅ Created admin in Supabase Auth');

  // Create in users table
  const now = new Date().toISOString();
  const { data: admin, error: dbError } = await db
    .from('users')
    .insert({
      id: generateId(),
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'ADMIN',
      supabaseId: authData.user?.id || null,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();

  if (dbError) {
    console.error('  ❌ Failed to create admin in DB:', dbError.message);
  } else {
    console.log('  ✅ Created admin in DB:', admin.email);
  }
}

async function main() {
  console.log('🌱 PSGMX Arena — Database Reset & Seed\n');
  console.log('════════════════════════════════════════\n');

  await clearAllData();
  await createAdmin();

  console.log('\n════════════════════════════════════════');
  console.log('🎉 Seeding complete!\n');
  console.log('Admin credentials:');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('\nDefault passwords by role:');
  console.log('  Student:    register number (e.g. 25MX103)');
  console.log('  Instructor: instruct@123');
  console.log('  Admin:      admin@123');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
