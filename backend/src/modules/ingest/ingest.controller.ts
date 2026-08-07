import { Response } from 'express';
import { ingestService } from './ingest.service';
import { ApiKeyAuthenticatedRequest } from '../../common/middlewares/authGuard';
import { AppError } from '../../common/errors/AppError';

export class IngestController {
  async accountInfo(req: ApiKeyAuthenticatedRequest, res: Response) {
    const account = await ingestService.assertAccountAttached(req.apiKeyRecord?.tradingAccountId);
    if (!account) throw AppError.notFound('حساب التداول غير موجود');
    const updated = await ingestService.ingestAccountInfo(account, req.body);
    return res.status(200).json({
      success: true,
      message: 'تم استلام بيانات الحساب بنجاح',
      data: { balance: updated.balance, equity: updated.equity, status: updated.status },
    });
  }

  async tradesBatch(req: ApiKeyAuthenticatedRequest, res: Response) {
    const account = await ingestService.assertAccountAttached(req.apiKeyRecord?.tradingAccountId);
    const result = await ingestService.ingestTrades(account, req.body.trades);
    return res.status(200).json({ success: true, message: 'تم استلام الصفقات بنجاح', data: result });
  }

  async singleTrade(req: ApiKeyAuthenticatedRequest, res: Response) {
    const account = await ingestService.assertAccountAttached(req.apiKeyRecord?.tradingAccountId);
    const result = await ingestService.ingestSingleTrade(account, req.body.trade);
    return res.status(200).json({ success: true, message: 'تم استلام الصفقة بنجاح', data: result });
  }

  /** يستخدمها الـ EA للتأكد من صلاحية المفتاح عند بدء التشغيل */
  async ping(req: ApiKeyAuthenticatedRequest, res: Response) {
    return res.status(200).json({
      success: true,
      message: 'مفتاح API صالح والاتصال يعمل',
      data: {
        accountId: req.apiKeyRecord?.tradingAccountId,
        keyLabel: req.apiKeyRecord?.label,
      },
    });
  }
}

export const ingestController = new IngestController();
