import { prisma } from '../../database/prisma';
import { AppError } from '../../common/errors/AppError';
import { generateApiKey } from '../../utils/token.util';
import { logger } from '../../utils/logger';
import type { CreateAccountDto, UpdateAccountDto, ListAccountsQueryDto } from './accounts.dto';

export class AccountsService {
  /**
   * ينشئ حساب تداول جديد للمستخدم ويولّد مفتاح API خاص به.
   * المفتاح الكامل (plainKey) يُعاد مرة واحدة فقط هنا؛ بعدها لن يكون بالإمكان استرجاعه.
   */
  async create(userId: string, dto: CreateAccountDto) {
    const duplicate = await prisma.tradingAccount.findFirst({
      where: { userId, accountNumber: dto.accountNumber, server: dto.server },
    });
    if (duplicate) {
      throw AppError.conflict('هذا الحساب مرتبط مسبقاً بحسابك');
    }

    const account = await prisma.tradingAccount.create({
      data: {
        userId,
        accountName: dto.accountName,
        accountNumber: dto.accountNumber,
        broker: dto.broker,
        server: dto.server,
        platform: dto.platform,
        currency: dto.currency ?? 'USD',
        leverage: dto.leverage ?? 100,
        isPublic: dto.isPublic ?? false,
        status: 'PENDING',
      },
    });

    // إنشاء إحصائيات فارغة مرتبطة بالحساب منذ البداية
    await prisma.statistics.create({ data: { tradingAccountId: account.id } });

    const { plainKey, hashedKey, prefix } = generateApiKey();
    await prisma.apiKey.create({
      data: {
        userId,
        tradingAccountId: account.id,
        key: hashedKey,
        keyPrefix: prefix,
        label: `مفتاح ${dto.accountName}`,
      },
    });

    await this.log(userId, 'ACCOUNT_CREATED', `تم إنشاء حساب تداول جديد: ${dto.accountName}`);

    return {
      account,
      // يُعرض للمستخدم مرة واحدة فقط ليضعه في إعدادات الـ EA
      apiKey: plainKey,
      warning: 'احتفظ بهذا المفتاح في مكان آمن، لن يتم عرضه مرة أخرى. استخدمه في إعدادات الـ Expert Advisor.',
    };
  }

  async findAllForUser(userId: string, query: ListAccountsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      prisma.tradingAccount.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { statistics: true },
      }),
      prisma.tradingAccount.count({ where: { userId } }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneForUser(userId: string, accountId: string) {
    const account = await prisma.tradingAccount.findFirst({
      where: { id: accountId, userId },
      include: { statistics: true, apiKeys: { select: { id: true, keyPrefix: true, label: true, isActive: true, lastUsedAt: true, createdAt: true } } },
    });
    if (!account) throw AppError.notFound('حساب التداول غير موجود');
    return account;
  }

  async update(userId: string, accountId: string, dto: UpdateAccountDto) {
    await this.assertOwnership(userId, accountId);
    const account = await prisma.tradingAccount.update({ where: { id: accountId }, data: dto });
    return account;
  }

  async remove(userId: string, accountId: string) {
    await this.assertOwnership(userId, accountId);
    await prisma.tradingAccount.delete({ where: { id: accountId } });
    await this.log(userId, 'ACCOUNT_DELETED', `تم حذف حساب التداول ${accountId}`);
    return { message: 'تم حذف حساب التداول بنجاح' };
  }

  /**
   * يُبطل مفتاح API القديم للحساب وينشئ مفتاحاً جديداً بدلاً منه.
   */
  async regenerateApiKey(userId: string, accountId: string) {
    await this.assertOwnership(userId, accountId);

    await prisma.apiKey.updateMany({
      where: { tradingAccountId: accountId, isActive: true },
      data: { isActive: false },
    });

    const { plainKey, hashedKey, prefix } = generateApiKey();
    const account = await prisma.tradingAccount.findUnique({ where: { id: accountId } });

    await prisma.apiKey.create({
      data: {
        userId,
        tradingAccountId: accountId,
        key: hashedKey,
        keyPrefix: prefix,
        label: `مفتاح ${account?.accountName ?? ''} (مُجدد)`,
      },
    });

    await this.log(userId, 'API_KEY_REGENERATED', `تم تجديد مفتاح API للحساب ${accountId}`);

    return {
      apiKey: plainKey,
      warning: 'تم إبطال المفتاح القديم فوراً. حدّث إعدادات الـ Expert Advisor بالمفتاح الجديد.',
    };
  }

  private async assertOwnership(userId: string, accountId: string) {
    const account = await prisma.tradingAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw AppError.notFound('حساب التداول غير موجود');
    return account;
  }

  private async log(userId: string, action: string, message: string) {
    try {
      await prisma.log.create({ data: { userId, action, message } });
    } catch (err) {
      logger.error('فشل تسجيل السجل (Log)', { error: (err as Error).message });
    }
  }
}

export const accountsService = new AccountsService();
