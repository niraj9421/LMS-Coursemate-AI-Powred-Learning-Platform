import { Schema, model, Document, Types } from 'mongoose';

export interface IShowcaseProject extends Document {
  authorId: Types.ObjectId;
  title: string;
  description: string;
  coverImage: string;
  additionalImages: string[];
  techStack: string[];
  githubUrl?: string;
  liveDemoUrl?: string;
  tags: string[];
  visibility: 'public' | 'private';
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  isFeatured: boolean;
  engagementScore: number;
  likes: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
  comments: Array<{ userId: Types.ObjectId; text: string; createdAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const showcaseProjectSchema = new Schema<IShowcaseProject>({
  authorId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title:            { type: String, required: true, maxlength: 100, trim: true },
  description:      { type: String, required: true, maxlength: 2000 },
  coverImage:       { type: String, required: true },
  additionalImages: { type: [String], default: [], validate: { validator: (v: string[]) => v.length <= 5, message: 'Max 5 additional images' } },
  techStack:        { type: [String], required: true },
  githubUrl:        String,
  liveDemoUrl:      String,
  tags:             { type: [String], default: [] },
  visibility:       { type: String, enum: ['public', 'private'], default: 'public' },
  likeCount:        { type: Number, default: 0 },
  commentCount:     { type: Number, default: 0 },
  bookmarkCount:    { type: Number, default: 0 },
  isFeatured:       { type: Boolean, default: false },
  engagementScore:  { type: Number, default: 0 },
  likes:            [{ type: Schema.Types.ObjectId, ref: 'User' }],
  bookmarks:        [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments:         [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, text: String, createdAt: { type: Date, default: Date.now } }],
}, { timestamps: true });

showcaseProjectSchema.index({ engagementScore: -1 });
showcaseProjectSchema.index({ isFeatured: 1 });
showcaseProjectSchema.index({ authorId: 1, visibility: 1 });
showcaseProjectSchema.index({ tags: 1 });
showcaseProjectSchema.index({ techStack: 1 });

export const ShowcaseProject = model<IShowcaseProject>('ShowcaseProject', showcaseProjectSchema);
