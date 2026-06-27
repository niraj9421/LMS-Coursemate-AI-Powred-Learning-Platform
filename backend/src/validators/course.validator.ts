import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20),
  shortDescription: z.string().min(10).max(300),
  category: z.string().min(1, 'Category ID is required'),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.string().default('English'),
  price: z.number().min(0),
  discountPrice: z.number().min(0).optional(),
  currency: z.string().default('USD'),
  tags: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  outcomes: z.array(z.string()).default([]),
  certificate: z.boolean().default(true),
});

export const updateCourseSchema = createCourseSchema.partial();

export const searchCoursesSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createChapterSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  order: z.number().int().min(0),
  isLocked: z.boolean().default(false),
});

export const updateChapterSchema = createChapterSchema.partial();

export const createLessonSchema = z.object({
  title: z.string().min(2).max(200),
  type: z.enum(['video', 'pdf', 'text', 'quiz', 'assignment']),
  order: z.number().int().min(0),
  isFree: z.boolean().default(false),
  content: z
    .object({
      videoUrl: z.string().url().optional(),
      duration: z.number().min(0).optional(),
      pdfUrl: z.string().url().optional(),
      textContent: z.string().optional(),
      quizId: z.string().optional(),
      assignmentId: z.string().optional(),
    })
    .optional(),
  resources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        type: z.enum(['pdf', 'link', 'video', 'other']).default('link'),
      }),
    )
    .default([]),
});

export const updateLessonSchema = createLessonSchema.partial();

export const completeLessonSchema = z.object({
  watchTime: z.number().min(0).optional(),
});

export const rateCourseSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().max(1000).optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type SearchCoursesInput = z.infer<typeof searchCoursesSchema>;
export type CreateChapterInput = z.infer<typeof createChapterSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type CompleteLessonInput = z.infer<typeof completeLessonSchema>;
export type RateCourseInput = z.infer<typeof rateCourseSchema>;
