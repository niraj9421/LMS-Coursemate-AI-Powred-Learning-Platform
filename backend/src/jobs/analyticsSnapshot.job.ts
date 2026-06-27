import cron from 'node-cron';
import { User } from '../models/User';
import { AnalyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';

/**
 * Task 11.1 — Daily analytics snapshot cron job.
 * Runs at midnight UTC. Aggregates each active student's metrics for the day.
 */
export function startAnalyticsSnapshotJob(): void {
  cron.schedule('0 0 * * *', async () => {
    logger.info('[cron] Running daily analytics snapshot job...');
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Get all students active in the last 7 days
      const activeStudents = await User.find({
        role: 'student',
        'gamification.lastActiveDate': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }).select('_id');

      for (const student of activeStudents) {
        await AnalyticsService.createDailySnapshot(student._id.toString(), yesterday)
          .catch(err => logger.error(`[cron] Snapshot failed for ${student._id}:`, err));
      }

      logger.info(`[cron] Analytics snapshots created for ${activeStudents.length} students.`);
    } catch (err) {
      logger.error('[cron] Analytics snapshot job failed:', err);
    }
  });

  logger.info('[cron] Analytics snapshot job scheduled (daily at midnight).');
}
