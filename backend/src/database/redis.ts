import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// خدمات Redis المجانية السحابية (مثل Upstash) تُعطي رابطاً كاملاً بصيغة
// rediss://default:password@host:port بدلاً من host/port/password منفصلين.
// إن وُجد REDIS_URL نستخدمه مباشرة، وإلا نبني الاتصال من الحقول المنفصلة (للتطوير المحلي).
export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true })
  : new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

redis.on('error', (err) => logger.error('Redis connection error', { error: err.message }));
redis.on('connect', () => logger.info('Redis connected'));
