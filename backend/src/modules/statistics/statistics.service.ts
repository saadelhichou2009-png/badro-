import { prisma } from '../../database/prisma';
import { AppError } from '../../common/errors/AppError';
import { logger } from '../../utils/logger';

function toNum(d: unknown): number {
  return d === null || d === undefined ? 0 : Number(d);
}

export class StatisticsService {
  private async assertOwnership(userId: string, accountId: string) {
    const account = await prisma.tradingAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw AppError.notFound('حساب التداول غير موجود');
    return account;
  }

  /**
   * يعيد حساب كل الإحصائيات من الصفر بالاعتماد على جدول Trades، ويحفظها في جدول Statistics
   * (Cache) لتسريع عرض الـ Dashboard دون إعادة الحساب في كل طلب.
   * يُستدعى بعد كل مزامنة صفقات من الـ EA، وأيضاً بشكل دوري عبر Background Job (المرحلة 6).
   */
  async recalculate(accountId: string) {
    const account = await prisma.tradingAccount.findUnique({ where: { id: accountId } });
    if (!account) throw AppError.notFound('حساب التداول غير موجود');

    const closedTrades = await prisma.trade.findMany({
      where: { tradingAccountId: accountId, status: 'CLOSED' },
    });
    const openTradesCount = await prisma.trade.count({
      where: { tradingAccountId: accountId, status: 'OPEN' },
    });

    const profits = closedTrades.filter((t) => toNum(t.profit) > 0);
    const losses = closedTrades.filter((t) => toNum(t.profit) < 0);

    const totalProfit = profits.reduce((sum, t) => sum + toNum(t.profit), 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + toNum(t.profit), 0));
    const netProfit = totalProfit - totalLoss;

    const totalTrades = closedTrades.length;
    const winningTrades = profits.length;
    const losingTrades = losses.length;

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? totalProfit : 0;

    const averageProfit = winningTrades > 0 ? totalProfit / winningTrades : 0;
    const averageLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;
    const averageRR = averageLoss > 0 ? averageProfit / averageLoss : 0;

