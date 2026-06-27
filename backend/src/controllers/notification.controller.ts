import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const NotificationController = {

  // GET /api/v1/notifications
  getNotifications: asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query['page'] as string ?? '1', 10);
    const limit = parseInt(req.query['limit'] as string ?? '20', 10);
    const result = await NotificationService.getNotifications(req.user!.userId, page, limit);
    ApiResponse.success(res, 200, 'Notifications fetched', result);
  }),

  // PUT /api/v1/notifications/:id/read
  markRead: asyncHandler(async (req: Request, res: Response) => {
    const notification = await NotificationService.markRead(req.params['id']!, req.user!.userId);
    ApiResponse.success(res, 200, 'Notification marked as read', notification);
  }),

  // PUT /api/v1/notifications/read-all
  markAllRead: asyncHandler(async (req: Request, res: Response) => {
    const result = await NotificationService.markAllRead(req.user!.userId);
    ApiResponse.success(res, 200, 'All notifications marked as read', result);
  }),
};
