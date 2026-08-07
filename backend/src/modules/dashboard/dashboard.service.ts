import { prisma } from '../../database/prisma';
import { statisticsService } from '../statistics/statistics.service';
import { AppError } from '../../common/errors/AppError';
import { cached } from '../../utils/cache';

function toNum(d: unknown): number {
  return d === null || d === undefined ? 0 : Number(d);
}

export class DashboardService {
  /**
   * لوحة تحكم حساب واحد: يدمج لقطة الحساب (balance/equity/margin...) مع الإحصائيات المحسوبة
   * مُخزَّنة في Redis لمدة 30 ثانية فقط - تكفي لتخفيف الضغط دون عرض بيانات قديمة عملياً
   * (العميل يستدعي هذا كل بضع ثوانٍ لتحديث الشاشة)
   */
  async getAccountDashboard(userId: string, accountId: string) {
    return cached(`dashboard:account:${accountId}`, 30, async () => {
      const account = await prisma.tradingAccount.findFirst({ where: { id: accountId, userId } });
      if (!account) throw AppError.notFound('حساب التداول غير موجود');

      const statistics = await statisticsService.getStatistics(userId, accountId);

      return {
        account: {
          id: account.id,
          accountName: account.accountName,
          accountNumber: account.accountNumber,
          broker: account.broker,
          platform: account.platform,
          status: account.status,
          currency: account.currency,
          leverage: account.leverage,
          balance: toNum(account.balance),
          equity: toNum(account.equity),
          margin: toNum(account.margin),
          freeMargin: toNum(account.freeMargin),
          marginLevel: toNum(account.marginLevel),
          lastSyncAt: account.lastSyncAt,
        },
        statistics,
      };
    });
  }

  /**
   * لوحة تحكم مجمّعة لكل حسابات المستخدم - مُخزَّنة 30 ثانية لكل مستخدم
   */
  async getOverviewDashboard(userId: string) {
    return cached(`dashboard:overview:${userId}`, 30, async () => {
      const accounts = await prisma.tradingAccount.findMany({
        where: { userId },
        include: { statistics: true },
      });

      const totalBalance = accounts.reduce((s, a) => s + toNum(a.balance), 0);
      const totalEquity = accounts.reduce((s, a) => s + toNum(a.equity), 0);
      const totalNetProfit = accounts.reduce((s, a) => s + toNum(a.statistics?.netProfit), 0);
      const totalTrades = accounts.reduce((s, a) => s + (a.statistics?.totalTrades ?? 0), 0);
      const totalWinning = accounts.reduce((s, a) => s + (a.statistics?.winningTrades ?? 0), 0);
      const overallWinRate = totalTrades > 0 ? (totalWinning / totalTrades) * 100 : 0;

      return {
        accountsCount: accounts.length,
        activeAccountsCount: accounts.filter((a) => a.status === 'ACTIVE').length,
        totalBalance,
        totalEquity,
        totalNetProfit,
        totalTrades,
        overallWinRate,
        accounts: accounts.map((a) => ({
          id: a.id,
          accountName: a.accountName,
          platform: a.platform,
          status: a.status,
          balance: toNum(a.balance),
          equity: toNum(a.equity),
          netProfit: toNum(a.statistics?.netProfit),
          winRate: toNum(a.statistics?.winRate),
        })),
      };
    });
  }
}

export const dashboardService = new DashboardService();
