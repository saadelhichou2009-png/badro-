import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './database/prisma';
import { redis } from './database/redis';
import { scheduleStatisticsRecalcJob } from './jobs/statistics-recalc.job';
import { scheduleMarkDisconnectedJob } from './jobs/mark-disconnected.job';

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('✅ تم الاتصال بقاعدة البيانات PostgreSQL');

    let redisAvailable = false;
    try {
      await redis.connect();
      redisAvailable = true;
      logger.info('✅ تم الاتصال بـ Redis');
    } catch {
      logger.warn('⚠️ تعذر الاتصال بـ Redis - سيعمل النظام بدون Cache');
    }

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 الخادم يعمل على المنفذ ${env.PORT} [${env.NODE_ENV}]`);
    });

    // تشغيل المهام الدورية (Background Jobs) - لا تعمل إلا بعد جهوزية القاعدة والخادم
    scheduleStatisticsRecalcJob();
    scheduleMarkDisconnectedJob();
    logger.info('🕐 تم تفعيل المهام الدورية (إعادة حساب الإحصائيات + رصد الحسابات المنقطعة)');

    const shutdown = async (signal: string) => {
      logger.info(`تم استلام ${signal}، إيقاف الخادم بأمان...`);
      server.close(async () => {
        await prisma.$disconnect();
        if (redisAvailable) redis.disconnect();
        logger.info('تم إيقاف الخادم بنجاح');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('فشل تشغيل الخادم', { error: (err as Error).message });
    process.exit(1);
  }
}

bootstrap();
