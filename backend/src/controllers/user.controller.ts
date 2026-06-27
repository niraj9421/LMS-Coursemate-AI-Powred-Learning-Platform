import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

export const UserController = {

  // GET /api/v1/users/me
  getMe: asyncHandler(async (req: Request, res: Response) => {
    const user = await UserService.getMe(req.user!.userId);
    ApiResponse.success(res, 200, 'Profile fetched', user);
  }),

  // PUT /api/v1/users/me
  updateMe: asyncHandler(async (req: Request, res: Response) => {
    const user = await UserService.updateMe(req.user!.userId, req.body);
    ApiResponse.success(res, 200, 'Profile updated', user);
  }),

  // POST /api/v1/users/me/avatar
  uploadAvatar: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ApiError(400, 'No image file provided.');
    }
    const result = await UserService.uploadAvatar(
      req.user!.userId,
      req.file.buffer,
      req.file.mimetype,
    );
    ApiResponse.success(res, 200, 'Avatar updated', result);
  }),

  // GET /api/v1/users/:id/profile
  getPublicProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await UserService.getPublicProfile(req.params['id'] ?? '');
    ApiResponse.success(res, 200, 'Profile fetched', user);
  }),

  // GET /api/v1/users/me/analytics
  getMyAnalytics: asyncHandler(async (req: Request, res: Response) => {
    const data = await UserService.getMyAnalytics(req.user!.userId);
    ApiResponse.success(res, 200, 'Analytics fetched', data);
  }),

  // GET /api/v1/users/me/certificates
  getMyCertificates: asyncHandler(async (req: Request, res: Response) => {
    const certs = await UserService.getMyCertificates(req.user!.userId);
    ApiResponse.success(res, 200, 'Certificates fetched', certs);
  }),

  // GET /api/v1/users/me/enrollments
  getMyEnrollments: asyncHandler(async (req: Request, res: Response) => {
    const { Enrollment } = await import('../models/Enrollment');
    const enrollments = await Enrollment.find({ userId: req.user!.userId })
      .populate('courseId', 'title thumbnail')
      .sort({ lastAccessedAt: -1 });
    ApiResponse.success(res, 200, 'Enrollments fetched', enrollments);
  }),

  // GET /api/v1/users/course/:courseId/students — teacher sees enrolled students
  getCourseStudents: asyncHandler(async (req: Request, res: Response) => {
    const { Enrollment } = await import('../models/Enrollment');
    const { Course } = await import('../models/Course');

    const course = await Course.findById(req.params['courseId']);
    if (!course) throw new ApiError(404, 'Course not found.');

    // Only the instructor or admin can view enrolled students
    if (course.instructor.toString() !== req.user!.userId && req.user!.role !== 'admin') {
      throw new ApiError(403, 'Permission denied.');
    }

    const enrollments = await Enrollment.find({ courseId: req.params['courseId'] })
      .populate('userId', 'name email avatar gamification')
      .sort({ enrolledAt: -1 });

    ApiResponse.success(res, 200, 'Students fetched', {
      course: { title: course.title, enrollmentCount: course.enrollmentCount },
      students: enrollments.map(e => ({
        enrollment: {
          _id: e._id,
          progress: e.progress,
          status: e.status,
          enrolledAt: e.enrolledAt,
          lastAccessedAt: e.lastAccessedAt,
          completedLessons: e.completedLessons.length,
        },
        student: e.userId,
      })),
    });
  }),
};
