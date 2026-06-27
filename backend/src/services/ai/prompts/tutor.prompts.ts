export const TutorPrompts = {
  answer: (courseContext: string, history: string, question: string) => `
You are an expert AI tutor for an online course. Answer the student's question based on the course context.

Course Context:
${courseContext}

Recent conversation:
${history}

Student question: ${question}

Return a JSON object:
{
  "answer": "Detailed answer to the question",
  "examples": ["example1", "example2"],
  "relatedTopics": ["topic1", "topic2"],
  "followUpQuestions": ["question1", "question2"]
}`,
};
