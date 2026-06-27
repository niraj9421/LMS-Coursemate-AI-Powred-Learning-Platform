import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, authorize } from '../middleware/auth';
import { ShowcaseProject } from '../models/ShowcaseProject';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { Types } from 'mongoose';
import { uploadImage } from '../middleware/upload';
import { uploadImage as cloudUpload } from '../config/cloudinary';

const router = Router();

// GET /api/v1/showcase — public feed
router.get('/', asyncHandler(async (req, res) => {
  const { sort = 'recent', techStack, tags, page = '1', limit = '12' } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { visibility: 'public' };
  if (techStack) filter['techStack'] = { $in: [techStack] };
  if (tags) filter['tags'] = { $in: [tags] };

  const sortMap: Record<string, [string, 1 | -1][]> = {
    recent:   [['createdAt', -1]],
    liked:    [['likeCount', -1]],
    trending: [['engagementScore', -1]],
  };

  const [projects, total] = await Promise.all([
    ShowcaseProject.find(filter).populate('authorId', 'name avatar')
      .sort(sortMap[sort] ?? sortMap['recent']!)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)),
    ShowcaseProject.countDocuments(filter),
  ]);
  ApiResponse.success(res, 200, 'Projects fetched', { projects, total });
}));

// GET /api/v1/showcase/trending — top 10 by engagement
router.get('/trending', asyncHandler(async (_req, res) => {
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const projects = await ShowcaseProject.find({ visibility: 'public', updatedAt: { $gte: week } })
    .populate('authorId', 'name avatar')
    .sort({ engagementScore: -1 })
    .limit(10);
  ApiResponse.success(res, 200, 'Trending projects', projects);
}));

// GET /api/v1/showcase/featured
router.get('/featured', asyncHandler(async (_req, res) => {
  const projects = await ShowcaseProject.find({ visibility: 'public', isFeatured: true })
    .populate('authorId', 'name avatar')
    .limit(5);
  ApiResponse.success(res, 200, 'Featured projects', projects);
}));

// POST /api/v1/showcase — create project
router.post('/', authenticate, uploadImage.single('coverImage'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Cover image is required.');
  const imgResult = await cloudUpload(req.file.buffer, { folder: 'lms/showcase' });

  const body = req.body as { title: string; description: string; techStack: string; tags?: string; githubUrl?: string; liveDemoUrl?: string };
  const project = await ShowcaseProject.create({
    authorId: req.user!.userId,
    title: body.title,
    description: body.description,
    coverImage: imgResult.secure_url,
    techStack: body.techStack ? JSON.parse(body.techStack) : [],
    tags: body.tags ? JSON.parse(body.tags) : [],
    githubUrl: body.githubUrl,
    liveDemoUrl: body.liveDemoUrl,
  });
  ApiResponse.success(res, 201, 'Project created', project);
}));

// POST /api/v1/showcase/:id/like — toggle like
router.post('/:id/like', authenticate, asyncHandler(async (req, res) => {
  const project = await ShowcaseProject.findById(req.params['id']);
  if (!project || project.visibility === 'private') throw new ApiError(404, 'Project not found.');

  const userId = new Types.ObjectId(req.user!.userId);
  const hasLiked = project.likes.some(id => id.equals(userId));

  if (hasLiked) {
    await ShowcaseProject.findByIdAndUpdate(req.params['id'], { $pull: { likes: userId }, $inc: { likeCount: -1 } });
    ApiResponse.success(res, 200, 'Like removed');
  } else {
    await ShowcaseProject.findByIdAndUpdate(req.params['id'], { $addToSet: { likes: userId }, $inc: { likeCount: 1 } });
    ApiResponse.success(res, 200, 'Project liked');
  }
}));

// POST /api/v1/showcase/:id/comment
router.post('/:id/comment', authenticate, asyncHandler(async (req, res) => {
  const { text } = req.body as { text: string };
  if (!text || text.length > 1000) throw new ApiError(400, 'Comment must be 1–1000 characters.');

  const project = await ShowcaseProject.findByIdAndUpdate(
    req.params['id'],
    { $push: { comments: { userId: req.user!.userId, text, createdAt: new Date() } }, $inc: { commentCount: 1 } },
    { new: true },
  );
  if (!project) throw new ApiError(404, 'Project not found.');
  ApiResponse.success(res, 201, 'Comment added');
}));

// POST /api/v1/showcase/:id/bookmark
router.post('/:id/bookmark', authenticate, asyncHandler(async (req, res) => {
  const userId = new Types.ObjectId(req.user!.userId);
  const project = await ShowcaseProject.findById(req.params['id']);
  if (!project) throw new ApiError(404, 'Project not found.');

  const bookmarked = project.bookmarks.some(id => id.equals(userId));
  if (bookmarked) {
    await ShowcaseProject.findByIdAndUpdate(req.params['id'], { $pull: { bookmarks: userId }, $inc: { bookmarkCount: -1 } });
    ApiResponse.success(res, 200, 'Bookmark removed');
  } else {
    await ShowcaseProject.findByIdAndUpdate(req.params['id'], { $addToSet: { bookmarks: userId }, $inc: { bookmarkCount: 1 } });
    ApiResponse.success(res, 200, 'Project bookmarked');
  }
}));

// DELETE /api/v1/showcase/:id
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const project = await ShowcaseProject.findOne({ _id: req.params['id'], authorId: req.user!.userId });
  if (!project) throw new ApiError(404, 'Project not found or not yours.');
  await ShowcaseProject.findByIdAndDelete(req.params['id']);
  ApiResponse.success(res, 200, 'Project deleted');
}));

// PUT /api/v1/showcase/:id/feature — admin only
router.put('/:id/feature', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { isFeatured } = req.body as { isFeatured: boolean };
  const project = await ShowcaseProject.findByIdAndUpdate(req.params['id'], { isFeatured }, { new: true });
  if (!project) throw new ApiError(404, 'Project not found.');
  ApiResponse.success(res, 200, 'Feature status updated', project);
}));

export default router;
