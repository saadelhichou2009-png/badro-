import { Response } from 'express';
import { usersService } from './users.service';
import { AuthenticatedRequest } from '../../common/middlewares/authGuard';
import { AppError } from '../../common/errors/AppError';

export class UsersController {
  async getProfile(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const profile = await usersService.getProfile(req.user.id);
    return res.status(200).json({ success: true, data: profile });
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const profile = await usersService.updateProfile(req.user.id, req.body);
    return res.status(200).json({ success: true, message: 'تم تحديث الملف الشخصي', data: profile });
  }

  async deactivate(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const result = await usersService.deactivateAccount(req.user.id);
    return res.status(200).json({ success: true, ...result });
  }
}

export const usersController = new UsersController();
