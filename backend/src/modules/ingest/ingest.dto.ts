import { z } from 'zod';

// لقطة بيانات الحساب (رصيد، equity، هامش...) يرسلها الـ EA كل دقيقة تقريباً
export const accountInfoSchema = z.object({
  balance: z.number(),
  equity: z.number(),
  margin: z.number().default(0).optional(),
  freeMargin: z.number().default(0).optional(),
  marginLevel: z.number().default(0).optional(),
  currency: z.string().length(3).optional(),
  leverage: z.number().int().positive().optional(),
  broker: z.string().optional(),
  server: z.string().optional(),
});
export type AccountInfoDto = z.infer<typeof accountInfoSchema>;

export const tradeTypeEnum = z.enum(['BUY', 'SELL', 'BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP']);
export const tradeStatusEnum = z.enum(['OPEN', 'CLOSED', 'CANCELLED']);

export const tradeSchema = z.object({
  ticket: z.string().min(1),
  symbol: z.string().min(1),
  type: tradeTypeEnum,
  status: tradeStatusEnum.default('OPEN'),
  lotSize: z.number().positive(),
  openPrice: z.number(),
  closePrice: z.number().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  openTime: z.string().datetime({ offset: true }).or(z.string()), // ISO 8601
  closeTime: z.string().datetime({ offset: true }).or(z.string()).optional(),
  commission: z.number().default(0).optional(),
  swap: z.number().default(0).optional(),
  profit: z.number().default(0).optional(),
  comment: z.string().optional(),
  magicNumber: z.number().int().optional(),
});
export type TradeIngestDto = z.infer<typeof tradeSchema>;

// دفعة صفقات: الـ EA يرسل كل الصفقات المفتوحة + آخر الصفقات المغلقة في كل مزامنة
export const tradesBatchSchema = z.object({
  trades: z.array(tradeSchema).min(1).max(1000),
});
export type TradesBatchDto = z.infer<typeof tradesBatchSchema>;

// إشعار فوري بصفقة واحدة جديدة أو مُحدّثة (يُرسل مباشرة عند حدوثها بدل انتظار الدورة الدقيقية)
export const singleTradeSchema = z.object({ trade: tradeSchema });
export type SingleTradeDto = z.infer<typeof singleTradeSchema>;
