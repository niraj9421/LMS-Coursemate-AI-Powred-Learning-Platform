import { Types } from 'mongoose';
import { Quiz, Question, QuizAttempt, IQuestion } from '../models/Quiz';
import { Course } from '../models/Course';
import { Lesson } from '../models/Lesson';
import { Enrollment } from '../models/Enrollment';
import { User } from '../models/User';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import type { CreateQuizInput, SubmitAnswerInput } from '../validators/quiz.validator';

// ─── Quiz Service ─────────────────────────────────────────────────────────────

export const QuizService = {

  /**
   * POST /api/v1/quizzes
   * Creates a quiz with embedded questions.
   * Only teachers/admins may call this; the caller must pass their userId.
   */
  async createQuiz(data: CreateQuizInput, teacherId: string) {
    // 1. Validate courseId
    if (!Types.ObjectId.isValid(data.courseId)) {
      throw new ApiError(400, 'Invalid courseId.');
    }

    const course = await Course.findOne({ _id: data.courseId, deletedAt: null });
    if (!course) {
      throw new ApiError(404, 'Course not found.');
    }

    // 2. Validate lessonId if provided
    if (data.lessonId) {
      if (!Types.ObjectId.isValid(data.lessonId)) {
        throw new ApiError(400, 'Invalid lessonId.');
      }
      const lesson = await Lesson.findById(data.lessonId);
      if (!lesson) {
        throw new ApiError(404, 'Lesson not found.');
      }
      // Ensure the lesson belongs to the same course
      if (lesson.courseId.toString() !== data.courseId) {
        throw new ApiError(400, 'Lesson does not belong to the specified course.');
      }
    }

    // 3. Create the Quiz document (without questions first to get the _id)
    const quiz = await Quiz.create({
      courseId: data.courseId,
      lessonId: data.lessonId,
      title: data.title,
      description: data.description,
      settings: data.settings,
      xpReward: data.xpReward,
      questions: [],
    });

    // 4. Create Question documents linked to this quiz
    const questionDocs = await Question.insertMany(
      data.questions.map((q) => ({
        quizId: quiz._id,
        type: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        marks: q.marks,
        difficulty: q.difficulty,
        aiGenerated: false,
      })),
    );

    // 5. Update quiz with question IDs
    const questionIds = questionDocs.map((q) => q._id);
    quiz.questions = questionIds as Types.ObjectId[];
    await quiz.save();

    logger.info(
      `[quiz] Teacher ${teacherId} created quiz "${quiz.title}" (${quiz._id}) ` +
      `with ${questionIds.length} question(s) for course ${data.courseId}`,
    );

    // Return quiz populated with questions
    const populated = await Quiz.findById(quiz._id).populate('questions');
    return populated;
  },

  /**
   * GET /api/v1/quizzes/:id
   * Returns a quiz with its questions populated.
   * - Shuffles questions if `settings.shuffleQuestions` is true.
   * - Strips `correctAnswer` and `explanation` from each question when the
   *   caller is a student (role !== 'teacher' && role !== 'admin').
   */
  async getQuizById(quizId: string, userRole: string) {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new ApiError(400, 'Invalid quiz ID.');
    }

    const quiz = await Quiz.findById(quizId).populate<{ questions: IQuestion[] }>('questions');
    if (!quiz) {
      throw new ApiError(404, 'Quiz not found.');
    }

    // Work with a plain JS object so we can mutate freely
    const quizObj = quiz.toObject() as ReturnType<typeof quiz.toObject> & {
      questions: Array<Record<string, unknown>>;
    };

    // Shuffle questions if configured
    if (quiz.settings.shuffleQuestions) {
      for (let i = quizObj.questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [quizObj.questions[i], quizObj.questions[j]] = [quizObj.questions[j], quizObj.questions[i]];
      }
    }

    // Strip sensitive fields for students
    const isStudent = userRole !== 'teacher' && userRole !== 'admin';
    if (isStudent) {
      quizObj.questions = quizObj.questions.map((q: Record<string, unknown>) => {
        const { correctAnswer: _ca, explanation: _ex, ...rest } = q;
        return rest;
      });
    }

    return quizObj;
  },

  /**
   * POST /api/v1/quizzes/:id/start
   * Validates enrollment and attempt limits, then creates a new QuizAttempt
   * with status 'in_progress'.
   */
  async startQuiz(quizId: string, userId: string) {
    // 1. Validate quizId
    if (!Types.ObjectId.isValid(quizId)) {
      throw new ApiError(400, 'Invalid quiz ID.');
    }

    // 2. Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new ApiError(404, 'Quiz not found.');
    }

    // 3. Check the student is enrolled in the quiz's course
    const enrollment = await Enrollment.findOne({
      userId: new Types.ObjectId(userId),
      courseId: quiz.courseId,
      status: { $in: ['active', 'completed'] },
    });
    if (!enrollment) {
      throw new ApiError(403, 'You are not enrolled in this course.');
    }

    // 4. Count existing attempts and enforce maxAttempts
    const attemptCount = await QuizAttempt.countDocuments({
      quizId: new Types.ObjectId(quizId),
      userId: new Types.ObjectId(userId),
    });
    if (quiz.settings.maxAttempts > 0 && attemptCount >= quiz.settings.maxAttempts) {
      throw new ApiError(400, 'Maximum attempts reached.');
    }

    // 5. Check for an existing in-progress attempt
    const existingAttempt = await QuizAttempt.findOne({
      quizId: new Types.ObjectId(quizId),
      userId: new Types.ObjectId(userId),
      status: 'in_progress',
    });
    if (existingAttempt) {
      throw new ApiError(409, 'You already have an attempt in progress for this quiz.');
    }

    // 6. Create the new attempt
    const attempt = await QuizAttempt.create({
      quizId: new Types.ObjectId(quizId),
      userId: new Types.ObjectId(userId),
      status: 'in_progress',
      startedAt: new Date(),
      answers: new Map(),
    });

    logger.info(
      `[quiz] User ${userId} started attempt ${attempt._id} for quiz ${quizId}`,
    );

    return attempt;
  },

  /**
   * POST /api/v1/attempts/:id/answer
   * Stores a single answer in an in-progress attempt.
   * Validates ownership, status, and time limit before saving.
   */
  async submitAnswer(attemptId: string, userId: string, data: SubmitAnswerInput) {
    // 1. Validate attemptId
    if (!Types.ObjectId.isValid(attemptId)) {
      throw new ApiError(400, 'Invalid attempt ID.');
    }

    // 2. Find the attempt
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      throw new ApiError(404, 'Attempt not found.');
    }

    // 3. Verify ownership
    if (attempt.userId.toString() !== userId) {
      throw new ApiError(403, 'You do not have permission to modify this attempt.');
    }

    // 4. Verify attempt is in progress
    if (attempt.status !== 'in_progress') {
      throw new ApiError(400, 'This attempt is no longer in progress.');
    }

    // 5. Check time limit — auto-submit if expired (Task 6.6)
    const quiz = await Quiz.findById(attempt.quizId);
    if (quiz && quiz.settings.timeLimit > 0) {
      const deadline = attempt.startedAt.getTime() + quiz.settings.timeLimit * 60 * 1000;
      if (Date.now() > deadline) {
        // Auto-submit the attempt with answers provided so far
        await QuizService.autoSubmitExpiredAttempt(attemptId);
        throw new ApiError(400, 'Time limit exceeded. Your attempt has been automatically submitted.');
      }
    }

    // 6. Store the answer
    attempt.answers.set(data.questionId, Array.isArray(data.answer) ? data.answer.join(',') : data.answer);
    await attempt.save();

    logger.info(
      `[quiz] User ${userId} answered question ${data.questionId} in attempt ${attemptId}`,
    );

    return attempt;
  },

  /**
   * POST /api/v1/attempts/:id/submit
   * Evaluates all answers, calculates score/percentage/pass-fail,
   * updates attempt to 'evaluated', awards XP if passed.
   */
  async submitAttempt(attemptId: string, userId: string) {
    // 1. Validate attemptId
    if (!Types.ObjectId.isValid(attemptId)) {
      throw new ApiError(400, 'Invalid attempt ID.');
    }

    // 2. Find the attempt
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      throw new ApiError(404, 'Attempt not found.');
    }

    // 3. Verify ownership
    if (attempt.userId.toString() !== userId) {
      throw new ApiError(403, 'You do not have permission to submit this attempt.');
    }

    // 4. Verify attempt is in progress
    if (attempt.status !== 'in_progress') {
      throw new ApiError(400, 'This attempt has already been submitted.');
    }

    // 5. Fetch quiz and questions
    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) {
      throw new ApiError(404, 'Quiz not found.');
    }

    const questions = await Question.find({ _id: { $in: quiz.questions } });

    // 6. Evaluate each answer
    let totalScore = 0;
    let maxScore = 0;

    const results = questions.map((q: IQuestion) => {
      const qId = (q._id as Types.ObjectId).toString();
      const storedAnswer = attempt.answers.get(qId) ?? '';
      maxScore += q.marks;

      let marksAwarded = 0;
      let correct = false;

      if (q.type === 'subjective') {
        // Placeholder: award 50% for subjective until AI grading (Task 12)
        marksAwarded = Math.floor(q.marks * 0.5);
        correct = false; // not definitively correct
      } else {
        // Auto-grade: case-insensitive trim comparison
        const normalize = (v: string) => v.trim().toLowerCase();
        const correctAnswers = Array.isArray(q.correctAnswer)
          ? q.correctAnswer.map(normalize)
          : [normalize(q.correctAnswer as string)];
        const studentAnswer = normalize(storedAnswer);

        correct = correctAnswers.includes(studentAnswer);
        marksAwarded = correct ? q.marks : 0;
      }

      totalScore += marksAwarded;

      return {
        questionId: qId,
        correct,
        marksAwarded,
        maxMarks: q.marks,
        correctAnswer: q.correctAnswer,
      };
    });

    // 7. Calculate percentage and pass/fail
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= quiz.settings.passingScore;
    const timeTaken = Math.round((Date.now() - attempt.startedAt.getTime()) / 1000);

    // 8. Update attempt
    attempt.score = totalScore;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.timeTaken = timeTaken;
    attempt.submittedAt = new Date();
    attempt.status = 'evaluated';
    await attempt.save();

    // 9. Award XP if passed
    if (passed && quiz.xpReward > 0) {
      await User.findByIdAndUpdate(userId, {
        $inc: { 'gamification.xp': quiz.xpReward },
      });
      logger.info(`[quiz] Awarded ${quiz.xpReward} XP to user ${userId} for passing quiz ${quiz._id}`);
    }

    // Task 9.6 — Update streak on quiz submission
    const { GamificationService } = await import('./gamification.service');
    await GamificationService.updateStreak(userId).catch((err) =>
      logger.error('[gamification] updateStreak failed:', err),
    );

    logger.info(
      `[quiz] User ${userId} submitted attempt ${attemptId} — score: ${totalScore}/${maxScore} (${percentage}%), passed: ${passed}`,
    );

    return {
      attempt,
      results,
      summary: {
        totalScore,
        maxScore,
        percentage,
        passed,
        timeTaken,
        xpAwarded: passed ? quiz.xpReward : 0,
      },
    };
  },

  /**
   * Internal helper — auto-submits an expired in-progress attempt.
   * Called when time limit is exceeded (Task 6.6).
   */
  async autoSubmitExpiredAttempt(attemptId: string) {
    if (!Types.ObjectId.isValid(attemptId)) return null;

    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt || attempt.status !== 'in_progress') return null;

    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz || quiz.settings.timeLimit === 0) return null;

    const deadline = attempt.startedAt.getTime() + quiz.settings.timeLimit * 60 * 1000;
    if (Date.now() <= deadline) return null; // not yet expired

    // Evaluate with whatever answers were stored
    const questions = await Question.find({ _id: { $in: quiz.questions } });
    let totalScore = 0;
    let maxScore = 0;

    const results = questions.map((q: IQuestion) => {
      const qId = (q._id as Types.ObjectId).toString();
      const storedAnswer = attempt.answers.get(qId) ?? '';
      maxScore += q.marks;

      let marksAwarded = 0;
      let correct = false;

      if (q.type !== 'subjective') {
        const normalize = (v: string) => v.trim().toLowerCase();
        const correctAnswers = Array.isArray(q.correctAnswer)
          ? q.correctAnswer.map(normalize)
          : [normalize(q.correctAnswer as string)];
        correct = correctAnswers.includes(normalize(storedAnswer));
        marksAwarded = correct ? q.marks : 0;
      } else {
        marksAwarded = Math.floor(q.marks * 0.5);
      }

      totalScore += marksAwarded;
      return { questionId: qId, correct, marksAwarded, maxMarks: q.marks };
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= quiz.settings.passingScore;
    const timeTaken = Math.round((Date.now() - attempt.startedAt.getTime()) / 1000);

    attempt.score = totalScore;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.timeTaken = timeTaken;
    attempt.submittedAt = new Date();
    attempt.status = 'evaluated';
    await attempt.save();

    if (passed && quiz.xpReward > 0) {
      await User.findByIdAndUpdate(attempt.userId, {
        $inc: { 'gamification.xp': quiz.xpReward },
      });
    }

    logger.info(`[quiz] Auto-submitted expired attempt ${attemptId}`);
    return { attempt, results };
  },

  /**
   * GET /api/v1/quizzes/:id/leaderboard
   * Returns top scores ranked by percentage desc, timeTaken asc.
   */
  async getLeaderboard(quizId: string) {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new ApiError(400, 'Invalid quiz ID.');
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new ApiError(404, 'Quiz not found.');

    const entries = await QuizAttempt.find({
      quizId: new Types.ObjectId(quizId),
      status: 'evaluated',
    })
      .sort({ percentage: -1, timeTaken: 1 })
      .limit(50)
      .populate('userId', 'name avatar');

    return entries.map((e, idx) => ({
      rank: idx + 1,
      user: e.userId,
      percentage: e.percentage,
      score: e.score,
      timeTaken: e.timeTaken,
      passed: e.passed,
      submittedAt: e.submittedAt,
    }));
  },

  /**
   * GET /api/v1/quizzes/:id/analytics  (teacher only)
   * Returns average score, pass rate, per-question stats, difficulty distribution.
   */
  async getQuizAnalytics(quizId: string) {
    if (!Types.ObjectId.isValid(quizId)) {
      throw new ApiError(400, 'Invalid quiz ID.');
    }

    const quiz = await Quiz.findById(quizId).populate<{ questions: IQuestion[] }>('questions');
    if (!quiz) throw new ApiError(404, 'Quiz not found.');

    const attempts = await QuizAttempt.find({
      quizId: new Types.ObjectId(quizId),
      status: 'evaluated',
    });

    const totalAttempts = attempts.length;
    if (totalAttempts === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        averagePercentage: 0,
        passRate: 0,
        questionStats: [],
        difficultyDistribution: {},
      };
    }

    const avgPercentage =
      attempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0) / totalAttempts;
    const avgScore =
      attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / totalAttempts;
    const passRate =
      (attempts.filter((a) => a.passed).length / totalAttempts) * 100;

    // Per-question correct/incorrect counts
    const questionStats = (quiz.questions as IQuestion[]).map((q) => {
      const qId = (q._id as Types.ObjectId).toString();
      let correct = 0;
      let incorrect = 0;

      for (const attempt of attempts) {
        const stored = attempt.answers.get(qId) ?? '';
        if (q.type !== 'subjective') {
          const normalize = (v: string) => v.trim().toLowerCase();
          const correctAnswers = Array.isArray(q.correctAnswer)
            ? q.correctAnswer.map(normalize)
            : [normalize(q.correctAnswer as string)];
          if (correctAnswers.includes(normalize(stored))) {
            correct++;
          } else {
            incorrect++;
          }
        }
      }

      return {
        questionId: qId,
        question: q.question,
        type: q.type,
        difficulty: q.difficulty,
        correct,
        incorrect,
        correctRate: totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : 0,
      };
    });

    // Difficulty distribution
    const difficultyDistribution: Record<string, number> = {};
    for (const q of quiz.questions as IQuestion[]) {
      difficultyDistribution[q.difficulty] = (difficultyDistribution[q.difficulty] ?? 0) + 1;
    }

    return {
      totalAttempts,
      averageScore: Math.round(avgScore * 10) / 10,
      averagePercentage: Math.round(avgPercentage * 10) / 10,
      passRate: Math.round(passRate * 10) / 10,
      questionStats,
      difficultyDistribution,
    };
  },
};
