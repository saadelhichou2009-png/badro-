import { prisma } from '../../database/prisma';
import { AppError } from '../../common/errors/AppError';
import type { UpdateProfileDto } from './users.dto';

const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  avatarUrl: true,
  timezone: true,
  isEmailVerified: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

export class UsersService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_FIELDS });
    if (!user) throw AppError.notFound('المستخدم غير موجود');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: dto,
      select: PUBLIC_USER_FIELDS,
    });
    return user;
  }

  async deactivateAccount(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    await prisma.session.updateMany({ where: { userId }, data: { isRevoked: true } });
    return { message: 'تم تعطيل الحساب بنجاح' };
  }
}

export const usersService = new UsersService();
