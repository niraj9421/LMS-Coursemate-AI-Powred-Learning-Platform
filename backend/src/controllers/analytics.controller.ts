import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const AnalyticsController = {

  // GET /api/v1/users/me/analytics
  getStudentAnalytics: asyncHandler(async (req: Request, res: Response) => {
    const data = await AnalyticsService.getStudentAnalytics(req.user!.userId);
    ApiResponse.success(res, 200, 'Analytics fetched', data);
  }),

  // GET /api/v1/courses/:id/analytics — teacher/admin
  getCourseAnalytics: asyncHandler(async (req: Request, res: Response) => {
    const data = await AnalyticsService.getCourseAnalytics(
      req.params['id']!,
      req.user!.userId,
      req.user!.role,
    );
    ApiResponse.success(res, 200, 'Course analytics fetched', data);
  }),

  // GET /api/v1/admin/analytics
  getAdminAnalytics: asyncHandler(async (_req: Request, res: Response) => {
    const data = await AnalyticsService.getAdminAnalytics();
    ApiResponse.success(res, 200, 'Admin analytics fetched', data);
  }),

  // GET /api/v1/admin/analytics/export
  exportAnalytics: asyncHandler(async (_req: Request, res: Response) => {
    const csv = await AnalyticsService.exportAnalyticsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
    res.status(200).send(csv);
  }),
};
