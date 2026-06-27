import { Schema, model, Document, Types } from 'mongoose';

// ─── News ─────────────────────────────────────────────────────────────────────

export interface INews extends Document {
  title: string;
  summary: string;
  content?: string;
  imageUrl?: string;
  sourceUrl: string;
  sourceName: string;
  category: Types.ObjectId;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const newsSchema = new Schema<INews>(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true },
    content: String,
    imageUrl: String,
    sourceUrl: { type: String, required: true, unique: true },
    sourceName: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    publishedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// Note: sourceUrl unique index already defined inline via `unique: true`
newsSchema.index({ category: 1, publishedAt: -1 });

export const News = model<INews>('News', newsSchema);
