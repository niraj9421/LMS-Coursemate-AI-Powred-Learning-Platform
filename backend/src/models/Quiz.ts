import { Schema, model, Document, Types } from 'mongoose';

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export interface IQuizSettings {
  timeLimit: number;        // minutes; 0 = unlimited
  passingScore: number;     // percentage (0–100)
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: 'immediately' | 'after_deadline' | 'never';
  maxAttempts: number;      // 0 = unlimited
}

export interface IQuiz extends Document {
  courseId: Types.ObjectId;
  lessonId?: Types.ObjectId;
  title: string;
  description?: string;
  questions: Types.ObjectId[];
  settings: IQuizSettings;
  xpReward: number;
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = new Schema<IQuiz>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    title: { type: String, required: true, trim: true },
    description: String,
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    settings: {
      timeLimit: { type: Number, default: 0, min: 0 },
      passingScore: { type: Number, default: 60, min: 0, max: 100 },
      shuffleQuestions: { type: Boolean, default: false },
      shuffleOptions: { type: Boolean, default: false },
      showResults: {
        type: String,
        enum: ['immediately', 'after_deadline', 'never'],
        default: 'immediately',
      },
      maxAttempts: { type: Number, default: 0, min: 0 },
    },
    xpReward: { type: Number, default: 25, min: 0 },
  },
  { timestamps: true },
);

quizSchema.index({ courseId: 1 });

export const Quiz = model<IQuiz>('Quiz', quizSchema);

// ─── Question ─────────────────────────────────────────────────────────────────

export interface IQuestion extends Document {
  quizId: Types.ObjectId;
  type: 'mcq' | 'true_false' | 'subjective' | 'fill_blank';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    type: {
      type: String,
      enum: ['mcq', 'true_false', 'subjective', 'fill_blank'],
      required: true,
    },
    question: { type: String, required: true },
    options: [String],
    correctAnswer: { type: Schema.Types.Mixed, required: true },
    explanation: String,
    marks: { type: Number, default: 1, min: 0 },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    aiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

questionSchema.index({ quizId: 1 });

export const Question = model<IQuestion>('Question', questionSchema);

// ─── QuizAttempt ──────────────────────────────────────────────────────────────

export interface IQuizAttempt extends Document {
  quizId: Types.ObjectId;
  userId: Types.ObjectId;
  answers: Map<string, string>; // questionId → answer
  startedAt: Date;
  submittedAt?: Date;
  score?: number;
  percentage?: number;
  passed?: boolean;
  timeTaken?: number; // seconds
  status: 'in_progress' | 'submitted' | 'evaluated';
  createdAt: Date;
  updatedAt: Date;
}

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answers: { type: Map, of: String, default: {} },
    startedAt: { type: Date, default: Date.now },
    submittedAt: Date,
    score: { type: Number, min: 0 },
    percentage: { type: Number, min: 0, max: 100 },
    passed: Boolean,
    timeTaken: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'evaluated'],
      default: 'in_progress',
    },
  },
  { timestamps: true },
);

quizAttemptSchema.index({ quizId: 1, userId: 1 });
quizAttemptSchema.index({ userId: 1, status: 1 });
// For leaderboard: sort by percentage desc, timeTaken asc
quizAttemptSchema.index({ quizId: 1, percentage: -1, timeTaken: 1 });

export const QuizAttempt = model<IQuizAttempt>('QuizAttempt', quizAttemptSchema);
