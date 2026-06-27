import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  skills: z.array(z.string().max(50)).max(30).optional(),
  socialLinks: z
    .object({
      linkedin: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
      github: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
      portfolio: z.string().url('Invalid portfolio URL').optional().or(z.literal('')),
    })
    .optional(),
  preferences: z
    .object({
      theme: z.enum(['dark', 'light']).optional(),
      learningGoal: z.string().max(200).optional(),
      notifications: z
        .object({
          email: z.boolean().optional(),
          inApp: z.boolean().optional(),
          assignmentDue: z.boolean().optional(),
          courseUpdates: z.boolean().optional(),
          quizResults: z.boolean().optional(),
          badgeEarned: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
