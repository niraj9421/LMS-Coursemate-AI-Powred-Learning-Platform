import { Schema, model, Document, Types } from 'mongoose';

// ─── Post ─────────────────────────────────────────────────────────────────────

export interface IPost extends Document {
  authorId: Types.ObjectId;
  title: string;
  body: string;
  tags: string[];
  upvotes: Types.ObjectId[];   // user IDs who upvoted
  upvoteCount: number;
  replyCount: number;
  isPinned: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true },
    tags: { type: [String], default: [] },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    upvoteCount: { type: Number, default: 0, min: 0 },
    replyCount: { type: Number, default: 0, min: 0 },
    isPinned: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

postSchema.index({ createdAt: -1 });
postSchema.index({ upvoteCount: -1 }); // for "top" sort
postSchema.index({ authorId: 1 });
postSchema.index({ deletedAt: 1 });

export const Post = model<IPost>('Post', postSchema);

// ─── Reply ────────────────────────────────────────────────────────────────────

export interface IReply extends Document {
  postId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  upvotes: Types.ObjectId[];
  upvoteCount: number;
  parentReplyId?: Types.ObjectId; // for nested replies
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new Schema<IReply>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    upvoteCount: { type: Number, default: 0, min: 0 },
    parentReplyId: { type: Schema.Types.ObjectId, ref: 'Reply' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

replySchema.index({ postId: 1, createdAt: 1 });

export const Reply = model<IReply>('Reply', replySchema);
