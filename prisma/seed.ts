import { PrismaClient, Role, QuizMode, QuestionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@psgmx.edu' },
    update: {},
    create: {
      email: 'admin@psgmx.edu',
      name: 'Platform Admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create Instructor
  const instructorPassword = await bcrypt.hash('instructor123', 12);
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@psgmx.edu' },
    update: {},
    create: {
      email: 'instructor@psgmx.edu',
      name: 'Dr. Demo Instructor',
      passwordHash: instructorPassword,
      role: Role.INSTRUCTOR,
    },
  });
  console.log('✅ Instructor created:', instructor.email);

  // Create Students
  const studentPassword = await bcrypt.hash('student123', 12);
  const students = [];
  for (let i = 1; i <= 5; i++) {
    const student = await prisma.user.upsert({
      where: { email: `student${i}@psgmx.edu` },
      update: {},
      create: {
        email: `student${i}@psgmx.edu`,
        name: `Student ${i}`,
        passwordHash: studentPassword,
        role: Role.STUDENT,
      },
    });
    students.push(student);
  }
  console.log(`✅ ${students.length} students created`);

  // Create a sample quiz
  const quiz = await prisma.quiz.create({
    data: {
      title: 'Data Structures Fundamentals',
      description: 'Test your knowledge of basic data structures including arrays, linked lists, stacks, and queues.',
      mode: QuizMode.LIVE,
      status: 'PUBLISHED',
      timePerQuestion: 30,
      maxAttempts: 1,
      shuffleQuestions: false,
      enableLeaderboard: true,
      enableCodeQuestions: true,
      instructorId: instructor.id,
      questions: {
        create: [
          {
            type: QuestionType.MCQ,
            order: 0,
            title: 'What is the time complexity of accessing an element in an array by index?',
            points: 10,
            optionsData: {
              options: [
                { id: 'a', text: 'O(1)', isCorrect: true },
                { id: 'b', text: 'O(n)', isCorrect: false },
                { id: 'c', text: 'O(log n)', isCorrect: false },
                { id: 'd', text: 'O(n²)', isCorrect: false },
              ],
            },
            correctAnswer: 'a',
            explanation: 'Array access by index is O(1) because arrays use contiguous memory with direct address calculation.',
          },
          {
            type: QuestionType.MULTI_SELECT,
            order: 1,
            title: 'Which of the following are LIFO (Last In First Out) data structures?',
            points: 15,
            optionsData: {
              options: [
                { id: 'a', text: 'Stack', isCorrect: true },
                { id: 'b', text: 'Queue', isCorrect: false },
                { id: 'c', text: 'Call Stack', isCorrect: true },
                { id: 'd', text: 'Priority Queue', isCorrect: false },
              ],
            },
            correctAnswer: 'a,c',
            allowPartial: true,
          },
          {
            type: QuestionType.FILL_BLANK,
            order: 2,
            title: 'A _____ is a linear data structure where elements are added at the rear and removed from the front.',
            points: 10,
            optionsData: {
              blanks: [
                { id: 'b1', answer: 'queue', acceptedAnswers: ['queue', 'Queue', 'QUEUE'] },
              ],
            },
            correctAnswer: 'queue',
          },
          {
            type: QuestionType.TRUE_FALSE,
            order: 3,
            title: 'A binary search tree always has O(log n) search time complexity.',
            points: 5,
            optionsData: {
              options: [
                { id: 'true', text: 'True', isCorrect: false },
                { id: 'false', text: 'False', isCorrect: true },
              ],
            },
            correctAnswer: 'false',
            explanation: 'A BST can degenerate to O(n) if not balanced. Only balanced BSTs guarantee O(log n).',
          },
          {
            type: QuestionType.CODE,
            order: 4,
            title: 'Write a function `reverseList` that reverses a singly linked list.',
            description: 'Given the head of a singly linked list, reverse the list and return the new head.',
            points: 25,
            optionsData: {
              language: 'python',
              starterCode: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverseList(head: ListNode) -> ListNode:
    # Your code here
    pass`,
              testCases: [
                {
                  input: '[1,2,3,4,5]',
                  expectedOutput: '[5,4,3,2,1]',
                  description: 'Reverse a 5-element list',
                },
                {
                  input: '[1]',
                  expectedOutput: '[1]',
                  description: 'Single element list',
                },
              ],
              hiddenTestCases: [
                {
                  input: '[]',
                  expectedOutput: '[]',
                  description: 'Empty list',
                },
              ],
            },
          },
          {
            type: QuestionType.NUMERIC,
            order: 5,
            title: 'What is the maximum number of nodes at level L of a binary tree? (L starts from 0)',
            description: 'If L = 4, what is the maximum number of nodes?',
            points: 10,
            optionsData: {
              answer: 16,
              tolerance: 0,
            },
            correctAnswer: '16',
            explanation: 'Maximum nodes at level L = 2^L. For L=4: 2^4 = 16.',
          },
        ],
      },
    },
  });
  console.log('✅ Sample quiz created:', quiz.title);

  console.log('\n🎉 Seeding complete!');
  console.log('\nLogin credentials:');
  console.log('  Admin:      admin@psgmx.edu / admin123');
  console.log('  Instructor: instructor@psgmx.edu / instructor123');
  console.log('  Students:   student[1-5]@psgmx.edu / student123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
