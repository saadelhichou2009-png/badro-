import { Response } from 'express';
import { accountsService } from './accounts.service';
import { AuthenticatedRequest } from '../../common/middlewares/authGuard';
import { AppError } from '../../common/errors/AppError';

export class AccountsController {
  async create(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const result = await accountsService.create(req.user.id, req.body);
    return res.status(201).json({ success: true, message: 'تم ربط حساب التداول بنجاح', data: result });
  }

  async findAll(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const result = await accountsService.findAllForUser(req.user.id, req.query as never);
    return res.status(200).json({ success: true, ...result });
  }

  async findOne(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const result = await accountsService.findOneForUser(req.user.id, req.params.id);
    return res.status(200).json({ success: true, data: result });
  }

  async update(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const result = await accountsService.update(req.user.id, req.params.id, req.body);
    return res.status(200).json({ success: true, message: 'تم تحديث الحساب', data: result });
  }

  async remove(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const result = await accountsService.remove(req.user.id, req.params.id);
    return res.status(200).json({ success: true, ...result });
  }

  async regenerateApiKey(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const result = await accountsService.regenerateApiKey(req.user.id, req.params.id);
    return res.status(200).json({ success: true, message: 'تم تجديد مفتاح API', data: result });
  }
}

export const accountsController = new AccountsController();
