import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { News } from '../models/News';
import { Category } from '../models/Category';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';
import { AnalyticsController } from './analytics.controller';
import slugify from 'slugify';

export const AdminController = {

  // GET /api/v1/admin/users
  getUsers: asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query['page'] as string ?? '1', 10);
    const limit = parseInt(req.query['limit'] as string ?? '20', 10);
    const search = req.query['search'] as string | undefined;
    const role = req.query['role'] as string | undefined;

    const filter: Record<string, unknown> = {};
    if (search) filter['$or'] = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    if (role) filter['role'] = role;

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    ApiResponse.success(res, 200, 'Users fetched', { users, total, page, limit });
  }),

  // PUT /api/v1/admin/users/:id/role
  updateUserRole: asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.body as { role: string };
    if (!['admin', 'teacher', 'student'].includes(role)) {
      throw new ApiError(400, 'Role must be admin, teacher, or student.');
    }
    const user = await User.findByIdAndUpdate(req.params['id'], { role }, { new: true }).select('-password');
    if (!user) throw new ApiError(404, 'User not found.');
    ApiResponse.success(res, 200, 'User role updated', user);
  }),

  // DELETE /api/v1/admin/users/:id
  deleteUser: asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findByIdAndDelete(req.params['id']);
    if (!user) throw new ApiError(404, 'User not found.');
    ApiResponse.success(res, 200, 'User deleted');
  }),

  // GET /api/v1/admin/courses
  getAllCourses: asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query['page'] as string ?? '1', 10);
    const limit = parseInt(req.query['limit'] as string ?? '20', 10);
    const [courses, total] = await Promise.all([
      Course.find().populate('instructor', 'name').populate('category', 'name')
        .skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      Course.countDocuments(),
    ]);
    ApiResponse.success(res, 200, 'Courses fetched', { courses, total, page, limit });
  }),

  // PUT /api/v1/admin/courses/:id/status
  updateCourseStatus: asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body as { status: string };
    if (!['draft', 'published', 'archived'].includes(status)) {
      throw new ApiError(400, 'Status must be draft, published, or archived.');
    }
    const course = await Course.findByIdAndUpdate(req.params['id'], { status }, { new: true });
    if (!course) throw new ApiError(404, 'Course not found.');
    ApiResponse.success(res, 200, 'Course status updated', course);
  }),

  // GET /api/v1/news
  getNews: asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query['page'] as string ?? '1', 10)
    const limit = parseInt(req.query['limit'] as string ?? '20', 10)
    const categoryParam = req.query['category'] as string | undefined
    const filter: Record<string, unknown> = {}

    if (categoryParam) {
      // Accept either ObjectId or category name/slug
      if (Types.ObjectId.isValid(categoryParam)) {
        filter['category'] = new Types.ObjectId(categoryParam)
      } else {
        // Look up category by name or slug
        const cat = await Category.findOne({
          $or: [
            { slug: categoryParam.toLowerCase() },
            { name: { $regex: new RegExp(categoryParam, 'i') } },
          ],
        })
        if (cat) filter['category'] = cat._id
        // If category not found, return empty — no error
      }
    }

    const [news, total] = await Promise.all([
      News.find(filter).populate('category', 'name slug')
        .sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit),
      News.countDocuments(filter),
    ])
    ApiResponse.success(res, 200, 'News fetched', { news, total, page, limit })
  }),

  // POST /api/v1/news
  createNews: asyncHandler(async (req: Request, res: Response) => {
    const article = await News.create(req.body);
    ApiResponse.success(res, 201, 'News article created', article);
  }),

  // PUT /api/v1/news/:id
  updateNews: asyncHandler(async (req: Request, res: Response) => {
    const article = await News.findByIdAndUpdate(req.params['id'], req.body, { new: true });
    if (!article) throw new ApiError(404, 'News article not found.');
    ApiResponse.success(res, 200, 'News article updated', article);
  }),

  // DELETE /api/v1/news/:id
  deleteNews: asyncHandler(async (req: Request, res: Response) => {
    const article = await News.findByIdAndDelete(req.params['id']);
    if (!article) throw new ApiError(404, 'News article not found.');
    ApiResponse.success(res, 200, 'News article deleted');
  }),

  // GET /api/v1/categories
  getCategories: asyncHandler(async (_req: Request, res: Response) => {
    const categories = await Category.find().sort({ name: 1 });
    ApiResponse.success(res, 200, 'Categories fetched', categories);
  }),

  // POST /api/v1/categories
  createCategory: asyncHandler(async (req: Request, res: Response) => {
    const { name, description, icon } = req.body as { name: string; description?: string; icon?: string };
    const slug = slugify(name, { lower: true, strict: true });
    const category = await Category.create({ name, slug, description, icon });
    ApiResponse.success(res, 201, 'Category created', category);
  }),

  // PUT /api/v1/categories/:id
  updateCategory: asyncHandler(async (req: Request, res: Response) => {
    const update = { ...req.body };
    if (update.name) update.slug = slugify(update.name, { lower: true, strict: true });
    const category = await Category.findByIdAndUpdate(req.params['id'], update, { new: true });
    if (!category) throw new ApiError(404, 'Category not found.');
    ApiResponse.success(res, 200, 'Category updated', category);
  }),

  // DELETE /api/v1/categories/:id
  deleteCategory: asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findByIdAndDelete(req.params['id']);
    if (!category) throw new ApiError(404, 'Category not found.');
    ApiResponse.success(res, 200, 'Category deleted');
  }),

  // Analytics — delegate to AnalyticsController
  getAdminAnalytics: AnalyticsController.getAdminAnalytics,
  exportAnalytics: AnalyticsController.exportAnalytics,
};
