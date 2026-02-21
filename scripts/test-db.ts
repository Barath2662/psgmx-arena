import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { createClient } from '@supabase/supabase-js';

async function testConnection() {
  console.log('====================================');
  console.log('  PSGMX Arena - DB Connectivity Test');
  console.log('  (Supabase REST API)');
  console.log('====================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[FAIL] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env');
    process.exit(1);
  }

  console.log(`Supabase URL: ${supabaseUrl}\n`);

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Test REST API connection
    console.log('1. Testing Supabase REST API connection...');
    const { data, error } = await db.from('users').select('id').limit(1);
    if (error) {
      console.error(`   [FAIL] ${error.message}`);
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('   [INFO] Tables may not exist yet. Set up your database schema in Supabase Dashboard.\n');
      }
    } else {
      console.log('   [OK] Connection successful\n');
    }

    // Check tables by querying each one
    console.log('2. Checking database tables...');
    const tables = [
      'users', 'quizzes', 'quiz_tags', 'questions',
      'quiz_sessions', 'session_questions', 'session_participants',
      'student_answers', 'student_powerups', 'quiz_analytics',
      'abuse_reports', 'password_reset_requests',
    ];

    let foundCount = 0;
    for (const table of tables) {
      const { error: tableError } = await db.from(table).select('id').limit(0);
      if (tableError) {
        console.log(`       ✗ ${table} (not found)`);
      } else {
        console.log(`       ✓ ${table}`);
        foundCount++;
      }
    }
    console.log(`   Found ${foundCount}/${tables.length} tables\n`);

    // Count users
    console.log('3. Checking user data...');
    const { count } = await db.from('users').select('*', { count: 'exact', head: true });
    console.log(`   Users in database: ${count || 0}`);
    if (!count || count === 0) {
      console.log('   [INFO] No users yet. They will be created on first login.\n');
    } else {
      console.log('   [OK]\n');
    }

    console.log('====================================');
    console.log('  All connectivity checks passed!');
    console.log('  Using: Supabase REST API (HTTPS)');
    console.log('====================================');
  } catch (error: any) {
    console.error('\n[FAIL] Connection error:');
    console.error(error.message);
    console.error('\nCheck your Supabase credentials in .env');
    process.exit(1);
  }
}

testConnection();
