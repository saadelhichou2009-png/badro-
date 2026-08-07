import { Response } from 'express';
import { statisticsService } from './statistics.service';
import { AuthenticatedRequest } from '../../common/middlewares/authGuard';
import { AppError } from '../../common/errors/AppError';

export class StatisticsController {
  async getStatistics(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const data = await statisticsService.getStatistics(req.user.id, req.params.accountId);
    return res.status(200).json({ success: true, data });
  }

  async getEquityCurve(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const data = await statisticsService.getEquityCurve(req.user.id, req.params.accountId);
    return res.status(200).json({ success: true, data });
  }

  async getDailyProfit(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const data = await statisticsService.getProfitByPeriod(req.user.id, req.params.accountId, 'daily');
    return res.status(200).json({ success: true, data });
  }

  async getWeeklyProfit(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const data = await statisticsService.getProfitByPeriod(req.user.id, req.params.accountId, 'weekly');
    return res.status(200).json({ success: true, data });
  }

  async getMonthlyProfit(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const data = await statisticsService.getProfitByPeriod(req.user.id, req.params.accountId, 'monthly');
    return res.status(200).json({ success: true, data });
  }

  async getDistributions(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const data = await statisticsService.getDistributions(req.user.id, req.params.accountId);
    return res.status(200).json({ success: true, data });
  }

  async recalculate(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    // نتأكد أن الحساب يعود للمستخدم قبل إعادة الحساب اليدوي
    await statisticsService.getStatistics(req.user.id, req.params.accountId);
    const data = await statisticsService.recalculate(req.params.accountId);
    return res.status(200).json({ success: true, message: 'تم تحديث الإحصائيات', data });
  }
}

export const statisticsController = new StatisticsController();
