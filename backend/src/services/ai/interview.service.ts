import { Types } from 'mongoose';
import { InterviewSession } from '../../models/Placement';
import { AIRouter } from './ai.router';
import { InterviewPrompts } from './prompts/interview.prompts';
import { AIUsageTracker } from './usage-tracker.service';
import { GamificationService } from '../gamification.service';
import { ApiError } from '../../utils/apiError';
import { logger } from '../../utils/logger';

/**
 * Task 12.7 — AI Interview Simulator.
 */
export const InterviewService = {
  async startSession(userId: string, role: string, type: string) {
    await AIUsageTracker.checkAndLog(userId, 'interview');

    const raw = await AIRouter.generate(InterviewPrompts.generateQuestions(role, type, 5), { jsonMode: true });
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = { questions: [] }; }

    const session = await InterviewSession.create({
      userId: new Types.ObjectId(userId),
      role, type,
      questions: parsed.questions ?? [],
      answers: [],
      status: 'active',
      startedAt: new Date(),
    });

    logger.info(`[ai-interview] Started session ${session._id} for user ${userId}`);
    return { session, firstQuestion: session.questions[0] ?? null };
  },

  async submitAnswer(sessionId: string, userId: string, questionIndex: number, answer: string) {
    const session = await InterviewSession.findById(sessionId);
    if (!session) throw new ApiError(404, 'Interview session not found.');
    if (session.userId.toString() !== userId) throw new ApiError(403, 'Permission denied.');
    if (session.status !== 'active') throw new ApiError(400, 'Session is already completed.');

    const question = session.questions[questionIndex];
    if (!question) throw new ApiError(400, 'Invalid question index.');

    // Evaluate answer
    const raw = await AIRouter.generate(
      InterviewPrompts.evaluateAnswer(question.question, answer, session.role),
      { jsonMode: true },
    );
    let evaluation;
    try { evaluation = JSON.parse(raw); } catch { evaluation = { score: 50, confidence: 'medium', clarity: 'medium', feedback: 'Answer recorded.' }; }

    session.answers.push({
      questionIndex,
      answer,
      score: evaluation.score,
      confidence: evaluation.confidence,
      clarity: evaluation.clarity,
      feedback: evaluation.feedback,
    });

    const isLast = questionIndex >= session.questions.length - 1;

    if (isLast) {
      // Generate final report
      const answerSummary = session.answers.map(a => ({
        question: session.questions[a.questionIndex]?.question ?? '',
        score: a.score ?? 0,
        feedback: a.feedback ?? '',
      }));

      const reportRaw = await AIRouter.generate(
        InterviewPrompts.generateReport(session.role, answerSummary),
        { jsonMode: true },
      );
      let report;
      try { report = JSON.parse(reportRaw); } catch { report = { overallScore: 50, feedback: '', strengths: [], improvements: [] }; }

      session.overallScore = report.overallScore;
      session.feedback = report.feedback;
      session.strengths = report.strengths;
      session.improvements = report.improvements;
      session.status = 'completed';
      session.completedAt = new Date();

      // Award XP on completion
      await GamificationService.awardXP(userId, 'quiz_pass').catch(() => {});
    }

    await session.save();
    return {
      evaluation,
      nextQuestion: isLast ? null : session.questions[questionIndex + 1],
      isComplete: isLast,
      report: isLast ? { overallScore: session.overallScore, feedback: session.feedback, strengths: session.strengths, improvements: session.improvements } : null,
    };
  },
};
