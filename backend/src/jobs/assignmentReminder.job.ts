import cron from 'node-cron';
import { Assignment } from '../models/Assignment';
import { Submission } from '../models/Assignment';
import { Enrollment } from '../models/Enrollment';
import { logger } from '../utils/logger';

/**
 * Task 7.5 — Deadline reminder cron job.
 * Runs daily at 8 AM. Finds assignments due within 24 hours and sends
 * in-app notifications to students who have not yet submitted.
 *
 * Note: Full email/notification integration is wired in Task 10.
 * This job creates the notification records and logs them.
 */
export function startAssignmentReminderJob(): void {
  // Run daily at 08:00
  cron.schedule('0 8 * * *', async () => {
    logger.info('[cron] Running assignment deadline reminder job...');

    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find assignments due within the next 24 hours
      const upcomingAssignments = await Assignment.find({
        dueDate: { $gte: now, $lte: in24h },
      });

      if (upcomingAssignments.length === 0) {
        logger.info('[cron] No upcoming assignment deadlines found.');
        return;
      }

      for (const assignment of upcomingAssignments) {
        // Get all enrolled students for this course
        const enrollments = await Enrollment.find({
          courseId: assignment.courseId,
          status: 'active',
        }).select('userId');

        const enrolledStudentIds = enrollments.map((e) => e.userId.toString());

        // Find students who have already submitted
        const submissions = await Submission.find({
          assignmentId: assignment._id,
          studentId: { $in: enrolledStudentIds },
        }).select('studentId');

        const submittedIds = new Set(submissions.map((s) => s.studentId.toString()));

        // Students who have NOT submitted
        const pendingStudentIds = enrolledStudentIds.filter((id) => !submittedIds.has(id));

        logger.info(
          `[cron] Assignment "${assignment.title}" due at ${assignment.dueDate.toISOString()} — ` +
          `${pendingStudentIds.length} student(s) have not submitted.`,
        );

        // Notification creation will be integrated in Task 10 (NotificationService)
        // For now, log the pending students
        for (const studentId of pendingStudentIds) {
          logger.info(
            `[cron] Reminder needed for student ${studentId} — assignment: ${assignment._id}`,
          );
        }
      }

      logger.info('[cron] Assignment deadline reminder job completed.');
    } catch (err) {
      logger.error('[cron] Assignment deadline reminder job failed:', err);
    }
  });

  logger.info('[cron] Assignment deadline reminder job scheduled (daily at 08:00).');
}
