import { z } from 'zod';

export const createAccountSchema = z.object({
  accountName: z.string().min(2, 'اسم الحساب قصير جداً').max(100),
  accountNumber: z.string().min(1, 'رقم الحساب مطلوب').max(50),
  broker: z.string().min(1, 'اسم الوسيط مطلوب').max(100),
  server: z.string().min(1, 'اسم السيرفر مطلوب').max(100),
  platform: z.enum(['MT4', 'MT5']),
  currency: z.string().length(3).default('USD').optional(),
  leverage: z.number().int().positive().max(3000).default(100).optional(),
  isPublic: z.boolean().default(false).optional(),
});
export type CreateAccountDto = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = z.object({
  accountName: z.string().min(2).max(100).optional(),
  isPublic: z.boolean().optional(),
});
export type UpdateAccountDto = z.infer<typeof updateAccountSchema>;

export const listAccountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});
export type ListAccountsQueryDto = z.infer<typeof listAccountsQuerySchema>;
