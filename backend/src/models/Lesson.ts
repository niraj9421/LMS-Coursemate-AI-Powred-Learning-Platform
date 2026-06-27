import { Schema, model, Document, Types } from 'mongoose';

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IFlashcard {
  front: string;
  back: string;
}

export interface IResource {
  title: string;
  url: string;
  type: 'pdf' | 'link' | 'video' | 'other';
}

export interface ILessonContent {
  videoUrl?: string;
  duration?: number; // seconds
  pdfUrl?: string;
  textContent?: string;
  quizId?: Types.ObjectId;
  assignmentId?: Types.ObjectId;
}

// ─── Main interface ───────────────────────────────────────────────────────────

export interface ILesson extends Document {
  chapterId: Types.ObjectId;
  courseId: Types.ObjectId;
  title: string;
  type: 'video' | 'pdf' | 'text' | 'quiz' | 'assignment';
  content: ILessonContent;
  order: number;
  isFree: boolean;
  aiNotes?: string;
  aiFlashcards: IFlashcard[];
  resources: IResource[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const lessonSchema = new Schema<ILesson>(
  {
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['video', 'pdf', 'text', 'quiz', 'assignment'],
      required: true,
    },
    content: {
      videoUrl: String,
      duration: { type: Number, min: 0 },
      pdfUrl: String,
      textContent: String,
      quizId: { type: Schema.Types.ObjectId, ref: 'Quiz' },
      assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment' },
    },
    order: { type: Number, required: true, min: 0 },
    isFree: { type: Boolean, default: false },
    aiNotes: String,
    aiFlashcards: [
      {
        front: { type: String, required: true },
        back: { type: String, required: true },
      },
    ],
    resources: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ['pdf', 'link', 'video', 'other'],
          default: 'link',
        },
      },
    ],
  },
  { timestamps: true },
);

lessonSchema.index({ chapterId: 1, order: 1 });
lessonSchema.index({ courseId: 1 });

export const Lesson = model<ILesson>('Lesson', lessonSchema);
