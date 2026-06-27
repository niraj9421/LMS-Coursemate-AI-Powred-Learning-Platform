import { Schema, model, Document, Types } from 'mongoose';

export interface IUserAnalytics extends Document {
  userId: Types.ObjectId;
  date: Date;                  // daily snapshot date (midnight UTC)
  learningTime: number;        // minutes
  lessonsCompleted: number;
  quizzesTaken: number;
  averageQuizScore: number;
  xpEarned: number;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const userAnalyticsSchema = new Schema<IUserAnalytics>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    learningTime: { type: Number, default: 0, min: 0 },
    lessonsCompleted: { type: Number, default: 0, min: 0 },
    quizzesTaken: { type: Number, default: 0, min: 0 },
    averageQuizScore: { type: Number, default: 0, min: 0, max: 100 },
    xpEarned: { type: Number, default: 0, min: 0 },
    loginCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Compound unique: one snapshot per user per day
userAnalyticsSchema.index({ userId: 1, date: -1 });
userAnalyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

export const UserAnalytics = model<IUserAnalytics>('UserAnalytics', userAnalyticsSchema);
