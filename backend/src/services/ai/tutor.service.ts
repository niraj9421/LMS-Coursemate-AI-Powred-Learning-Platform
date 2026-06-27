import crypto from 'crypto';
import { Course } from '../../models/Course';
import { AIRouter } from './ai.router';
import { TutorPrompts } from './prompts/tutor.prompts';
import { AIUsageTracker } from './usage-tracker.service';
import { getCache, setCache } from '../../config/redis';
import { logger } from '../../utils/logger';

export const TutorService = {
  async answer(userId: string, courseId: string | undefined, question: string, history: Array<{role: string; content: string}> = []) {
    await AIUsageTracker.checkAndLog(userId, 'tutor');

    // Cache key
    const cacheKey = `tutor:${courseId ?? 'general'}:${crypto.createHash('md5').update(question).digest('hex')}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    // Build course context — optional
    let courseContext = 'General programming and technology topics.';
    if (courseId) {
      const course = await Course.findById(courseId).select('title description');
      if (course) {
        courseContext = `Course: ${course.title}\n${course.description ?? ''}`;
      }
    }

    const historyText = history.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n');

    const raw = await AIRouter.generate(
      TutorPrompts.answer(courseContext, historyText, question),
      { jsonMode: true },
    );

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      // If not valid JSON, wrap the text response
      result = {
        answer: raw,
        examples: [],
        relatedTopics: [],
        followUpQuestions: [],
      };
    }

    await setCache(cacheKey, result, 3600);
    logger.info(`[ai-tutor] Answered question for user ${userId}`);
    return result;
  },
};
