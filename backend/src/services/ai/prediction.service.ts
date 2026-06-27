import { Types } from 'mongoose';
import { Enrollment, LessonProgress } from '../../models/Enrollment';
import { QuizAttempt } from '../../models/Quiz';
import { Submission } from '../../models/Assignment';
import { User } from '../../models/User';
import { AIRouter } from './ai.router';
import { logger } from '../../utils/logger';

/**
 * Task 12.9 — Performance Prediction service.
 */
export const PredictionService = {
  async predict(userId: string, courseId: string) {
    const [enrollment, lessonProgress, quizAttempts, submissions, user] = await Promise.all([
      Enrollment.findOne({ userId, courseId }),
      LessonProgress.countDocuments({ userId: new Types.ObjectId(userId), courseId: new Types.ObjectId(courseId), completed: true }),
      QuizAttempt.find({ userId: new Types.ObjectId(userId), status: 'evaluated' }).select('percentage'),
      Submission.countDocuments({ studentId: userId, courseId }),
      User.findById(userId).select('gamification'),
    ]);

    const completionRate = enrollment?.progress ?? 0;
    const avgQuizScore = quizAttempts.length > 0
      ? quizAttempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / quizAttempts.length
      : 0;
    const streak = user?.gamification?.streak ?? 0;

    // Weighted scoring model
    const score = Math.round(
      completionRate * 0.35 +
      avgQuizScore * 0.30 +
      Math.min(streak * 2, 20) * 0.15 +
      Math.min(submissions * 10, 20) * 0.10 +
      Math.min(lessonProgress * 2, 20) * 0.10,
    );

    const riskLevel = score >= 70 ? 'low' : score >= 40 ? 'medium' : 'high';

    const prompt = `
A student has the following metrics for a course:
- Completion rate: ${completionRate}%
- Average quiz score: ${Math.round(avgQuizScore)}%
- Current streak: ${streak} days
- Assignments submitted: ${submissions}
- Lessons completed: ${lessonProgress}
- Overall performance score: ${score}/100
- Risk level: ${riskLevel}

Identify 3 specific weak areas and provide an improvement plan.
Return JSON: { "weakAreas": ["area1", "area2", "area3"], "improvementPlan": "Detailed plan..." }`;

    const raw = await AIRouter.generate(prompt, { jsonMode: true });
    let aiInsights;
    try { aiInsights = JSON.parse(raw); } catch { aiInsights = { weakAreas: [], improvementPlan: '' }; }

    logger.info(`[ai-prediction] Predicted performance for user ${userId} in course ${courseId}: score=${score}, risk=${riskLevel}`);

    return {
      score,
      riskLevel,
      metrics: { completionRate, avgQuizScore: Math.round(avgQuizScore), streak, submissions, lessonsCompleted: lessonProgress },
      weakAreas: aiInsights.weakAreas ?? [],
      improvementPlan: aiInsights.improvementPlan ?? '',
    };
  },
};
