import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'assignment_due'
  | 'course_update'
  | 'quiz_result'
  | 'badge_earned'
  | 'announcement'
  | 'enrollment_confirmed'
  | 'certificate_issued'
  | 'assignment_graded';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'assignment_due',
        'course_update',
        'quiz_result',
        'badge_earned',
        'announcement',
        'enrollment_confirmed',
        'certificate_issued',
        'assignment_graded',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
// TTL index: auto-delete notifications after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const Notification = model<INotification>('Notification', notificationSchema);
