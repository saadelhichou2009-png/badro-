import { Response, Router } from 'express';
import { prisma } from '../../database/prisma';
import { AuthenticatedRequest, authGuard } from '../../common/middlewares/authGuard';
import { AppError } from '../../common/errors/AppError';
import { asyncHandler } from '../../utils/asyncHandler';

export class NotificationsService {
  async create(userId: string, title: string, message: string, type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' = 'INFO') {
    return prisma.notification.create({ data: { userId, title, message, type } });
  }

  async list(userId: string, unreadOnly = false) {
    return prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markAsRead(userId: string, id: string) {
    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw AppError.notFound('الإشعار غير موجود');
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { message: 'تم تحديد كل الإشعارات كمقروءة' };
  }
}

export const notificationsService = new NotificationsService();

class NotificationsController {
  async list(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const unreadOnly = req.query.unread === 'true';
    const data = await notificationsService.list(req.user.id, unreadOnly);
    return res.status(200).json({ success: true, data });
  }

  async markAsRead(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const data = await notificationsService.markAsRead(req.user.id, req.params.id);
    return res.status(200).json({ success: true, data });
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const data = await notificationsService.markAllAsRead(req.user.id);
    return res.status(200).json({ success: true, ...data });
  }
}

const notificationsController = new NotificationsController();

const router = Router();
router.use(authGuard);
router.get('/', asyncHandler(notificationsController.list));
router.patch('/:id/read', asyncHandler(notificationsController.markAsRead));
router.patch('/read-all', asyncHandler(notificationsController.markAllAsRead));

export default router;
