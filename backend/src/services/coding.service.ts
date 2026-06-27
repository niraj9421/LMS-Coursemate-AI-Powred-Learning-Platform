import { Types } from 'mongoose';
import axios from 'axios';
import { CodingProblem, CodingSubmission, CodingStats } from '../models/CodingProblem';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { GamificationService } from './gamification.service';

// Judge0 API config — use free instance or RapidAPI
const JUDGE0_URL = process.env['JUDGE0_URL'] ?? 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_KEY = process.env['JUDGE0_API_KEY'] ?? '';

const LANGUAGE_IDS: Record<string, number> = {
  'c':          50,
  'cpp':        54,
  'java':       62,
  'python':     71,
  'javascript': 63,
  'typescript': 74,
};

export const CodingService = {

  // ── Get problems list ─────────────────────────────────────────────────────
  async getProblems(filters: {
    difficulty?: string; category?: string; search?: string;
    page?: number; limit?: number;
  }) {
    const { difficulty, category, search, page = 1, limit = 20 } = filters;
    const query: Record<string, unknown> = { isActive: true };
    if (difficulty) query['difficulty'] = difficulty;
    if (category)   query['category'] = category;
    if (search)     query['$or'] = [
      { title: { $regex: search, $options: 'i' } },
      { tags:  { $regex: search, $options: 'i' } },
    ];

    const [problems, total] = await Promise.all([
      CodingProblem.find(query)
        .select('-testCases -solution -starterCode')
        .sort({ difficulty: 1, acceptanceRate: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      CodingProblem.countDocuments(query),
    ]);
    return { problems, total, page, limit, pages: Math.ceil(total / limit) };
  },

  // ── Get single problem ────────────────────────────────────────────────────
  async getProblem(slugOrId: string, userId?: string) {
    const query = Types.ObjectId.isValid(slugOrId)
      ? { _id: slugOrId }
      : { slug: slugOrId };

    const problem = await CodingProblem.findOne({ ...query, isActive: true })
      .select('-testCases.expectedOutput -solution'); // hide answers

    if (!problem) throw new ApiError(404, 'Problem not found.');

    let userStatus: string | null = null;
    if (userId) {
      const lastSub = await CodingSubmission.findOne({
        userId, problemId: problem._id, status: 'accepted',
      });
      userStatus = lastSub ? 'solved' : null;
    }

    return { problem, userStatus };
  },

  // ── Run code (visible test cases only) ───────────────────────────────────
  async runCode(problemId: string, language: string, code: string) {
    const problem = await CodingProblem.findById(problemId);
    if (!problem) throw new ApiError(404, 'Problem not found.');

    const langId = LANGUAGE_IDS[language];
    if (!langId) throw new ApiError(400, `Unsupported language: ${language}`);

    const visibleCases = problem.testCases.filter(t => !t.isHidden).slice(0, 3);
    const results = [];

    for (const tc of visibleCases) {
      const result = await CodingService.executeCode(code, langId, tc.input);
      const stdout = (result.stdout ?? '').trim();
      const expected = tc.expectedOutput.trim();
      results.push({
        input: tc.input,
        expectedOutput: expected,
        actualOutput: stdout,
        passed: stdout === expected,
        stderr: result.stderr,
        runtime: result.time ? Math.round(parseFloat(result.time) * 1000) : 0,
        status: result.status?.description ?? 'Unknown',
      });
    }

    return { results, passed: results.filter(r => r.passed).length, total: results.length };
  },

  // ── Submit code (all test cases) ──────────────────────────────────────────
  async submitCode(problemId: string, userId: string, language: string, code: string) {
    const problem = await CodingProblem.findById(problemId);
    if (!problem) throw new ApiError(404, 'Problem not found.');

    const langId = LANGUAGE_IDS[language];
    if (!langId) throw new ApiError(400, `Unsupported language: ${language}`);

    let passedCount = 0;
    let totalRuntime = 0;
    let errorMessage: string | undefined;
    let finalStatus: ICodingSubmission['status'] = 'accepted';

    for (const tc of problem.testCases) {
      const result = await CodingService.executeCode(code, langId, tc.input);
      const stdout = result.stdout?.trim() ?? '';
      const statusDesc = result.status?.description ?? '';

      if (statusDesc.toLowerCase().includes('time limit')) {
        finalStatus = 'time_limit'; errorMessage = 'Time Limit Exceeded'; break;
      }
      if (result.stderr || statusDesc.toLowerCase().includes('error')) {
        finalStatus = 'runtime_error'; errorMessage = result.stderr ?? 'Runtime Error'; break;
      }
      if (result.compile_output) {
        finalStatus = 'compile_error'; errorMessage = result.compile_output; break;
      }
      if (stdout === tc.expectedOutput.trim()) {
        passedCount++;
        totalRuntime += result.time ? Math.round(parseFloat(result.time) * 1000) : 0;
      } else {
        finalStatus = 'wrong_answer';
        errorMessage = `Expected: ${tc.expectedOutput.trim()}\nGot: ${stdout}`;
        break;
      }
    }

    const submission = await CodingSubmission.create({
      userId, problemId,
      language, code,
      status: finalStatus,
      runtime: totalRuntime,
      testCasesPassed: passedCount,
      testCasesTotal: problem.testCases.length,
      errorMessage,
    });

    // Update problem stats
    await CodingProblem.findByIdAndUpdate(problemId, {
      $inc: {
        totalSubmissions: 1,
        ...(finalStatus === 'accepted' ? { totalAccepted: 1 } : {}),
      },
    });

    // Update user coding stats if accepted
    if (finalStatus === 'accepted') {
      await CodingService.updateUserStats(userId, problem._id.toString(), problem.difficulty);
      await GamificationService.awardXP(userId, 'quiz_pass', { source: 'coding' });
    }

    // Trigger async AI review
    if (finalStatus === 'accepted') {
      CodingService.generateAIReview(submission._id.toString(), code, language).catch(() => {});
    }

    logger.info(`[coding] User ${userId} submitted problem ${problemId} → ${finalStatus}`);
    return submission;
  },

  // ── Execute via Judge0 or local runner ───────────────────────────────────
  async executeCode(code: string, languageId: number, stdin: string) {
    // Map languageId back to language string for local runner
    const LANG_MAP: Record<number, string> = { 50: 'c', 54: 'cpp', 62: 'java', 71: 'python', 63: 'javascript', 74: 'typescript' };
    const language = LANG_MAP[languageId] ?? 'javascript';

    // If no Judge0 key, use local execution
    if (!JUDGE0_KEY) {
      const { CodeRunner } = await import('./codeRunner.service');
      return await CodeRunner.run(code, language, stdin);
    }

    // Use Judge0 if key is configured
    try {
      const { data: submission } = await axios.post(
        `${JUDGE0_URL}/submissions`,
        { source_code: Buffer.from(code).toString('base64'), language_id: languageId, stdin: Buffer.from(stdin).toString('base64'), base64_encoded: true },
        { headers: { 'X-RapidAPI-Key': JUDGE0_KEY, 'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com', 'content-type': 'application/json' }, params: { base64_encoded: 'true', wait: 'true' }, timeout: 15000 },
      );
      return submission;
    } catch (err) {
      logger.error('[coding] Judge0 execution failed:', err);
      // Fallback to local execution
      const { CodeRunner } = await import('./codeRunner.service');
      return await CodeRunner.run(code, language, stdin);
    }
  },

  // ── Update user coding stats ──────────────────────────────────────────────
  async updateUserStats(userId: string, problemId: string, difficulty: string) {
    const stats = await CodingStats.findOne({ userId }) ?? await CodingStats.create({ userId });

    const alreadySolved = stats.solvedProblems.some(id => id.toString() === problemId);
    if (alreadySolved) return; // don't double-count

    const lastDate = stats.lastSolvedDate?.toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const newStreak = lastDate === yesterday ? stats.currentStreak + 1 : 1;

    const diffKey = difficulty === 'easy' ? 'easySolved' : difficulty === 'medium' ? 'mediumSolved' : 'hardSolved';

    await CodingStats.findOneAndUpdate(
      { userId },
      {
        $inc: { totalSolved: 1, [diffKey]: 1, totalSubmissions: 1 } as Record<string, number>,
        $set: { currentStreak: newStreak, maxStreak: Math.max(stats.maxStreak, newStreak), lastSolvedDate: new Date() },
        $push: { solvedProblems: new Types.ObjectId(problemId) },
      },
      { upsert: true },
    );
  },

  // ── AI Code Review ────────────────────────────────────────────────────────
  async generateAIReview(submissionId: string, code: string, language: string) {
    try {
      const { AIRouter } = await import('./ai/ai.router');
      const prompt = `Review this ${language} solution:\n\`\`\`${language}\n${code.slice(0, 2000)}\n\`\`\`\nProvide JSON: {"timeComplexity":"O(n)","spaceComplexity":"O(1)","suggestions":["..."],"alternativeSolution":"..."}`;
      const raw = await AIRouter.generate(prompt, { jsonMode: true });
      const review = JSON.parse(raw);
      await CodingSubmission.findByIdAndUpdate(submissionId, { aiReview: review });
    } catch (err) {
      logger.warn('[coding] AI review generation failed:', err);
    }
  },

  // ── Leaderboard ───────────────────────────────────────────────────────────
  async getLeaderboard(limit = 50) {
    const stats = await CodingStats.find()
      .sort({ totalSolved: -1, acceptanceRate: -1 })
      .limit(limit)
      .populate('userId', 'name avatar');

    return stats.map((s, i) => ({
      rank: i + 1,
      user: s.userId,
      totalSolved: s.totalSolved,
      easySolved: s.easySolved,
      mediumSolved: s.mediumSolved,
      hardSolved: s.hardSolved,
      currentStreak: s.currentStreak,
    }));
  },

  // ── User stats ────────────────────────────────────────────────────────────
  async getUserStats(userId: string) {
    const stats = await CodingStats.findOne({ userId });
    if (!stats) return { totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0, currentStreak: 0, maxStreak: 0, totalSubmissions: 0, solvedProblems: [] };
    return stats;
  },
};

// Fix type reference
type ICodingSubmission = { status: 'accepted' | 'wrong_answer' | 'time_limit' | 'runtime_error' | 'compile_error' | 'pending' };
