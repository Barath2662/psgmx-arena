import { PrismaClient, Role, QuizMode, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'barathvikramansk@gmail.com' },
    update: {},
    create: {
      email: 'barathvikramansk@gmail.com',
      name: 'Platform Admin',
      role: Role.ADMIN,
    },
  });
  console.log('✅ Admin created:', admin.email);



  console.log('\n🎉 Seeding complete!');
  console.log('\nSeeded users (use Supabase OTP to login):');
  console.log('  Admin:      barathvikramansk@gmail.com');

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
