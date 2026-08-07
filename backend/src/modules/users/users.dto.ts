import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  timezone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
