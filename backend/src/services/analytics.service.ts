import { Types } from 'mongoose';
import { UserAnalytics } from '../models/Analytics';
import { User } from '../models/User';
import { Course } from '../models/Course';
import { Enrollment, LessonProgress } from '../models/Enrollment';
import { QuizAttempt } from '../models/Quiz';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

export const AnalyticsService = {

  /**
   * Task 11.2 — Last 30 days of daily snapshots for the authenticated student.
   */
  async getStudentAnalytics(userId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    since.setHours(0, 0, 0, 0);

    const snapshots = await UserAnalytics.find({
      userId: new Types.ObjectId(userId),
      date: { $gte: since },
    }).sort({ date: 1 });

    return snapshots;
  },

  /**
   * Task 11.3 — Course analytics for teacher.
   */
  async getCourseAnalytics(courseId: string, teacherId: string, role: string) {
    if (!Types.ObjectId.isValid(courseId)) throw new ApiError(400, 'Invalid course ID.');

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError(404, 'Course not found.');
    if (role !== 'admin' && course.instructor.toString() !== teacherId) {
      throw new ApiError(403, 'Permission denied.');
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalEnrollments, activeStudents, enrollments, attempts] = await Promise.all([
      Enrollment.countDocuments({ courseId }),
      Enrollment.countDocuments({ courseId, lastAccessedAt: { $gte: sevenDaysAgo } }),
      Enrollment.find({ courseId }).select('progress completedLessons'),
      QuizAttempt.find({
        quizId: { $in: await import('../models/Quiz').then(m => m.Quiz.find({ courseId }).distinct('_id')) },
        status: 'evaluated',
      }).select('percentage'),
    ]);

    const avgCompletion = enrollments.length > 0
      ? Math.round(enrollments.reduce((s, e) => s + e.progress, 0) / enrollments.length)
      : 0;

    const avgQuizScore = attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / attempts.length)
      : 0;

    // Per-lesson completion rates
    const lessonProgress = await LessonProgress.aggregate([
      { $match: { courseId: new Types.ObjectId(courseId), completed: true } },
      { $group: { _id: '$lessonId', completedCount: { $sum: 1 } } },
    ]);

    return {
      totalEnrollments,
      activeStudents,
      averageCompletionRate: avgCompletion,
      averageQuizScore: avgQuizScore,
      lessonCompletionRates: lessonProgress.map(l => ({
        lessonId: l._id,
        completedCount: l.completedCount,
        completionRate: totalEnrollments > 0
          ? Math.round((l.completedCount / totalEnrollments) * 100)
          : 0,
      })),
    };
  },

  /**
   * Task 11.4 — Admin platform analytics.
   */
  async getAdminAnalytics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, newUsers, totalCourses, totalEnrollments] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Course.countDocuments({ deletedAt: null }),
      Enrollment.countDocuments(),
    ]);

    // Daily new user trend (last 30 days)
    const dailyTrend = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      totalUsers,
      newUsers,
      totalCourses,
      totalEnrollments,
      revenue: 0, // payment integration is future scope
      dailyNewUsers: dailyTrend.map(d => ({ date: d._id, count: d.count })),
    };
  },

  /**
   * Task 11.5 — Export platform analytics as CSV.
   */
  async exportAnalyticsCSV() {
    const data = await AnalyticsService.getAdminAnalytics();

    const rows = [
      ['Metric', 'Value'],
      ['Total Users', String(data.totalUsers)],
      ['New Users (30d)', String(data.newUsers)],
      ['Total Courses', String(data.totalCourses)],
      ['Total Enrollments', String(data.totalEnrollments)],
      ['Revenue', String(data.revenue)],
      [],
      ['Date', 'New Users'],
      ...data.dailyNewUsers.map(d => [d.date, String(d.count)]),
    ];

    return rows.map(r => r.join(',')).join('\n');
  },

  /**
   * Task 11.1 — Daily analytics snapshot (called by cron job).
   */
  async createDailySnapshot(userId: string, date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [lessonsCompleted, quizAttempts, user] = await Promise.all([
      LessonProgress.countDocuments({
        userId: new Types.ObjectId(userId),
        completedAt: { $gte: dayStart, $lte: dayEnd },
      }),
      QuizAttempt.find({
        userId: new Types.ObjectId(userId),
        submittedAt: { $gte: dayStart, $lte: dayEnd },
        status: 'evaluated',
      }).select('percentage'),
      User.findById(userId).select('gamification.xp'),
    ]);

    const avgQuizScore = quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / quizAttempts.length)
      : 0;

    await UserAnalytics.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), date: dayStart },
      {
        $set: {
          lessonsCompleted,
          quizzesTaken: quizAttempts.length,
          averageQuizScore: avgQuizScore,
          xpEarned: user?.gamification?.xp ?? 0,
        },
        $inc: { loginCount: 0 }, // loginCount incremented separately
      },
      { upsert: true, new: true },
    );

    logger.info(`[analytics] Daily snapshot created for user ${userId} on ${dayStart.toISOString().split('T')[0]}`);
  },
};
