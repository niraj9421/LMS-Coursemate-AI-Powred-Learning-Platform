import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { asyncHandler } from '../utils/asyncHandler';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Simple in-memory GD topics and aptitude data (seeded via Task 14.5)
// In production these come from the DB; for now we use the Placement model

export const PlacementController = {

  // GET /api/v1/placement/progress
  getProgress: asyncHandler(async (req: Request, res: Response) => {
    const { ResumeBuilder } = await import('../models/placement.model');
    const { InterviewSession } = await import('../models/Placement');
    const userId = req.user!.userId;

    const [resume, interviewsDone, aptitudesDone] = await Promise.all([
      ResumeBuilder.findOne({ userId }),
      InterviewSession.countDocuments({ userId, status: 'completed' }),
      // We track aptitude via interview sessions labelled aptitude, or just use a simple proxy
      Promise.resolve(0),
    ]);

    // Resume completion: count filled fields out of 6 personal + has skills + experience + education
    let resumeCompletion = 0;
    if (resume) {
      const p = resume.personalInfo ?? {};
      const filled = ['name', 'email', 'phone', 'location', 'linkedin'].filter(k => (p as Record<string,string|undefined>)[k]).length;
      resumeCompletion += Math.round((filled / 5) * 40);  // personal = 40%
      if ((resume.skills ?? []).length > 0) resumeCompletion += 20;
      if ((resume.experience ?? []).length > 0) resumeCompletion += 20;
      if ((resume.education ?? []).length > 0) resumeCompletion += 20;
    }

    const interviewScore  = Math.min((interviewsDone / 5) * 100, 100);
    const aptitudeScore   = Math.min((aptitudesDone  / 3) * 100, 100);
    const overallScore    = Math.round((resumeCompletion * 0.5) + (interviewScore * 0.35) + (aptitudeScore * 0.15));

    ApiResponse.success(res, 200, 'Progress fetched', {
      resumeCompletion,
      interviewsDone,
      aptitudesDone,
      overallScore,
    });
  }),

  // POST /api/v1/placement/gd-topics/:id/feedback
  getGDFeedback: asyncHandler(async (req: Request, res: Response) => {
    const { GDTopic } = await import('../models/placement.model');
    const { AIRouter } = await import('../services/ai/ai.router');

    const topic = await GDTopic.findById(req.params['id']);
    if (!topic) throw new ApiError(404, 'Topic not found.');

    const { transcript, duration } = req.body as { transcript: string; duration: number };
    if (!transcript || !transcript.trim()) throw new ApiError(400, 'Transcript is required.');

    const prompt = `You are a Group Discussion (GD) evaluator. Evaluate this student's GD speech.

Topic: "${topic.title}"
Category: ${topic.category}
Key Points the student should cover: ${topic.keyPoints.join('; ')}
Duration spoken: ${Math.round(duration)} seconds

Student's speech transcript:
"${transcript.trim()}"

Evaluate the speech and return ONLY valid JSON:
{
  "overallScore": <0-100>,
  "contentScore": <0-100>,
  "clarityScore": <0-100>,
  "confidenceScore": <0-100>,
  "keyPointsCovered": ["point covered"],
  "keyPointsMissed": ["point missed"],
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "overallFeedback": "2-3 sentence overall assessment",
  "vocabularySuggestions": ["better word/phrase to use"]
}`;

    const raw = await AIRouter.generate(prompt, { jsonMode: true, maxTokens: 1500 });
    let feedback;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      feedback = JSON.parse(cleaned);
    } catch {
      feedback = {
        overallScore: 60, contentScore: 60, clarityScore: 60, confidenceScore: 60,
        keyPointsCovered: [], keyPointsMissed: topic.keyPoints,
        strengths: ['Attempted the topic'],
        improvements: ['Cover more key points', 'Speak more clearly'],
        overallFeedback: raw.slice(0, 300),
        vocabularySuggestions: [],
      };
    }

    ApiResponse.success(res, 200, 'GD feedback generated', feedback);
  }),

  // GET /api/v1/placement/gd-topics
  getGDTopics: asyncHandler(async (req: Request, res: Response) => {
    const { GDTopic } = await import('../models/placement.model');
    const page = parseInt(req.query['page'] as string ?? '1', 10);
    const limit = parseInt(req.query['limit'] as string ?? '20', 10);
    const topics = await GDTopic.find().skip((page - 1) * limit).limit(limit);
    const total = await GDTopic.countDocuments();
    ApiResponse.success(res, 200, 'GD topics fetched', { topics, total, page, limit });
  }),

  // GET /api/v1/placement/aptitude/:category
  getAptitudeTest: asyncHandler(async (req: Request, res: Response) => {
    const { AptitudeQuestion } = await import('../models/placement.model');
    const category = req.params['category'];
    if (!['quantitative', 'logical', 'verbal'].includes(category!)) {
      throw new ApiError(400, 'Category must be quantitative, logical, or verbal.');
    }
    const questions = await AptitudeQuestion.find({ category }).limit(20).select('-correctAnswer');
    ApiResponse.success(res, 200, 'Aptitude test fetched', { questions, timeLimit: 30 });
  }),

  // POST /api/v1/placement/aptitude/:id/submit
  submitAptitudeTest: asyncHandler(async (req: Request, res: Response) => {
    const { AptitudeQuestion } = await import('../models/placement.model');
    const { answers } = req.body as { answers: Record<string, string> };
    const category = req.params['id'];
    const questions = await AptitudeQuestion.find({ category });

    let correct = 0;
    const results = questions.map(q => {
      const studentAnswer = answers[q._id.toString()] ?? '';
      const isCorrect = studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      if (isCorrect) correct++;
      return { questionId: q._id, correct: isCorrect, correctAnswer: q.correctAnswer };
    });

    ApiResponse.success(res, 200, 'Aptitude test evaluated', {
      score: correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
      results,
    });
  }),

  // GET /api/v1/placement/company/:name
  getCompanyKit: asyncHandler(async (req: Request, res: Response) => {
    const { CompanyKit } = await import('../models/placement.model');
    const kit = await CompanyKit.findOne({ name: { $regex: req.params['name'], $options: 'i' } });
    if (!kit) throw new ApiError(404, 'Company prep kit not found.');
    ApiResponse.success(res, 200, 'Company kit fetched', kit);
  }),

  // GET /api/v1/placement/resume-builder
  getResumeBuilder: asyncHandler(async (req: Request, res: Response) => {
    const { ResumeBuilder } = await import('../models/placement.model');
    const resume = await ResumeBuilder.findOne({ userId: req.user!.userId });
    ApiResponse.success(res, 200, 'Resume data fetched', resume ?? {});
  }),

  // POST /api/v1/placement/resume-builder
  saveResumeBuilder: asyncHandler(async (req: Request, res: Response) => {
    const { ResumeBuilder } = await import('../models/placement.model');
    const resume = await ResumeBuilder.findOneAndUpdate(
      { userId: req.user!.userId },
      { ...req.body, userId: req.user!.userId },
      { upsert: true, new: true },
    );
    ApiResponse.success(res, 200, 'Resume saved', resume);
  }),

  // GET /api/v1/placement/resume-builder/export
  exportResumePDF: asyncHandler(async (req: Request, res: Response) => {
    const { ResumeBuilder } = await import('../models/placement.model');
    const resume = await ResumeBuilder.findOne({ userId: req.user!.userId });
    if (!resume) throw new ApiError(404, 'No resume data found. Please save your resume first.');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;
    const write = (text: string, size = 11, isBold = false) => {
      page.drawText(text, { x: 50, y, size, font: isBold ? bold : font, color: rgb(0.1, 0.1, 0.1) });
      y -= size + 6;
    };

    write(resume.personalInfo?.name ?? 'Resume', 20, true);
    write(resume.personalInfo?.email ?? '', 11);
    write(resume.personalInfo?.phone ?? '', 11);
    y -= 10;
    write('EXPERIENCE', 13, true);
    for (const exp of resume.experience ?? []) {
      write(`${exp.title} at ${exp.company} (${exp.duration})`, 11, true);
      write(exp.description ?? '', 10);
    }
    y -= 10;
    write('EDUCATION', 13, true);
    for (const edu of resume.education ?? []) {
      write(`${edu.degree} — ${edu.institution} (${edu.year})`, 11);
    }
    y -= 10;
    write('SKILLS', 13, true);
    write((resume.skills ?? []).join(', '), 11);

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.status(200).send(Buffer.from(pdfBytes));
  }),
};
