import { redis } from '../database/redis';
import { logger } from './logger';

/**
 * يحاول جلب القيمة من Redis أولاً، وإن لم تكن موجودة (أو Redis غير متاح)
 * ينفّذ fetcher ويخزّن نتيجته لمدة ttlSeconds.
 * فشل Redis لا يوقف التطبيق أبداً - يعمل النظام بشكل طبيعي بدون Cache.
 */
export async function cached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  try {
    const raw = await redis.get(key);
    if (raw) return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn('تعذرت قراءة Cache من Redis', { key, error: (err as Error).message });
  }

  const value = await fetcher();

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn('تعذرت الكتابة إلى Cache في Redis', { key, error: (err as Error).message });
  }

  return value;
}

/**
 * يحذف كل مفاتيح الـ Cache المطابقة لنمط معيّن (يُستخدم عند تحديث بيانات حساب معين
 * لإبطال الـ Cache القديم فوراً بدل انتظار انتهاء الـ TTL)
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    logger.warn('تعذر إبطال الـ Cache', { pattern, error: (err as Error).message });
  }
}
