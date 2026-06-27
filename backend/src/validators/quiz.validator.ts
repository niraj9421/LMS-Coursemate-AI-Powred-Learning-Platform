import { z } from 'zod';

// ─── Question schema ──────────────────────────────────────────────────────────

export const createQuestionSchema = z.object({
  type: z.enum(['mcq', 'true_false', 'subjective', 'fill_blank']),
  question: z.string().min(1, 'Question text is required'),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string().optional(),
  marks: z.number().int().min(1).default(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

// ─── Quiz settings schema ─────────────────────────────────────────────────────

export const quizSettingsSchema = z.object({
  timeLimit: z.number().int().min(0).default(0),           // minutes; 0 = unlimited
  passingScore: z.number().min(0).max(100).default(60),    // percentage
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  showResults: z
    .enum(['immediately', 'after_deadline', 'never'])
    .default('immediately'),
  maxAttempts: z.number().int().min(0).default(0),         // 0 = unlimited
});

// ─── Create quiz schema ───────────────────────────────────────────────────────

export const createQuizSchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
  lessonId: z.string().optional(),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  settings: quizSettingsSchema.default({}),
  xpReward: z.number().int().min(0).default(25),
  questions: z
    .array(createQuestionSchema)
    .min(1, 'At least one question is required'),
});

// ─── Submit answer schema ─────────────────────────────────────────────────────

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1, 'questionId is required'),
  answer: z.union([z.string(), z.array(z.string())]),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type QuizSettingsInput = z.infer<typeof quizSettingsSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
