import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';
import { TutorService } from '../services/ai/tutor.service';
import { LearningPathService } from '../services/ai/learning-path.service';
import { InterviewService } from '../services/ai/interview.service';
import { ResumeService } from '../services/ai/resume.service';
import { PredictionService } from '../services/ai/prediction.service';
import { ProjectIdeasService } from '../services/ai/project-ideas.service';
import { z } from 'zod';

// ─── Validators ───────────────────────────────────────────────────────────────
const tutorSchema = z.object({
  courseId: z.string().optional(),  // optional — works without course context
  question: z.string().min(1).max(2000),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
});

const learningPathSchema = z.object({
  goal: z.string().min(5),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  hoursPerDay: z.number().min(0.5).max(12),
  weeks: z.number().int().min(1).max(52),
});

const interviewStartSchema = z.object({
  role: z.string().min(2),
  type: z.enum(['technical', 'hr', 'behavioral', 'system_design']),
});

const interviewAnswerSchema = z.object({
  questionIndex: z.number().int().min(0),
  answer: z.string().min(1),
});

const projectIdeasSchema = z.object({
  domain: z.string().min(2),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
});

// ─── Controller ───────────────────────────────────────────────────────────────
export const AIController = {

  // POST /api/v1/ai/tutor
  askTutor: asyncHandler(async (req: Request, res: Response) => {
    const parsed = tutorSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(422, 'Invalid input.');
    const result = await TutorService.answer(
      req.user!.userId,
      parsed.data.courseId,
      parsed.data.question,
      parsed.data.history,
    );
    ApiResponse.success(res, 200, 'Tutor response', result);
  }),

  // POST /api/v1/ai/learning-path
  generateLearningPath: asyncHandler(async (req: Request, res: Response) => {
    const parsed = learningPathSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(422, 'Invalid input.');
    const path = await LearningPathService.generate(
      req.user!.userId,
      parsed.data.goal,
      parsed.data.level,
      parsed.data.hoursPerDay,
      parsed.data.weeks,
    );
    ApiResponse.success(res, 201, 'Learning path generated', path);
  }),

  // POST /api/v1/ai/interview/start
  startInterview: asyncHandler(async (req: Request, res: Response) => {
    const parsed = interviewStartSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(422, 'Invalid input.');
    const result = await InterviewService.startSession(
      req.user!.userId,
      parsed.data.role,
      parsed.data.type,
    );
    ApiResponse.success(res, 201, 'Interview session started', result);
  }),

  // POST /api/v1/ai/interview/:id/answer
  submitInterviewAnswer: asyncHandler(async (req: Request, res: Response) => {
    const parsed = interviewAnswerSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(422, 'Invalid input.');
    const result = await InterviewService.submitAnswer(
      req.params['id']!,
      req.user!.userId,
      parsed.data.questionIndex,
      parsed.data.answer,
    );
    ApiResponse.success(res, 200, 'Answer submitted', result);
  }),

  // POST /api/v1/ai/resume/analyze
  analyzeResume: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      const ct = req.headers['content-type'] ?? '';
      if (!ct.includes('multipart/form-data')) {
        throw new ApiError(400, 'Request must be multipart/form-data.');
      }
      throw new ApiError(400, 'Resume file is required. Please upload a PDF or DOCX.');
    }
    const name = req.file.originalname.toLowerCase();
    const validExt  = name.endsWith('.pdf') || name.endsWith('.docx');
    const validMime = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream'].includes(req.file.mimetype);
    if (!validExt && !validMime) {
      throw new ApiError(415, `Unsupported file: ${req.file.mimetype}. Upload PDF or DOCX.`);
    }
    const result = await ResumeService.analyze(
      req.user!.userId,
      req.file.buffer,
      req.file.mimetype,
      req.body.targetRole,
      req.file.originalname,
    );
    ApiResponse.success(res, 200, 'Resume analyzed', result);
  }),

  // GET /api/v1/ai/performance/:courseId
  getPerformancePrediction: asyncHandler(async (req: Request, res: Response) => {
    const result = await PredictionService.predict(
      req.user!.userId,
      req.params['courseId']!,
    );
    ApiResponse.success(res, 200, 'Performance prediction', result);
  }),

  // POST /api/v1/ai/project-ideas
  generateProjectIdeas: asyncHandler(async (req: Request, res: Response) => {
    const parsed = projectIdeasSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(422, 'Invalid input.');
    const ideas = await ProjectIdeasService.generate(
      req.user!.userId,
      parsed.data.domain,
      parsed.data.skillLevel,
    );
    ApiResponse.success(res, 200, 'Project ideas generated', ideas);
  }),

  // POST /api/v1/ai/generate-summary
  generateResumeSummary: asyncHandler(async (req: Request, res: Response) => {
    const { role, skills } = req.body as { role?: string; skills?: string };
    if (!role) throw new ApiError(400, 'role is required.');
    const prompt = `Write a concise, professional resume summary (3-4 sentences) for a ${role}${skills ? ` with skills: ${skills}` : ''}. Return only the summary text, no labels.`;
    const { AIRouter } = await import('../services/ai/ai.router');
    const summary = await AIRouter.generate(prompt, { temperature: 0.6 });
    ApiResponse.success(res, 200, 'Summary generated', { summary: summary.trim() });
  }),
};
