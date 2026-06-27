import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Post, Reply } from '../models/Community';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';
import { GamificationService } from '../services/gamification.service';

export const CommunityController = {

  // GET /api/v1/community/posts
  getPosts: asyncHandler(async (req: Request, res: Response) => {
    const sortField = req.query['sort'] === 'top' ? 'upvoteCount' : 'createdAt';
    const sortOrder = -1;
    const sort: Record<string, -1> = { [sortField]: sortOrder };
    const page = parseInt(req.query['page'] as string ?? '1', 10);
    const limit = parseInt(req.query['limit'] as string ?? '20', 10);

    const [posts, total] = await Promise.all([
      Post.find({ deletedAt: null })
        .populate('authorId', 'name avatar')
        .sort(sort).skip((page - 1) * limit).limit(limit),
      Post.countDocuments({ deletedAt: null }),
    ]);
    ApiResponse.success(res, 200, 'Posts fetched', { posts, total, page, limit });
  }),

  // GET /api/v1/community/posts/:id
  getPost: asyncHandler(async (req: Request, res: Response) => {
    const post = await Post.findOne({ _id: req.params['id'], deletedAt: null })
      .populate('authorId', 'name avatar');
    if (!post) throw new ApiError(404, 'Post not found.');

    const replies = await Reply.find({ postId: post._id, deletedAt: null })
      .populate('authorId', 'name avatar')
      .sort({ createdAt: 1 });

    ApiResponse.success(res, 200, 'Post fetched', { post, replies });
  }),

  // POST /api/v1/community/posts
  createPost: asyncHandler(async (req: Request, res: Response) => {
    const { title, body, tags } = req.body as { title: string; body: string; tags?: string[] };
    if (!title || !body) throw new ApiError(400, 'Title and body are required.');

    const post = await Post.create({
      authorId: new Types.ObjectId(req.user!.userId),
      title, body, tags: tags ?? [],
    });

    // Award XP for posting
    await GamificationService.awardXP(req.user!.userId, 'community_post').catch(() => {});
    ApiResponse.success(res, 201, 'Post created', post);
  }),

  // POST /api/v1/community/posts/:id/reply
  addReply: asyncHandler(async (req: Request, res: Response) => {
    const post = await Post.findOne({ _id: req.params['id'], deletedAt: null });
    if (!post) throw new ApiError(404, 'Post not found.');

    const reply = await Reply.create({
      postId: post._id,
      authorId: new Types.ObjectId(req.user!.userId),
      body: req.body.body,
      parentReplyId: req.body.parentReplyId,
    });

    await Post.findByIdAndUpdate(post._id, { $inc: { replyCount: 1 } });
    await GamificationService.awardXP(req.user!.userId, 'community_reply').catch(() => {});
    ApiResponse.success(res, 201, 'Reply added', reply);
  }),

  // POST /api/v1/community/posts/:id/upvote
  upvotePost: asyncHandler(async (req: Request, res: Response) => {
    const post = await Post.findOne({ _id: req.params['id'], deletedAt: null });
    if (!post) throw new ApiError(404, 'Post not found.');

    const userId = new Types.ObjectId(req.user!.userId);
    const hasUpvoted = post.upvotes.some(id => id.equals(userId));

    if (hasUpvoted) {
      await Post.findByIdAndUpdate(post._id, { $pull: { upvotes: userId }, $inc: { upvoteCount: -1 } });
      ApiResponse.success(res, 200, 'Upvote removed');
    } else {
      await Post.findByIdAndUpdate(post._id, { $addToSet: { upvotes: userId }, $inc: { upvoteCount: 1 } });
      ApiResponse.success(res, 200, 'Post upvoted');
    }
  }),

  // DELETE /api/v1/community/posts/:id
  deletePost: asyncHandler(async (req: Request, res: Response) => {
    const post = await Post.findOne({ _id: req.params['id'], deletedAt: null });
    if (!post) throw new ApiError(404, 'Post not found.');

    const isAuthor = post.authorId.toString() === req.user!.userId;
    const isAdmin = req.user!.role === 'admin';
    if (!isAuthor && !isAdmin) throw new ApiError(403, 'Permission denied.');

    await Post.findByIdAndUpdate(post._id, { deletedAt: new Date() });
    await Reply.updateMany({ postId: post._id }, { deletedAt: new Date() });
    ApiResponse.success(res, 200, 'Post deleted');
  }),
};
