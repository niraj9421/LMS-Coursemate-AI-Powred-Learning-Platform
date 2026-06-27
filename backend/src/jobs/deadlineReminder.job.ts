import cron from 'node-cron';
import { Assignment, Submission } from '../models/Assignment';
import { Enrollment } from '../models/Enrollment';
import { User } from '../models/User';
import { NotificationService } from '../services/notification.service';
import { EmailService } from '../services/email.service';
import { logger } from '../utils/logger';

/**
 * Task 10.7 — Deadline reminder cron job.
 * Runs daily at 8 AM. Finds assignments due within 24 hours,
 * creates in-app notifications and sends reminder emails to non-submitted students.
 */
export function startDeadlineReminderJob(): void {
  cron.schedule('0 8 * * *', async () => {
    logger.info('[cron] Running deadline reminder job...');

    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingAssignments = await Assignment.find({
        dueDate: { $gte: now, $lte: in24h },
      });

      for (const assignment of upcomingAssignments) {
        const enrollments = await Enrollment.find({
          courseId: assignment.courseId,
          status: 'active',
        }).select('userId');

        const enrolledIds = enrollments.map((e) => e.userId.toString());

        const submissions = await Submission.find({
          assignmentId: assignment._id,
          studentId: { $in: enrolledIds },
        }).select('studentId');

        const submittedIds = new Set(submissions.map((s) => s.studentId.toString()));
        const pendingIds = enrolledIds.filter((id) => !submittedIds.has(id));

        for (const studentId of pendingIds) {
          // In-app notification
          await NotificationService.create(
            studentId,
            'assignment_due',
            'Assignment Due Soon',
            `"${assignment.title}" is due within 24 hours. Submit before the deadline!`,
            `/assignments/${String(assignment._id)}`,
          ).catch((err) => logger.error('[cron] Notification creation failed:', err));

          // Email reminder
          const student = await User.findById(studentId).select('name email');
          if (student?.email) {
            await EmailService.sendDeadlineReminder(
              student.email,
              student.name,
              assignment.title,
              assignment.dueDate,
            ).catch((err) => logger.error('[cron] Email reminder failed:', err));
          }
        }

        logger.info(`[cron] Sent reminders for assignment "${assignment.title}" to ${pendingIds.length} student(s).`);
      }

      logger.info('[cron] Deadline reminder job completed.');
    } catch (err) {
      logger.error('[cron] Deadline reminder job failed:', err);
    }
  });

  logger.info('[cron] Deadline reminder job scheduled (daily at 08:00).');
}
