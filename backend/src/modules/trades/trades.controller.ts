import { Response } from 'express';
import { tradesService } from './trades.service';
import { AuthenticatedRequest } from '../../common/middlewares/authGuard';
import { AppError } from '../../common/errors/AppError';

export class TradesController {
  async findAll(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const result = await tradesService.findAll(req.user.id, req.params.accountId, req.query as never);
    return res.status(200).json({ success: true, ...result });
  }

  async findOne(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const result = await tradesService.findOne(req.user.id, req.params.accountId, req.params.tradeId);
    return res.status(200).json({ success: true, data: result });
  }

  async symbols(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const result = await tradesService.listSymbols(req.user.id, req.params.accountId);
    return res.status(200).json({ success: true, data: result });
  }
}

export const tradesController = new TradesController();
