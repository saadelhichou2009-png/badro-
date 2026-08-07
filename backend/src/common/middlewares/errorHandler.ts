import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../../utils/logger';
import { ZodError } from 'zod';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `المسار غير موجود: ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // أخطاء تحقق من صحة المدخلات (Zod)
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'فشل التحقق من صحة البيانات المدخلة',
      errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  // أخطاء التطبيق المعروفة
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, details: err.details, path: req.originalUrl });
    }
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // أخطاء Prisma المعروفة (قيود فريدة، إلخ)
  const prismaErr = err as { code?: string; meta?: Record<string, unknown> };
  if (prismaErr?.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'القيمة موجودة مسبقاً (تعارض في البيانات)',
      details: prismaErr.meta,
    });
  }

  // أخطاء غير متوقعة
  const error = err as Error;
  logger.error('Unhandled error', { message: error?.message, stack: error?.stack, path: req.originalUrl });

  return res.status(500).json({
    success: false,
    message: 'حدث خطأ غير متوقع في الخادم',
  });
}
