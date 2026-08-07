import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: { sub: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY });
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
}

export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * توليد مفتاح API للـ EA. يُعاد الشكل الكامل مرة واحدة فقط للمستخدم،
 * ويُخزَّن في القاعدة النسخة المُجزّأة (hash) فقط لأسباب أمنية.
 */
export function generateApiKey(): { plainKey: string; hashedKey: string; prefix: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const plainKey = `tpk_${raw}`; // Trading Platform Key
  const hashedKey = crypto.createHmac('sha256', env.API_KEY_SECRET).update(plainKey).digest('hex');
  const prefix = plainKey.slice(0, 12);
  return { plainKey, hashedKey, prefix };
}

export function hashApiKey(plainKey: string): string {
  return crypto.createHmac('sha256', env.API_KEY_SECRET).update(plainKey).digest('hex');
}
