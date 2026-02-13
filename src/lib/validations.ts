import { z } from 'zod';

// ─── Auth ────────────────────────────────────────────────

export const otpEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ─── Quiz ────────────────────────────────────────────────

export const createQuizSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional(),
  mode: z.enum(['LIVE', 'SELF_PACED']).default('LIVE'),
  timePerQuestion: z.number().min(5).max(600).default(30),
  maxAttempts: z.number().min(1).max(10).default(1),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  showResults: z.boolean().default(true),
  enableCodeQuestions: z.boolean().default(false),
  enableLeaderboard: z.boolean().default(true),
  enablePowerUps: z.boolean().default(false),
  passingScore: z.number().min(0).max(100).default(50),
});

export const updateQuizSchema = createQuizSchema.partial();

// ─── Question ────────────────────────────────────────────

export const mcqOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

export const codeQuestionDataSchema = z.object({
  language: z.string(),
  starterCode: z.string(),
  testCases: z.array(
    z.object({
      input: z.string(),
      expectedOutput: z.string(),
      description: z.string().optional(),
    })
  ),
  hiddenTestCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export const createQuestionSchema = z.object({
  type: z.enum([
    'MCQ', 'MULTI_SELECT', 'FILL_BLANK', 'DRAG_DROP', 'MATCH_FOLLOWING',
    'NUMERIC', 'CODE', 'DRAWING', 'CASE_BASED', 'RAPID_FIRE', 'TRUE_FALSE',
    'SHORT_ANSWER', 'LONG_ANSWER', 'ORDERING', 'HOTSPOT', 'MATRIX',
    'SLIDER', 'FILE_UPLOAD',
  ]),
  title: z.string().min(3).max(2000),
  description: z.string().max(5000).optional(),
  mediaUrl: z.string().url().optional(),
  points: z.number().min(1).max(1000).default(10),
  timeLimit: z.number().min(5).max(600).optional(),
  optionsData: z.any().optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().max(2000).optional(),
  allowPartial: z.boolean().default(false),
  parentId: z.string().optional(),
});

// ─── Session ─────────────────────────────────────────────

export const createSessionSchema = z.object({
  quizId: z.string(),
  allowLateJoin: z.boolean().default(true),
  guestMode: z.boolean().default(true),
});

export const joinSessionSchema = z.object({
  joinCode: z.string().length(6, 'Join code must be 6 characters'),
  guestName: z.string().min(2).max(50).optional(),
});

export const submitAnswerSchema = z.object({
  questionId: z.string(),
  answerData: z.any(),
  timeTakenMs: z.number().min(0),
});

// ─── Code Execution ──────────────────────────────────────

export const executeCodeSchema = z.object({
  language: z.string(),
  code: z.string().max(50000),
  stdin: z.string().max(10000).optional(),
});

export type OtpEmailInput = z.infer<typeof otpEmailSchema>;
export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type JoinSessionInput = z.infer<typeof joinSessionSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type ExecuteCodeInput = z.infer<typeof executeCodeSchema>;
