import cron from 'node-cron';
import { prisma } from '../database/prisma';
import { notificationsService } from '../modules/notifications/notifications.routes';
import { logger } from '../utils/logger';

const STALE_THRESHOLD_MINUTES = 5; // الـ EA يُفترض أن يُزامن كل دقيقة تقريباً

/**
 * يفحص كل الحسابات النشطة كل 5 دقائق. أي حساب لم تصل منه بيانات منذ أكثر
 * من STALE_THRESHOLD_MINUTES يُعتبر منقطع الاتصال (DISCONNECTED) - غالباً بسبب
 * إغلاق المنصة أو فقدان الاتصال بالإنترنت على جهاز المستخدم.
 */
export function scheduleMarkDisconnectedJob() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const threshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000);

      const staleAccounts = await prisma.tradingAccount.findMany({
        where: {
          status: 'ACTIVE',
          OR: [{ lastSyncAt: { lt: threshold } }, { lastSyncAt: null }],
        },
      });

      for (const account of staleAccounts) {
        await prisma.tradingAccount.update({
          where: { id: account.id },
          data: { status: 'DISCONNECTED' },
        });

        await notificationsService.create(
          account.userId,
          'انقطع اتصال حساب التداول',
          `توقف حساب "${account.accountName}" عن إرسال البيانات منذ أكثر من ${STALE_THRESHOLD_MINUTES} دقائق. تأكد من أن منصة MT4/MT5 تعمل والـ Expert Advisor مُفعَّل.`,
          'WARNING',
        );
      }

      if (staleAccounts.length > 0) {
        logger.warn(`⚠️ تم وضع علامة "منقطع" على ${staleAccounts.length} حساب`);
      }
    } catch (err) {
      logger.error('فشل Job فحص الحسابات المنقطعة', { error: (err as Error).message });
    }
  });
}
