import { Schema, model, Document, Types } from 'mongoose';

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IRating {
  average: number;
  count: number;
}

// ─── Main interface ───────────────────────────────────────────────────────────

export interface ICourse extends Document {
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnail: string;
  previewVideo?: string;
  instructor: Types.ObjectId;
  category: Types.ObjectId;
  tags: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  price: number;
  discountPrice?: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
  chapters: Types.ObjectId[];
  enrollmentCount: number;
  rating: IRating;
  requirements: string[];
  outcomes: string[];
  totalDuration: number;
  totalLessons: number;
  certificate: boolean;
  aiGenerated: boolean;
  deletedAt?: Date; // soft-delete
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const courseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description is required'],
      maxlength: [300, 'Short description cannot exceed 300 characters'],
    },
    thumbnail: {
      type: String,
      default: '',
    },
    previewVideo: String,
    instructor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    tags: { type: [String], default: [] },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true,
    },
    language: { type: String, default: 'English' },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    chapters: [{ type: Schema.Types.ObjectId, ref: 'Chapter' }],
    enrollmentCount: { type: Number, default: 0, min: 0 },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
    requirements: { type: [String], default: [] },
    outcomes: { type: [String], default: [] },
    totalDuration: { type: Number, default: 0, min: 0 }, // minutes
    totalLessons: { type: Number, default: 0, min: 0 },
    certificate: { type: Boolean, default: true },
    aiGenerated: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Note: slug unique index already defined inline via `unique: true`
courseSchema.index({ title: 'text', description: 'text' }); // full-text search
courseSchema.index({ instructor: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ status: 1 });
courseSchema.index({ tags: 1 });
courseSchema.index({ 'rating.average': -1 });
courseSchema.index({ enrollmentCount: -1 });
courseSchema.index({ deletedAt: 1 }); // for soft-delete filtering

export const Course = model<ICourse>('Course', courseSchema);
