export const CoursePrompts = {
  generateStructure: (content: string, title?: string) => `
You are an expert curriculum designer. Based on the following content, generate a structured course outline.

Content:
${content}

${title ? `Suggested title: ${title}` : ''}

Return a JSON object with this exact structure:
{
  "title": "Course title",
  "description": "Course description (2-3 sentences)",
  "shortDescription": "One-line summary",
  "level": "beginner|intermediate|advanced",
  "tags": ["tag1", "tag2"],
  "chapters": [
    {
      "title": "Chapter title",
      "description": "Chapter description",
      "order": 1,
      "topics": ["topic1", "topic2"]
    }
  ]
}`,

  generateChapterContent: (chapterTitle: string, topics: string[]) => `
You are an expert educator. Generate comprehensive content for a course chapter.

Chapter: ${chapterTitle}
Topics: ${topics.join(', ')}

Return a JSON object with:
{
  "summary": "Chapter summary (3-4 sentences)",
  "notes": "Detailed markdown notes covering all topics",
  "flashcards": [{"front": "question", "back": "answer"}],
  "mcqs": [{"question": "...", "options": ["A","B","C","D"], "correctAnswer": "A", "explanation": "..."}],
  "assignmentIdea": "A practical assignment description"
}`,
};
