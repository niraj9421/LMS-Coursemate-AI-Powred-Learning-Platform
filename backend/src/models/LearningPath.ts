import { Schema, model, Document, Types } from 'mongoose';

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IWeeklyPlanItem {
  week: number;
  skill: string;
  courseId?: Types.ObjectId;
  courseTitle?: string;
  estimatedHours: number;
  topics: string[];
}

export interface IMilestone {
  week: number;
  title: string;
  description: string;
  completed: boolean;
}

// ─── Main interface ───────────────────────────────────────────────────────────

export interface ILearningPath extends Document {
  userId: Types.ObjectId;
  goal: string;
  currentLevel: string;
  totalWeeks: number;
  availableHoursPerDay: number;
  weeklyPlan: IWeeklyPlanItem[];
  milestones: IMilestone[];
  estimatedCompletionDate: Date;
  progress: number; // 0–100
  status: 'active' | 'completed' | 'abandoned';
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const learningPathSchema = new Schema<ILearningPath>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    goal: { type: String, required: true },
    currentLevel: { type: String, required: true },
    totalWeeks: { type: Number, required: true, min: 1, max: 52 },
    availableHoursPerDay: { type: Number, required: true, min: 0.5, max: 12 },
    weeklyPlan: [
      {
        week: { type: Number, required: true },
        skill: { type: String, required: true },
        courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
        courseTitle: String,
        estimatedHours: { type: Number, required: true, min: 0 },
        topics: [String],
      },
    ],
    milestones: [
      {
        week: { type: Number, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    estimatedCompletionDate: { type: Date, required: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
    },
  },
  { timestamps: true },
);

learningPathSchema.index({ userId: 1, status: 1 });

export const LearningPath = model<ILearningPath>('LearningPath', learningPathSchema);
