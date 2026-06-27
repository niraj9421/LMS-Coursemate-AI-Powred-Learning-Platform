import { Request, Response } from 'express';
import { CourseService } from '../services/course.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';
import type { SearchCoursesInput } from '../validators/course.validator';
import { searchCoursesSchema } from '../validators/course.validator';

export const CourseController = {

  // POST /api/v1/courses
  createCourse: asyncHandler(async (req: Request, res: Response) => {
    const course = await CourseService.createCourse(
      req.body,
      req.user!.userId,
      req.file?.buffer,
    );
    ApiResponse.success(res, 201, 'Course created', course);
  }),

  // GET /api/v1/courses
  getCourses: asyncHandler(async (req: Request, res: Response) => {
    const parsed = searchCoursesSchema.safeParse(req.query);
    if (!parsed.success) throw new ApiError(422, 'Invalid query parameters');
    const result = await CourseService.getCourses(parsed.data as SearchCoursesInput);
    ApiResponse.success(res, 200, 'Courses fetched', result);
  }),

  // GET /api/v1/courses/recommended
  getRecommended: asyncHandler(async (req: Request, res: Response) => {
    const courses = await CourseService.getRecommendedCourses(req.user!.userId);
    ApiResponse.success(res, 200, 'Recommended courses fetched', courses);
  }),

  // GET /api/v1/courses/:id
  getCourse: asyncHandler(async (req: Request, res: Response) => {
    const { course, isEnrolled } = await CourseService.getCourseById(
      req.params['id'] ?? '',
      req.user?.userId,
    );
    ApiResponse.success(res, 200, 'Course fetched', { course, isEnrolled });
  }),

  // PUT /api/v1/courses/:id
  updateCourse: asyncHandler(async (req: Request, res: Response) => {
    const course = await CourseService.updateCourse(
      req.params['id'] ?? '',
      req.body,
      req.user!.userId,
      req.user!.role,
      req.file?.buffer,
    );
    ApiResponse.success(res, 200, 'Course updated', course);
  }),

  // DELETE /api/v1/courses/:id
  deleteCourse: asyncHandler(async (req: Request, res: Response) => {
    const result = await CourseService.deleteCourse(
      req.params['id'] ?? '',
      req.user!.userId,
      req.user!.role,
    );
    ApiResponse.success(res, 200, result.message);
  }),

  // POST /api/v1/courses/:id/publish
  publishCourse: asyncHandler(async (req: Request, res: Response) => {
    const course = await CourseService.publishCourse(
      req.params['id'] ?? '',
      req.user!.userId,
      req.user!.role,
    );
    ApiResponse.success(res, 200, 'Course published', course);
  }),

  // POST /api/v1/courses/:id/thumbnail — dedicated thumbnail upload
  uploadThumbnail: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new ApiError(400, 'No image file provided.');
    const { uploadImage: cloudUpload } = await import('../config/cloudinary');
    const result = await cloudUpload(req.file.buffer, {
      folder: 'lms/thumbnails',
      transformation: [{ width: 1280, height: 720, crop: 'fill' }],
      format: 'webp',
    });
    const { Course } = await import('../models/Course');
    const course = await Course.findByIdAndUpdate(
      req.params['id'],
      { thumbnail: result.secure_url },
      { new: true },
    );
    if (!course) throw new ApiError(404, 'Course not found.');
    ApiResponse.success(res, 200, 'Thumbnail uploaded', { thumbnail: result.secure_url });
  }),

  // POST /api/v1/courses/:id/enroll
  enrollStudent: asyncHandler(async (req: Request, res: Response) => {
    const enrollment = await CourseService.enrollStudent(
      req.params['id'] ?? '',
      req.user!.userId,
    );
    ApiResponse.success(res, 201, 'Enrolled successfully', enrollment);
  }),

  // GET /api/v1/courses/:id/progress
  getCourseProgress: asyncHandler(async (req: Request, res: Response) => {
    const data = await CourseService.getCourseProgress(
      req.params['id'] ?? '',
      req.user!.userId,
    );
    ApiResponse.success(res, 200, 'Progress fetched', data);
  }),

  // POST /api/v1/courses/:id/rate
  rateCourse: asyncHandler(async (req: Request, res: Response) => {
    const result = await CourseService.rateCourse(
      req.params['id'] ?? '',
      req.user!.userId,
      req.body,
    );
    ApiResponse.success(res, 200, result.message);
  }),

  // ── Chapter controllers ───────────────────────────────────────────────────

  createChapter: asyncHandler(async (req: Request, res: Response) => {
    const chapter = await CourseService.createChapter(
      req.params['id'] ?? '',
      req.body,
      req.user!.userId,
      req.user!.role,
    );
    ApiResponse.success(res, 201, 'Chapter created', chapter);
  }),

  updateChapter: asyncHandler(async (req: Request, res: Response) => {
    const chapter = await CourseService.updateChapter(
      req.params['chapterId'] ?? '',
      req.body,
      req.user!.userId,
      req.user!.role,
    );
    ApiResponse.success(res, 200, 'Chapter updated', chapter);
  }),

  deleteChapter: asyncHandler(async (req: Request, res: Response) => {
    const result = await CourseService.deleteChapter(
      req.params['chapterId'] ?? '',
      req.user!.userId,
      req.user!.role,
    );
    ApiResponse.success(res, 200, result.message);
  }),

  // ── Lesson controllers ────────────────────────────────────────────────────

  createLesson: asyncHandler(async (req: Request, res: Response) => {
    const lesson = await CourseService.createLesson(
      req.params['chapterId'] ?? '',
      req.body,
      req.user!.userId,
      req.user!.role,
      req.file?.buffer,
      req.file?.mimetype,
    );
    ApiResponse.success(res, 201, 'Lesson created', lesson);
  }),

  updateLesson: asyncHandler(async (req: Request, res: Response) => {
    const lesson = await CourseService.updateLesson(
      req.params['lessonId'] ?? '',
      req.body,
      req.user!.userId,
      req.user!.role,
    );
    ApiResponse.success(res, 200, 'Lesson updated', lesson);
  }),

  deleteLesson: asyncHandler(async (req: Request, res: Response) => {
    const result = await CourseService.deleteLesson(
      req.params['lessonId'] ?? '',
      req.user!.userId,
      req.user!.role,
    );
    ApiResponse.success(res, 200, result.message);
  }),

  completeLesson: asyncHandler(async (req: Request, res: Response) => {
    const result = await CourseService.completeLesson(
      req.params['lessonId'] ?? '',
      req.user!.userId,
      req.body,
    );
    ApiResponse.success(res, 200, 'Lesson marked complete', result);
  }),
};
