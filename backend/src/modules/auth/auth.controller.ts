import { Request, Response } from 'express';
import { authService } from './auth.service';
import { AuthenticatedRequest } from '../../common/middlewares/authGuard';
import { AppError } from '../../common/errors/AppError';

export class AuthController {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح، الرجاء تفعيل بريدك الإلكتروني',
      data: result,
    });
  }

  async verifyEmail(req: Request, res: Response) {
    const result = await authService.verifyEmail(req.body);
    return res.status(200).json({ success: true, ...result });
  }

  async login(req: Request, res: Response) {
    const meta = { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
    const result = await authService.login(req.body, meta);
    return res.status(200).json({ success: true, message: 'تم تسجيل الدخول بنجاح', data: result });
  }

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    return res.status(200).json({ success: true, data: result });
  }

  async logout(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const result = await authService.logout(refreshToken);
    return res.status(200).json({ success: true, ...result });
  }

  async logoutAll(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const result = await authService.logoutAllSessions(req.user.id);
    return res.status(200).json({ success: true, ...result });
  }

  async forgotPassword(req: Request, res: Response) {
    const result = await authService.forgotPassword(req.body);
    return res.status(200).json({ success: true, ...result });
  }

  async resetPassword(req: Request, res: Response) {
    const result = await authService.resetPassword(req.body);
    return res.status(200).json({ success: true, ...result });
  }

  async changePassword(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const result = await authService.changePassword(req.user.id, req.body);
    return res.status(200).json({ success: true, ...result });
  }

  async me(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    return res.status(200).json({ success: true, data: req.user });
  }
}

export const authController = new AuthController();