    const largestProfit = profits.length > 0 ? Math.max(...profits.map((t) => toNum(t.profit))) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => toNum(t.profit))) : 0;

    const durations = closedTrades
      .filter((t) => t.closeTime)
      .map((t) => (t.closeTime!.getTime() - t.openTime.getTime()) / 60000);
    const averageTradeDurationMin =
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    // Drawdown من تاريخ الـ Equity المُسجَّل من الـ EA
    const equityHistory = await prisma.equityHistory.findMany({
      where: { tradingAccountId: accountId },
      orderBy: { recordedAt: 'asc' },
    });

    let peakEquity = toNum(account.initialBalance) || 0;
    let maxDrawdown = 0;
    for (const point of equityHistory) {
      const equity = toNum(point.equity);
      if (equity > peakEquity) peakEquity = equity;
      const dd = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
    const currentEquity = toNum(account.equity);
    const currentDrawdown = peakEquity > 0 ? Math.max(0, ((peakEquity - currentEquity) / peakEquity) * 100) : 0;

    const initialBalance = toNum(account.initialBalance);
    const accountGrowthPercent =
      initialBalance > 0 ? ((toNum(account.balance) - initialBalance) / initialBalance) * 100 : 0;

    const statistics = await prisma.statistics.upsert({
      where: { tradingAccountId: accountId },
      create: {
        tradingAccountId: accountId,
        totalProfit,
        totalLoss,
        netProfit,
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        profitFactor,
        averageProfit,
        averageLoss,
        averageRR,
        largestProfit,
        largestLoss,
        averageTradeDurationMin,
        openTradesCount,
        currentDrawdown,
        maxDrawdown,
        accountGrowthPercent,
      },
      update: {
        totalProfit,
        totalLoss,
        netProfit,
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        profitFactor,
        averageProfit,
        averageLoss,
        averageRR,
        largestProfit,
        largestLoss,
        averageTradeDurationMin,
        openTradesCount,
        currentDrawdown,
        maxDrawdown,
        accountGrowthPercent,
      },
    });

    logger.info('تم إعادة حساب الإحصائيات', { accountId, winRate, profitFactor, netProfit });
    return statistics;
  }

  async getStatistics(userId: string, accountId: string) {
    await this.assertOwnership(userId, accountId);
    let stats = await prisma.statistics.findUnique({ where: { tradingAccountId: accountId } });
    if (!stats) {
      stats = await this.recalculate(accountId);
    }
    return stats;
  }

  async getEquityCurve(userId: string, accountId: string) {
    await this.assertOwnership(userId, accountId);
    const points = await prisma.equityHistory.findMany({
      where: { tradingAccountId: accountId },
      orderBy: { recordedAt: 'asc' },
      select: { balance: true, equity: true, drawdown: true, recordedAt: true },
    });
    return points;
  }

  /**
   * تجميع الأرباح حسب الفترة (يومي/أسبوعي/شهري) بالاعتماد على وقت إغلاق الصفقة
   */
  async getProfitByPeriod(userId: string, accountId: string, period: 'daily' | 'weekly' | 'monthly') {
    await this.assertOwnership(userId, accountId);

    const trades = await prisma.trade.findMany({
      where: { tradingAccountId: accountId, status: 'CLOSED', closeTime: { not: null } },
      select: { closeTime: true, profit: true },
      orderBy: { closeTime: 'asc' },
    });

    const buckets = new Map<string, number>();

    for (const t of trades) {
      const date = t.closeTime!;
      let key: string;
      if (period === 'daily') {
        key = date.toISOString().slice(0, 10); // YYYY-MM-DD
      } else if (period === 'weekly') {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const week = Math.ceil(((date.getTime() - firstDayOfYear.getTime()) / 86400000 + firstDayOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      buckets.set(key, (buckets.get(key) ?? 0) + toNum(t.profit));
    }

    return Array.from(buckets.entries())
      .map(([period_, profit]) => ({ period: period_, profit: Math.round(profit * 100) / 100 }))
      .sort((a, b) => (a.period > b.period ? 1 : -1));
  }

  /**
   * توزيع الأرباح حسب أيام الأسبوع، الأزواج، والساعة (لبناء Heatmap في الواجهة)
   */
  async getDistributions(userId: string, accountId: string) {
    await this.assertOwnership(userId, accountId);

    const trades = await prisma.trade.findMany({
      where: { tradingAccountId: accountId, status: 'CLOSED', closeTime: { not: null } },
      select: { closeTime: true, symbol: true, profit: true },
    });

    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const byDay = new Map<string, number>();
    const bySymbol = new Map<string, number>();
    const byHour = new Map<number, number>();
    // مصفوفة Heatmap: 7 أيام × 24 ساعة
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const t of trades) {
      const date = t.closeTime!;
      const profit = toNum(t.profit);
      const dayName = dayNames[date.getDay()];
      const hour = date.getHours();

      byDay.set(dayName, (byDay.get(dayName) ?? 0) + profit);
      bySymbol.set(t.symbol, (bySymbol.get(t.symbol) ?? 0) + profit);
      byHour.set(hour, (byHour.get(hour) ?? 0) + profit);
      heatmap[date.getDay()][hour] += profit;
    }

    const round = (n: number) => Math.round(n * 100) / 100;

    return {
      byDay: Array.from(byDay.entries()).map(([day, profit]) => ({ day, profit: round(profit) })),
      bySymbol: Array.from(bySymbol.entries())
        .map(([symbol, profit]) => ({ symbol, profit: round(profit) }))
        .sort((a, b) => b.profit - a.profit),
      byHour: Array.from({ length: 24 }, (_, h) => ({ hour: h, profit: round(byHour.get(h) ?? 0) })),
      heatmap: heatmap.map((row) => row.map(round)),
    };
  }
}

export const statisticsService = new StatisticsService();
