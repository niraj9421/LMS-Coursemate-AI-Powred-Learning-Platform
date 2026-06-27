import { Notification, NotificationType } from '../models/Notification';
import { logger } from '../utils/logger';

// Socket.io server instance — set during app bootstrap (Task 10.5)
let _io: import('socket.io').Server | null = null;

export function setSocketServer(io: import('socket.io').Server): void {
  _io = io;
}

export const NotificationService = {

  /**
   * Task 10.1 — Create a notification and emit real-time event via Socket.io.
   */
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ) {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      isRead: false,
    });

    // Emit real-time event to the user's personal room
    if (_io) {
      _io.to(`user:${userId}`).emit('notification', {
        id: notification._id,
        type,
        title,
        message,
        link,
        createdAt: notification.createdAt,
      });
    }

    logger.info(`[notification] Created ${type} notification for user ${userId}`);
    return notification;
  },

  /**
   * Task 10.2 — Get paginated notifications for a user.
   */
  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ userId }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Task 10.3 — Mark a single notification as read.
   */
  async markRead(notificationId: string, userId: string) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true },
    );
    if (!notification) {
      const { ApiError } = await import('../utils/apiError');
      throw new ApiError(404, 'Notification not found.');
    }
    return notification;
  },

  /**
   * Task 10.4 — Mark all notifications as read for a user.
   */
  async markAllRead(userId: string) {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updated: result.modifiedCount };
  },
};
