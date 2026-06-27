import { z } from 'zod';

export const createAssignmentSchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
  lessonId: z.string().optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  dueDate: z.string().datetime({ message: 'dueDate must be a valid ISO datetime' }),
  maxMarks: z.number().int().min(1),
});

export const gradeSubmissionSchema = z.object({
  score: z.number().min(0),
  feedback: z.string().max(2000).optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
