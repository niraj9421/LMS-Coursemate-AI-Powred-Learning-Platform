import { Schema, model, Document, Types } from 'mongoose';

// ─── Enrollment ───────────────────────────────────────────────────────────────

export interface IEnrollment extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  enrolledAt: Date;
  completedAt?: Date;
  progress: number; // 0–100
  lastAccessedAt: Date;
  completedLessons: Types.ObjectId[];
  certificateId?: Types.ObjectId;
  status: 'active' | 'completed' | 'dropped';
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: Date,
    progress: { type: Number, default: 0, min: 0, max: 100 },
    lastAccessedAt: { type: Date, default: Date.now },
    completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    certificateId: { type: Schema.Types.ObjectId, ref: 'Certificate' },
    status: {
      type: String,
      enum: ['active', 'completed', 'dropped'],
      default: 'active',
    },
  },
  { timestamps: true },
);

// Compound unique: one enrollment per user per course
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
enrollmentSchema.index({ userId: 1, status: 1 });
enrollmentSchema.index({ courseId: 1 });

export const Enrollment = model<IEnrollment>('Enrollment', enrollmentSchema);

// ─── LessonProgress ───────────────────────────────────────────────────────────

export interface ILessonProgress extends Document {
  userId: Types.ObjectId;
  lessonId: Types.ObjectId;
  courseId: Types.ObjectId;
  completed: boolean;
  completedAt?: Date;
  watchTime?: number; // seconds for video lessons
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const lessonProgressSchema = new Schema<ILessonProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    watchTime: { type: Number, min: 0 },
    notes: String,
  },
  { timestamps: true },
);

// Compound unique: one progress record per user per lesson
lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
lessonProgressSchema.index({ userId: 1, courseId: 1 });

export const LessonProgress = model<ILessonProgress>('LessonProgress', lessonProgressSchema);
