import { Types } from 'mongoose';
import { User } from '../models/User';
import { Enrollment } from '../models/Enrollment';
import { Certificate } from '../models/Certificate';
import { CodingStats } from '../models/CodingProblem';
import { CareerMentorSnapshot } from '../models/CareerMentor';
import { StudentProfile } from '../models/StudentProfile';
import { AIRouter } from './ai/ai.router';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

const CAREER_PATHS = [
  'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
  'AI/ML Engineer', 'Data Analyst', 'DevOps Engineer', 'Product Manager',
];

export interface GenerateOptions {
  interests?:      string[];
  targetRole?:     string;
  workPreference?: string; // 'remote' | 'hybrid' | 'onsite'
  timeline?:       string; // '3months' | '6months' | '1year'
  resumeText?:     string; // optional pasted resume text
}

export const CareerMentorService = {

  async generate(userId: string, options: GenerateOptions = {}) {
    const { interests = [], targetRole = '', workPreference = '', timeline = '6months', resumeText = '' } = options;

    const [user, profile, enrollments, certificates, codingStats] = await Promise.all([
      User.findById(userId).select('name skills gamification bio'),
      StudentProfile.findOne({ userId }).select(
        'technicalSkills softSkills experience projects degree collegeName specialization headline summary socialLinks',
      ),
      Enrollment.find({ userId }).populate('courseId', 'title tags level category').limit(50),
      Certificate.find({ userId }).select('courseName').limit(30),
      CodingStats.findOne({ userId }),
    ]);

    if (!user) throw new ApiError(404, 'User not found.');

    // Merge all skill sources
    const techSkills = Array.from(new Set([...(user.skills ?? []), ...(profile?.technicalSkills ?? [])]));

    // Course data
    const completedCourses = enrollments
      .filter(e => e.status === 'completed')
      .map(e => (e.courseId as unknown as { title: string; tags?: string[] })?.title ?? '')
      .filter(Boolean);

    // Coding stats
    const codingTotal  = codingStats?.totalSolved ?? 0;
    const codingEasy   = codingStats?.easySolved ?? 0;
    const codingMedium = codingStats?.mediumSolved ?? 0;
    const codingHard   = codingStats?.hardSolved ?? 0;

    // Profile details
    const degree        = [profile?.degree, profile?.specialization].filter(Boolean).join(' in ') || 'Not specified';
    const hasProjects   = (profile?.projects?.length ?? 0) > 0;
    const projectTitles = (profile?.projects ?? []).map((p: { title: string }) => p.title).join(', ');
    const hasExperience = (profile?.experience?.length ?? 0) > 0;
    const experienceSummary = (profile?.experience ?? [])
      .map((e: { role: string; company: string }) => `${e.role} at ${e.company}`)
      .join('; ');
    const certNames = certificates.map(c => c.courseName);

    // Keep prompt compact to avoid token truncation
    const profile_summary = [
      `Skills: ${techSkills.length > 0 ? techSkills.join(', ') : 'none'}`,
      `Courses done: ${completedCourses.length > 0 ? completedCourses.join(', ') : 'none'}`,
      `Certificates: ${certNames.length > 0 ? certNames.join(', ') : 'none'}`,
      `Coding solved: ${codingTotal} (easy:${codingEasy} med:${codingMedium} hard:${codingHard})`,
      `Projects: ${hasProjects ? projectTitles : 'none'}`,
      `Experience: ${hasExperience ? experienceSummary : 'none'}`,
      `Education: ${degree}`,
      `Level: ${user.gamification?.level ?? 1}`,
    ].join(' | ');

    const prompt = `Career advisor AI. Analyze student and return career recommendations as JSON.

Student: ${profile_summary}
Interests: ${interests.length > 0 ? interests.join(', ') : 'open'}
Target: ${targetRole || 'any'} | Work: ${workPreference || 'any'} | Timeline: ${timeline}
${resumeText ? `Resume: ${resumeText.slice(0, 300)}` : ''}

Top 3 paths from: ${CAREER_PATHS.join(', ')}

Return ONLY compact JSON (keep all string values SHORT, max 10 words each):
{"careerReadinessScore":<n>,"placementReadinessScore":<n>,"topCareerPath":"<role>","careerPaths":[{"role":"<r>","matchPercentage":<n>,"whyGoodFit":"<10 words>","skillGaps":["<skill>","<skill>"],"recommendedCourses":["<course>"],"recommendedCertifications":["<cert>"],"recommendedProjects":["<project>"]}],"roadmap":[{"phase":"30d","tasks":[{"week":1,"task":"<short task>","type":"course"}]},{"phase":"60d","tasks":[{"week":5,"task":"<short task>","type":"project"}]},{"phase":"90d","tasks":[{"week":9,"task":"<short task>","type":"interview"}]}],"insights":["<insight>","<insight>","<insight>"],"salaryInsights":[{"role":"<role>","minSalary":"<val>","maxSalary":"<val>","currency":"INR"}]}`;

    let result;
    try {
      const raw = await AIRouter.generate(prompt, { jsonMode: true, maxTokens: 5000 });
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      result = JSON.parse(cleaned);
    } catch (err) {
      logger.error('[career-mentor] AI generation failed:', err);
      const cached = await CareerMentorSnapshot.findOne({ studentId: userId });
      if (cached) { logger.warn('[career-mentor] returning cached snapshot'); return cached; }
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new ApiError(503, `AI Career Mentor temporarily unavailable: ${errMsg}`);
    }

    const snapshot = await CareerMentorSnapshot.findOneAndUpdate(
      { studentId: new Types.ObjectId(userId) },
      {
        studentId: new Types.ObjectId(userId),
        generatedAt: new Date(),
        interests,
        targetRole,
        workPreference,
        timeline,
        careerReadinessScore:    typeof result.careerReadinessScore    === 'number' ? result.careerReadinessScore    : 0,
        placementReadinessScore: typeof result.placementReadinessScore === 'number' ? result.placementReadinessScore : 0,
        topCareerPath:           typeof result.topCareerPath           === 'string' ? result.topCareerPath           : CAREER_PATHS[0],
        careerPaths:             Array.isArray(result.careerPaths)     ? result.careerPaths  : [],
        roadmap:                 Array.isArray(result.roadmap)         ? result.roadmap      : [],
        insights:                Array.isArray(result.insights)        ? result.insights     : [],
        salaryInsights:          Array.isArray(result.salaryInsights)  ? result.salaryInsights : [],
        isStale: false,
      },
      { upsert: true, new: true },
    );

    logger.info(`[career-mentor] Generated snapshot for user ${userId} (target: ${targetRole || 'auto'})`);
    return snapshot;
  },

  async getSnapshot(userId: string) {
    return CareerMentorSnapshot.findOne({ studentId: userId });
  },

  async markStale(userId: string) {
    await CareerMentorSnapshot.findOneAndUpdate({ studentId: userId }, { isStale: true });
  },
};
