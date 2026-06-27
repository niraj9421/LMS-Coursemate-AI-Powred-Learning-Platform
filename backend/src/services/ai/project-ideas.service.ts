import { AIRouter } from './ai.router';
import { AIUsageTracker } from './usage-tracker.service';
import { logger } from '../../utils/logger';

/**
 * Task 12.10 — Project Idea Generator.
 */
export const ProjectIdeasService = {
  async generate(userId: string, domain: string, skillLevel: string) {
    await AIUsageTracker.checkAndLog(userId, 'project_ideas');

    const prompt = `
Generate 3 project ideas for a ${skillLevel} developer in the ${domain} domain.
Each project should be practical and buildable.

Return JSON:
{
  "ideas": [
    {
      "title": "Project name",
      "description": "2-3 sentence description",
      "features": ["feature1", "feature2", "feature3"],
      "techStack": ["tech1", "tech2"],
      "architecture": "Brief architecture description",
      "difficulty": "beginner|intermediate|advanced",
      "estimatedTime": "e.g. 2-4 weeks"
    }
  ]
}`;

    const raw = await AIRouter.generate(prompt, { jsonMode: true });
    let result;
    try { result = JSON.parse(raw); } catch { result = { ideas: [] }; }

    logger.info(`[ai-project-ideas] Generated ${result.ideas?.length ?? 0} ideas for user ${userId}`);
    return result.ideas ?? [];
  },
};
