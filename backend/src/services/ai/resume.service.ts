import { Types } from 'mongoose';
import mammoth from 'mammoth';
import { ResumeAnalysis } from '../../models/Placement';
import { AIRouter } from './ai.router';
import { ResumePrompts } from './prompts/resume.prompts';
import { AIUsageTracker } from './usage-tracker.service';
import { logger } from '../../utils/logger';

export const ResumeService = {
  async analyze(userId: string, fileBuffer: Buffer, mimeType: string, targetRole?: string, fileName?: string) {
    await AIUsageTracker.checkAndLog(userId, 'resume_analyze');

    // Extract text from PDF or DOCX
    let resumeText = '';
    const isPdf = mimeType === 'application/pdf' || mimeType === 'application/octet-stream' || fileName?.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PDFParse } = require('pdf-parse') as { PDFParse: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string }> } };
        const parser = new PDFParse({ data: fileBuffer });
        const result = await parser.getText();
        resumeText = result.text ?? '';
      } catch (e) {
        logger.warn('[ai-resume] PDF parse failed:', e);
        resumeText = '';
      }
    } else {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        resumeText = result.value ?? '';
      } catch (e) {
        logger.warn('[ai-resume] DOCX parse failed:', e);
        resumeText = '';
      }
    }

    if (!resumeText.trim()) {
      resumeText = 'Unable to extract text from the uploaded file. Please ensure it is a readable PDF or DOCX.';
    }

    logger.info(`[ai-resume] Extracted ${resumeText.length} chars from ${mimeType} file`);

    // Keep prompt short to avoid token truncation — 4000 chars is plenty
    const truncatedText = resumeText.slice(0, 4000);

    const raw = await AIRouter.generate(
      ResumePrompts.analyze(truncatedText, targetRole),
      { jsonMode: true, maxTokens: 3000 },
    );

    let analysis;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        atsScore: 50,
        skillsFound: [],
        skillsGap: [],
        keywordSuggestions: [],
        sectionFeedback: {},
        overallFeedback: raw.slice(0, 500),
      };
    }

    // Ensure sectionFeedback is a plain object (not Map) so it serializes correctly
    const sectionFeedback = analysis.sectionFeedback ?? {};
    const plainFeedback: Record<string, string> = typeof sectionFeedback === 'object' && !(sectionFeedback instanceof Map)
      ? sectionFeedback as Record<string, string>
      : {};

    const record = await ResumeAnalysis.create({
      userId: new Types.ObjectId(userId),
      atsScore: analysis.atsScore ?? 50,
      skillsFound: Array.isArray(analysis.skillsFound) ? analysis.skillsFound : [],
      skillsGap: Array.isArray(analysis.skillsGap) ? analysis.skillsGap : [],
      keywordSuggestions: Array.isArray(analysis.keywordSuggestions) ? analysis.keywordSuggestions : [],
      sectionFeedback: new Map(Object.entries(plainFeedback)),
      overallFeedback: analysis.overallFeedback ?? '',
      analyzedAt: new Date(),
    });

    logger.info(`[ai-resume] Analyzed resume for user ${userId}, ATS score: ${record.atsScore}`);

    // Return plain object so sectionFeedback serializes properly as object (not Map)
    return {
      atsScore: record.atsScore,
      skillsFound: record.skillsFound,
      skillsGap: record.skillsGap,
      keywordSuggestions: record.keywordSuggestions,
      sectionFeedback: plainFeedback,
      overallFeedback: record.overallFeedback,
    };
  },
};
