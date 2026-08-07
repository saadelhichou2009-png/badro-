import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../common/errors/AppError';
import type { ListTradesQueryDto } from './trades.dto';

export class TradesService {
  /**
   * يتأكد أن الحساب موجود ويعود لهذا المستخدم قبل عرض صفقاته
   */
  private async assertOwnership(userId: string, accountId: string) {
    const account = await prisma.tradingAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw AppError.notFound('حساب التداول غير موجود');
    return account;
  }

  async findAll(userId: string, accountId: string, query: ListTradesQueryDto) {
    await this.assertOwnership(userId, accountId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const sortBy = query.sortBy ?? 'openTime';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.TradeWhereInput = { tradingAccountId: accountId };

    if (query.symbol) where.symbol = { equals: query.symbol, mode: 'insensitive' };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    if (query.dateFrom || query.dateTo) {
      where.openTime = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    if (query.search) {
      where.OR = [
        { symbol: { contains: query.search, mode: 'insensitive' } },
        { ticket: { contains: query.search, mode: 'insensitive' } },
        { comment: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.trade.count({ where }),
    ]);

    // مدة الصفقة (بالدقائق) تُحسب هنا للعرض فقط، ولا تُخزَّن في القاعدة
    const withDuration = items.map((t) => ({
      ...t,
      durationMinutes: t.closeTime
        ? Math.round((t.closeTime.getTime() - t.openTime.getTime()) / 60000)
        : null,
    }));

    return {
      items: withDuration,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(userId: string, accountId: string, tradeId: string) {
    await this.assertOwnership(userId, accountId);
    const trade = await prisma.trade.findFirst({ where: { id: tradeId, tradingAccountId: accountId } });
    if (!trade) throw AppError.notFound('الصفقة غير موجودة');
    return trade;
  }

  /**
   * قائمة الأزواج (Symbols) التي تداول عليها الحساب - تُستخدم لملء قائمة الفلترة في الواجهة
   */
  async listSymbols(userId: string, accountId: string) {
    await this.assertOwnership(userId, accountId);
    const rows = await prisma.trade.findMany({
      where: { tradingAccountId: accountId },
      select: { symbol: true },
      distinct: ['symbol'],
      orderBy: { symbol: 'asc' },
    });
    return rows.map((r) => r.symbol);
  }
}

export const tradesService = new TradesService();
