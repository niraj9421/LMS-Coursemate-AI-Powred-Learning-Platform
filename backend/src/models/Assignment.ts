import { Schema, model, Document, Types } from 'mongoose';

// ─── Assignment ───────────────────────────────────────────────────────────────

export interface IAssignment extends Document {
  courseId: Types.ObjectId;
  lessonId?: Types.ObjectId;
  title: string;
  description: string;
  dueDate: Date;
  maxMarks: number;
  referenceFileUrl?: string; // Cloudinary URL for teacher's reference file
  createdBy: Types.ObjectId; // teacher
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    maxMarks: { type: Number, required: true, min: 1 },
    referenceFileUrl: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

assignmentSchema.index({ courseId: 1 });
assignmentSchema.index({ dueDate: 1 }); // for deadline reminder cron

export const Assignment = model<IAssignment>('Assignment', assignmentSchema);

// ─── Submission ───────────────────────────────────────────────────────────────

export interface ISubmission extends Document {
  assignmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  courseId: Types.ObjectId;
  fileUrl: string;       // Cloudinary URL
  fileName: string;
  submittedAt: Date;
  status: 'pending' | 'submitted' | 'graded';
  score?: number;
  feedback?: string;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'graded'],
      default: 'submitted',
    },
    score: { type: Number, min: 0 },
    feedback: String,
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: Date,
  },
  { timestamps: true },
);

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ studentId: 1 });
submissionSchema.index({ courseId: 1, status: 1 });

export const Submission = model<ISubmission>('Submission', submissionSchema);
