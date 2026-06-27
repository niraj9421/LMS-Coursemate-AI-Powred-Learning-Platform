import { Schema, model, Document, Types } from 'mongoose';

export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface IStarterCode {
  language: string;
  code: string;
}

export interface ICodingProblem extends Document {
  title: string;
  slug: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string[];
  constraints: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  starterCode: IStarterCode[];
  testCases: ITestCase[];
  acceptanceRate: number;
  totalSubmissions: number;
  totalAccepted: number;
  tags: string[];
  hints: string[];
  solution?: string;
  isActive: boolean;
  isPremium: boolean;
  isDailyChallenge: boolean;
  dailyChallengeDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const codingProblemSchema = new Schema<ICodingProblem>({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  category: [{ type: String }],
  constraints: { type: String, default: '' },
  examples: [{
    input: String,
    output: String,
    explanation: String,
  }],
  starterCode: [{
    language: { type: String, required: true },
    code: { type: String, required: true },
  }],
  testCases: [{
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false },
  }],
  acceptanceRate: { type: Number, default: 0 },
  totalSubmissions: { type: Number, default: 0 },
  totalAccepted: { type: Number, default: 0 },
  tags: [String],
  hints: [String],
  solution: String,
  isActive: { type: Boolean, default: true },
  isPremium: { type: Boolean, default: false },
  isDailyChallenge: { type: Boolean, default: false },
  dailyChallengeDate: Date,
}, { timestamps: true });

codingProblemSchema.index({ difficulty: 1, isActive: 1 });
codingProblemSchema.index({ category: 1 });
// slug unique index already defined inline via `unique: true` on the field
codingProblemSchema.index({ isDailyChallenge: 1, dailyChallengeDate: -1 });

export const CodingProblem = model<ICodingProblem>('CodingProblem', codingProblemSchema);

// ─── Submission ───────────────────────────────────────────────────────────────

export interface ICodingSubmission extends Document {
  userId: Types.ObjectId;
  problemId: Types.ObjectId;
  language: string;
  code: string;
  status: 'accepted' | 'wrong_answer' | 'time_limit' | 'runtime_error' | 'compile_error' | 'pending';
  runtime?: number;  // ms
  memory?: number;   // KB
  testCasesPassed: number;
  testCasesTotal: number;
  errorMessage?: string;
  aiReview?: {
    timeComplexity: string;
    spaceComplexity: string;
    suggestions: string[];
    alternativeSolution?: string;
  };
  createdAt: Date;
}

const submissionSchema = new Schema<ICodingSubmission>({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: Schema.Types.ObjectId, ref: 'CodingProblem', required: true },
  language:  { type: String, required: true },
  code:      { type: String, required: true },
  status: {
    type: String,
    enum: ['accepted','wrong_answer','time_limit','runtime_error','compile_error','pending'],
    default: 'pending',
  },
  runtime: Number,
  memory: Number,
  testCasesPassed: { type: Number, default: 0 },
  testCasesTotal:  { type: Number, default: 0 },
  errorMessage: String,
  aiReview: {
    timeComplexity: String,
    spaceComplexity: String,
    suggestions: [String],
    alternativeSolution: String,
  },
}, { timestamps: true });

submissionSchema.index({ userId: 1, problemId: 1 });
submissionSchema.index({ userId: 1, status: 1 });
submissionSchema.index({ problemId: 1, status: 1 });

export const CodingSubmission = model<ICodingSubmission>('CodingSubmission', submissionSchema);

// ─── User Coding Stats ────────────────────────────────────────────────────────

export interface ICodingStats extends Document {
  userId: Types.ObjectId;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  currentStreak: number;
  maxStreak: number;
  lastSolvedDate?: Date;
  totalSubmissions: number;
  acceptanceRate: number;
  rank?: number;
  solvedProblems: Types.ObjectId[];
  activityHeatmap: Map<string, number>; // date → count
}

const codingStatsSchema = new Schema<ICodingStats>({
  userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalSolved:   { type: Number, default: 0 },
  easySolved:    { type: Number, default: 0 },
  mediumSolved:  { type: Number, default: 0 },
  hardSolved:    { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  maxStreak:     { type: Number, default: 0 },
  lastSolvedDate: Date,
  totalSubmissions: { type: Number, default: 0 },
  acceptanceRate:   { type: Number, default: 0 },
  rank:             Number,
  solvedProblems:   [{ type: Schema.Types.ObjectId, ref: 'CodingProblem' }],
  activityHeatmap:  { type: Map, of: Number, default: {} },
}, { timestamps: true });

export const CodingStats = model<ICodingStats>('CodingStats', codingStatsSchema);
