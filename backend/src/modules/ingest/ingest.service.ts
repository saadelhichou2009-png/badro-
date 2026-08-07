import { Prisma, TradingAccount } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../common/errors/AppError';
import { logger } from '../../utils/logger';
import { statisticsService } from '../statistics/statistics.service';
import { invalidateCache } from '../../utils/cache';
import type { AccountInfoDto, TradeIngestDto } from './ingest.dto';

export class IngestService {
  /**
   * يستقبل لقطة بيانات الحساب (رصيد/equity/هامش) من الـ EA، يحدّث الحساب،
   * ويسجل نقطة في تاريخ الـ Equity لرسم منحنى Equity Curve لاحقاً.
   */
  async ingestAccountInfo(account: TradingAccount, dto: AccountInfoDto) {
    const drawdown = dto.balance > 0 ? Math.max(0, ((dto.balance - dto.equity) / dto.balance) * 100) : 0;

    const updated = await prisma.tradingAccount.update({
      where: { id: account.id },
      data: {
        balance: dto.balance,
        equity: dto.equity,
        margin: dto.margin ?? 0,
        freeMargin: dto.freeMargin ?? 0,
        marginLevel: dto.marginLevel ?? 0,
        currency: dto.currency ?? account.currency,
        leverage: dto.leverage ?? account.leverage,
        broker: dto.broker ?? account.broker,
        server: dto.server ?? account.server,
        status: 'ACTIVE',
        lastSyncAt: new Date(),
        // أول لقطة نستلمها تُعتبر الرصيد الابتدائي لحساب نمو الحساب لاحقاً
        initialBalance: account.initialBalance.toNumber() > 0 ? account.initialBalance : dto.balance,
      },
    });

    await prisma.equityHistory.create({
      data: {
        tradingAccountId: account.id,
        balance: dto.balance,
        equity: dto.equity,
        drawdown,
      },
    });

    // إعادة حساب الإحصائيات الكاملة (win rate, profit factor, max drawdown الحقيقي من كل تاريخ الـ Equity...)
    await statisticsService.recalculate(account.id);
    await invalidateCache(`dashboard:*:${account.userId}*`);
    await invalidateCache(`dashboard:account:${account.id}`);

    return updated;
  }

  /**
   * يستقبل صفقة واحدة أو أكثر ويقوم بعملية upsert بالاعتماد على (tradingAccountId + ticket)
   * حتى لا تتكرر نفس الصفقة عند كل مزامنة.
   */
  async ingestTrades(account: TradingAccount, trades: TradeIngestDto[]) {
    let created = 0;
    let updated = 0;

    for (const t of trades) {
      const data: Prisma.TradeUncheckedCreateInput = {
        tradingAccountId: account.id,
        ticket: t.ticket,
        symbol: t.symbol,
        type: t.type,
        status: t.status,
        lotSize: t.lotSize,
        openPrice: t.openPrice,
        closePrice: t.closePrice,
        stopLoss: t.stopLoss,
        takeProfit: t.takeProfit,
        openTime: new Date(t.openTime),
        closeTime: t.closeTime ? new Date(t.closeTime) : null,
        commission: t.commission ?? 0,
        swap: t.swap ?? 0,
        profit: t.profit ?? 0,
        comment: t.comment,
        magicNumber: t.magicNumber,
      };

      const existing = await prisma.trade.findUnique({
        where: { tradingAccountId_ticket: { tradingAccountId: account.id, ticket: t.ticket } },
      });

      if (existing) {
        await prisma.trade.update({
          where: { tradingAccountId_ticket: { tradingAccountId: account.id, ticket: t.ticket } },
          data,
        });
        updated++;
      } else {
        await prisma.trade.create({ data });
        created++;
      }
    }

    await prisma.tradingAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(), status: 'ACTIVE' },
    });

    if (created > 0 || updated > 0) {
      await statisticsService.recalculate(account.id);
      await invalidateCache(`dashboard:*:${account.userId}*`);
      await invalidateCache(`dashboard:account:${account.id}`);
    }

    logger.info('تم استقبال صفقات من EA', { accountId: account.id, created, updated });

    return { received: trades.length, created, updated };
  }

  async ingestSingleTrade(account: TradingAccount, trade: TradeIngestDto) {
    const result = await this.ingestTrades(account, [trade]);
    return result;
  }

  /**
   * يُستدعى إذا فشل الـ EA بإرسال أي بيانات لفترة طويلة (Cron في المرحلة 6)
   * لتعليم الحساب كـ "منقطع الاتصال"
   */
  async markDisconnectedIfStale(staleMinutes = 10) {
    const threshold = new Date(Date.now() - staleMinutes * 60 * 1000);
    const result = await prisma.tradingAccount.updateMany({
      where: { status: 'ACTIVE', lastSyncAt: { lt: threshold } },
      data: { status: 'DISCONNECTED' },
    });
    if (result.count > 0) {
      logger.warn(`تم تعليم ${result.count} حساب كـ "منقطع الاتصال" لعدم استلام بيانات حديثة`);
    }
    return result.count;
  }

  async assertAccountAttached(accountId: string | null | undefined): Promise<TradingAccount> {
    if (!accountId) {
      throw AppError.badRequest('مفتاح API هذا غير مرتبط بأي حساب تداول');
    }
    const account = await prisma.tradingAccount.findUnique({ where: { id: accountId } });
    if (!account) {
      throw AppError.notFound('حساب التداول المرتبط بهذا المفتاح غير موجود');
    }
    return account;
  }
}

export const ingestService = new IngestService();
