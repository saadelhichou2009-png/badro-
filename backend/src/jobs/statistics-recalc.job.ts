import cron from 'node-cron';
import { prisma } from '../database/prisma';
import { statisticsService } from '../modules/statistics/statistics.service';
import { logger } from '../utils/logger';

/**
 * يعيد حساب إحصائيات كل الحسابات النشطة كل 15 دقيقة.
 * هذا احتياطي فقط - الإحصائيات تُحدَّث أساساً فور استقبال صفقات جديدة من الـ EA (ingest.service).
 * لكن هذا الـ Job يضمن دقة البيانات حتى لو فشل تحديث لحظي لأي سبب.
 */
export function scheduleStatisticsRecalcJob() {
  // كل 15 دقيقة
  cron.schedule('*/15 * * * *', async () => {
    logger.info('⏱️ بدء إعادة حساب الإحصائيات الدورية لكل الحسابات');
    try {
      const accounts = await prisma.tradingAccount.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });

      for (const account of accounts) {
        try {
          await statisticsService.recalculate(account.id);
        } catch (err) {
          logger.error('فشل إعادة حساب إحصائيات حساب معين', {
            accountId: account.id,
            error: (err as Error).message,
          });
        }
      }

      logger.info(`✅ تمت إعادة حساب إحصائيات ${accounts.length} حساب`);
    } catch (err) {
      logger.error('فشل Job إعادة حساب الإحصائيات', { error: (err as Error).message });
    }
  });
}
