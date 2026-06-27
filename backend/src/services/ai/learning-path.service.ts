import { Types } from 'mongoose';
import { User } from '../../models/User';
import { Course } from '../../models/Course';
import { Enrollment } from '../../models/Enrollment';
import { LearningPath } from '../../models/LearningPath';
import { AIRouter } from './ai.router';
import { AIUsageTracker } from './usage-tracker.service';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';

/**
 * Task 12.6 — Learning Path Generator.
 */
export const LearningPathService = {
  async generate(userId: string, goal: string, level: string, hoursPerDay: number, weeks: number) {
    await AIUsageTracker.checkAndLog(userId, 'learning_path');

    const user = await User.findById(userId).select('skills');
    if (!user) throw new ApiError(404, 'User not found.');

    const completedEnrollments = await Enrollment.find({ userId, status: 'completed' })
      .populate('courseId', 'title tags');

    const completedTitles = completedEnrollments.map(e => (e.courseId as unknown as { title: string })?.title ?? '');

    const prompt = `
You are a learning path advisor. Create a ${weeks}-week learning path for a student.

Goal: ${goal}
Current level: ${level}
Available hours per day: ${hoursPerDay}
Current skills: ${user.skills.join(', ') || 'none'}
Completed courses: ${completedTitles.join(', ') || 'none'}

Return JSON:
{
  "weeklyPlan": [{"week": 1, "skill": "...", "courseTitle": "...", "estimatedHours": 5, "topics": ["..."]}],
  "milestones": [{"week": 4, "title": "...", "description": "..."}],
  "skillGaps": ["gap1", "gap2"]
}`;

    const raw = await AIRouter.generate(prompt, { jsonMode: true });
    let aiPlan;
    try { aiPlan = JSON.parse(raw); } catch { aiPlan = { weeklyPlan: [], milestones: [], skillGaps: [] }; }

    // Match courses from DB for each week
    const weeklyPlan = await Promise.all(
      (aiPlan.weeklyPlan ?? []).map(async (w: { week: number; skill: string; courseTitle: string; estimatedHours: number; topics: string[] }) => {
        const course = await Course.findOne({
          status: 'published',
          deletedAt: null,
          $or: [
            { title: { $regex: w.skill, $options: 'i' } },
            { tags: { $in: [w.skill.toLowerCase()] } },
          ],
        }).select('_id title');

        return {
          week: w.week,
          skill: w.skill,
          courseId: course?._id,
          courseTitle: course?.title ?? w.courseTitle,
          estimatedHours: w.estimatedHours,
          topics: w.topics ?? [],
        };
      }),
    );

    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + weeks * 7);

    const learningPath = await LearningPath.create({
      userId: new Types.ObjectId(userId),
      goal,
      currentLevel: level,
      totalWeeks: weeks,
      availableHoursPerDay: hoursPerDay,
      weeklyPlan,
      milestones: (aiPlan.milestones ?? []).map((m: { week: number; title: string; description: string }) => ({ ...m, completed: false })),
      estimatedCompletionDate: completionDate,
      progress: 0,
      status: 'active',
    });

    logger.info(`[ai-learning-path] Generated learning path for user ${userId}`);
    return learningPath;
  },
};
