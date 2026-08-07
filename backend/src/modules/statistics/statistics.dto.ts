import { z } from 'zod';

export const periodQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(60).default(12).optional(),
});
export type PeriodQueryDto = z.infer<typeof periodQuerySchema>;
