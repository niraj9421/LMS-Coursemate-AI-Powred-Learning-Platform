export const ResumePrompts = {
  analyze: (resumeText: string, targetRole?: string) => `You are an expert ATS (Applicant Tracking System) resume analyst and career coach.

Analyze the following resume${targetRole ? ` for a ${targetRole} position` : ''} and return a detailed JSON evaluation.

RESUME TEXT:
"""
${resumeText}
"""

Instructions:
1. atsScore: Rate 0-100 based on ATS compatibility (keyword density, formatting clarity, quantified achievements, action verbs)
2. skillsFound: List ALL technical skills, tools, languages, frameworks you can identify
3. skillsGap: List skills that are missing or weak for ${targetRole || 'a software engineering role'} (be specific, e.g. "Docker", "System Design", "TypeScript")
4. keywordSuggestions: List specific keywords/phrases to add to improve ATS ranking
5. sectionFeedback: Give feedback on each resume section present (summary/objective, experience, education, skills, projects)
6. overallFeedback: 3-4 sentences of actionable advice

Return ONLY this JSON (no markdown, no extra text):
{
  "atsScore": <number 0-100>,
  "skillsFound": ["<actual skill from resume>"],
  "skillsGap": ["<missing skill for ${targetRole || 'the target role'}>"],
  "keywordSuggestions": ["<specific keyword to add>"],
  "sectionFeedback": {
    "summary": "<feedback on summary/objective section>",
    "experience": "<feedback on work experience section>",
    "skills": "<feedback on skills section>",
    "education": "<feedback on education section>",
    "projects": "<feedback on projects section if present>"
  },
  "overallFeedback": "<3-4 sentences of specific actionable advice>"
}`,
};
