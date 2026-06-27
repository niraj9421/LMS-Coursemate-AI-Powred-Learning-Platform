export const InterviewPrompts = {
  generateQuestions: (role: string, type: string, count = 5) => `
Generate ${count} ${type} interview questions for a ${role} position.
Return JSON: { "questions": [{"question": "...", "category": "..."}] }`,

  evaluateAnswer: (question: string, answer: string, role: string) => `
Evaluate this interview answer for a ${role} position.
Question: ${question}
Answer: ${answer}
Return JSON: { "score": 0-100, "confidence": "high|medium|low", "clarity": "high|medium|low", "feedback": "..." }`,

  generateReport: (role: string, answers: Array<{question: string; score: number; feedback: string}>) => `
Generate a final interview report for a ${role} candidate.
Answers summary: ${JSON.stringify(answers)}
Return JSON: { "overallScore": 0-100, "feedback": "...", "strengths": ["..."], "improvements": ["..."] }`,
};
