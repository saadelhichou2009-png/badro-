import { z } from 'zod';

export const listTradesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(25).optional(),
  symbol: z.string().optional(),
  type: z.enum(['BUY', 'SELL', 'BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP']).optional(),
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
  search: z.string().optional(), // بحث حر في الزوج أو التذكرة أو الملاحظة
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z
    .enum(['openTime', 'closeTime', 'profit', 'lotSize', 'symbol'])
    .default('openTime')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});
export type ListTradesQueryDto = z.infer<typeof listTradesQuerySchema>;

export const accountIdParamSchema = z.object({
  accountId: z.string().uuid('معرّف الحساب غير صالح'),
});
