import { Schema, model, Document, Types } from 'mongoose';

// ─── InterviewSession ─────────────────────────────────────────────────────────

export interface IInterviewQuestion {
  question: string;
  category?: string;
}

export interface IInterviewAnswer {
  questionIndex: number;
  answer: string;
  score?: number;        // 0–100
  confidence?: string;
  clarity?: string;
  feedback?: string;
}

export interface IInterviewSession extends Document {
  userId: Types.ObjectId;
  role: string;
  type: 'technical' | 'hr' | 'behavioral' | 'system_design';
  questions: IInterviewQuestion[];
  answers: IInterviewAnswer[];
  overallScore?: number;
  feedback?: string;
  strengths?: string[];
  improvements?: string[];
  status: 'active' | 'completed';
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const interviewSessionSchema = new Schema<IInterviewSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    type: {
      type: String,
      enum: ['technical', 'hr', 'behavioral', 'system_design'],
      required: true,
    },
    questions: [
      {
        question: { type: String, required: true },
        category: String,
      },
    ],
    answers: [
      {
        questionIndex: { type: Number, required: true },
        answer: { type: String, required: true },
        score: { type: Number, min: 0, max: 100 },
        confidence: String,
        clarity: String,
        feedback: String,
      },
    ],
    overallScore: { type: Number, min: 0, max: 100 },
    feedback: String,
    strengths: [String],
    improvements: [String],
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
  },
  { timestamps: true },
);

interviewSessionSchema.index({ userId: 1, status: 1 });

export const InterviewSession = model<IInterviewSession>('InterviewSession', interviewSessionSchema);

// ─── ResumeAnalysis ───────────────────────────────────────────────────────────

export interface IResumeAnalysis extends Document {
  userId: Types.ObjectId;
  atsScore: number;           // 0–100
  skillsFound: string[];
  skillsGap: string[];
  keywordSuggestions: string[];
  sectionFeedback: Map<string, string>;
  overallFeedback: string;
  improvedVersion?: string;
  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const resumeAnalysisSchema = new Schema<IResumeAnalysis>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    atsScore: { type: Number, required: true, min: 0, max: 100 },
    skillsFound: [String],
    skillsGap: [String],
    keywordSuggestions: [String],
    sectionFeedback: { type: Map, of: String, default: {} },
    overallFeedback: { type: String, required: true },
    improvedVersion: String,
    analyzedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

resumeAnalysisSchema.index({ userId: 1, analyzedAt: -1 });

export const ResumeAnalysis = model<IResumeAnalysis>('ResumeAnalysis', resumeAnalysisSchema);
