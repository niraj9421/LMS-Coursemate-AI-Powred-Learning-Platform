import { Schema, model, Document, Types } from 'mongoose';

export interface IChapter extends Document {
  courseId: Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  lessons: Types.ObjectId[];
  isLocked: boolean;
  aiSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const chapterSchema = new Schema<IChapter>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Chapter title is required'],
      trim: true,
    },
    description: String,
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    lessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    isLocked: { type: Boolean, default: false },
    aiSummary: String,
  },
  { timestamps: true },
);

chapterSchema.index({ courseId: 1, order: 1 });

export const Chapter = model<IChapter>('Chapter', chapterSchema);
