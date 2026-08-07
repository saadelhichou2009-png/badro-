import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';

// حد عام لكل الـ API
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'تم تجاوز الحد المسموح من الطلبات، حاول لاحقاً' },
});

// حد أكثر صرامة لمسارات المصادقة الحساسة (تسجيل الدخول، التسجيل، نسيان كلمة المرور)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'محاولات كثيرة جداً، الرجاء المحاولة بعد 15 دقيقة' },
});

// حد مخصص لاستقبال بيانات الـ EA (يُنادى كل دقيقة تقريباً لكل حساب)
export const eaIngestRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.EA_INGEST_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.headers['x-api-key'] as string) ?? req.ip ?? 'unknown',
  message: { success: false, message: 'تم تجاوز حد إرسال البيانات لهذا الحساب' },
});
