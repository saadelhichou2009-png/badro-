import { NextFunction, Request, Response } from 'express';
import { ApiKey, TradingAccount } from '@prisma/client';
import { AppError } from '../errors/AppError';
import { verifyAccessToken } from '../../utils/token.util';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../database/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// نوع الطلب بعد المرور عبر apiKeyGuard - يُستخدم في وحدة ingest الخاصة بالـ EA
export interface ApiKeyAuthenticatedRequest extends Request {
  apiKeyRecord?: ApiKey & { tradingAccount: TradingAccount | null };
}

/**
 * يتحقق من صحة الـ Access Token في الهيدر Authorization: Bearer <token>
 * ويحقن بيانات المستخدم في req.user
 */
export const authGuard = asyncHandler(
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw AppError.unauthorized('رمز الدخول مفقود');
    }

    const token = header.split(' ')[1];

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw AppError.unauthorized('رمز الدخول غير صالح أو منتهي الصلاحية');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw AppError.unauthorized('الحساب غير موجود أو معطل');
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  },
);

/**
 * يقيّد الوصول لمستخدمين بدور معين فقط (مثال: ADMIN)
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw AppError.forbidden('لا تملك الصلاحية للوصول لهذا المورد');
    }
    next();
  };
}

/**
 * يتحقق من مفتاح الـ API الخاص بالـ EA (وليس JWT) — يُستخدم في مسارات استقبال الصفقات
 */
export const apiKeyGuard = asyncHandler(
  async (req: ApiKeyAuthenticatedRequest, _res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string | undefined;
    if (!apiKey) {
      throw AppError.unauthorized('مفتاح API مفقود (X-API-Key)');
    }

    const { hashApiKey } = await import('../../utils/token.util');
    const hashed = hashApiKey(apiKey);

    const record = await prisma.apiKey.findUnique({
      where: { key: hashed },
      include: { tradingAccount: true },
    });

    if (!record || !record.isActive) {
      throw AppError.unauthorized('مفتاح API غير صالح أو معطل');
    }

    if (record.expiresAt && record.expiresAt < new Date()) {
      throw AppError.unauthorized('مفتاح API منتهي الصلاحية');
    }

    await prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    req.apiKeyRecord = record;
    next();
  },
);
