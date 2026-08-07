import { prisma } from '../../database/prisma';
import { AppError } from '../../common/errors/AppError';
import { hashPassword, comparePassword } from '../../utils/password.util';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateRandomToken,
} from '../../utils/token.util';
import { sendMail, verifyEmailTemplate, resetPasswordTemplate } from '../../utils/mailer';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import type {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
} from './auth.dto';

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

const REFRESH_TOKEN_TTL_DAYS = 30;

export class AuthService {
  async register(dto: RegisterDto) {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw AppError.conflict('يوجد حساب مسجل بهذا البريد الإلكتروني مسبقاً');
    }

    const hashedPassword = await hashPassword(dto.password);
    const emailVerifyToken = generateRandomToken();
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: hashedPassword,
        emailVerifyToken,
        emailVerifyExpiry,
      },
    });

    const verifyLink = `${env.APP_URL}/verify-email?token=${emailVerifyToken}`;
    await sendMail(user.email, 'تفعيل بريدك الإلكتروني', verifyEmailTemplate(user.firstName, verifyLink));

    await this.log(user.id, 'REGISTER', 'تم إنشاء حساب جديد');

    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await prisma.user.findUnique({ where: { emailVerifyToken: dto.token } });
    if (!user || !user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
      throw AppError.badRequest('رابط التفعيل غير صالح أو منتهي الصلاحية');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null },
    });

    await this.log(user.id, 'EMAIL_VERIFIED', 'تم تفعيل البريد الإلكتروني');
    return { message: 'تم تفعيل بريدك الإلكتروني بنجاح' };
  }

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw AppError.unauthorized('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    if (!user.isActive) {
      throw AppError.forbidden('هذا الحساب معطل، تواصل مع الدعم');
    }

    const validPassword = await comparePassword(dto.password, user.password);
    if (!validPassword) {
      await this.log(user.id, 'LOGIN_FAILED', 'محاولة دخول فاشلة - كلمة مرور خاطئة', meta);
      throw AppError.unauthorized('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id });

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.log(user.id, 'LOGIN_SUCCESS', 'تسجيل دخول ناجح', meta);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized('رمز التحديث غير صالح أو منتهي الصلاحية');
    }

    const session = await prisma.session.findUnique({ where: { refreshToken } });
    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw AppError.unauthorized('الجلسة غير صالحة، الرجاء تسجيل الدخول مجدداً');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw AppError.unauthorized('المستخدم غير موجود أو معطل');
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    return { accessToken };
  }

  async logout(refreshToken: string) {
    await prisma.session.updateMany({
      where: { refreshToken },
      data: { isRevoked: true },
    });
    return { message: 'تم تسجيل الخروج بنجاح' };
  }

  async logoutAllSessions(userId: string) {
    await prisma.session.updateMany({ where: { userId }, data: { isRevoked: true } });
    return { message: 'تم تسجيل الخروج من جميع الأجهزة' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    // لا نكشف عدم وجود الحساب لأسباب أمنية - نرجع رسالة عامة دائماً
    if (!user) {
      return { message: 'إذا كان البريد الإلكتروني مسجلاً، سيصلك رابط إعادة تعيين كلمة المرور' };
    }

    const resetToken = generateRandomToken();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // ساعة واحدة

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken, resetPasswordExpiry: resetExpiry },
    });

    const resetLink = `${env.APP_URL}/reset-password?token=${resetToken}`;
    await sendMail(user.email, 'إعادة تعيين كلمة المرور', resetPasswordTemplate(user.firstName, resetLink));

    await this.log(user.id, 'PASSWORD_RESET_REQUESTED', 'طلب إعادة تعيين كلمة المرور');

    return { message: 'إذا كان البريد الإلكتروني مسجلاً، سيصلك رابط إعادة تعيين كلمة المرور' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await prisma.user.findUnique({ where: { resetPasswordToken: dto.token } });
    if (!user || !user.resetPasswordExpiry || user.resetPasswordExpiry < new Date()) {
      throw AppError.badRequest('رابط إعادة التعيين غير صالح أو منتهي الصلاحية');
    }

    const hashedPassword = await hashPassword(dto.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetPasswordToken: null, resetPasswordExpiry: null },
    });

    // إبطال كل الجلسات القديمة كإجراء أمني بعد تغيير كلمة المرور
    await prisma.session.updateMany({ where: { userId: user.id }, data: { isRevoked: true } });

    await this.log(user.id, 'PASSWORD_RESET_SUCCESS', 'تم إعادة تعيين كلمة المرور بنجاح');
    return { message: 'تم إعادة تعيين كلمة المرور بنجاح، الرجاء تسجيل الدخول' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('المستخدم غير موجود');

    const validPassword = await comparePassword(dto.currentPassword, user.password);
    if (!validPassword) {
      throw AppError.badRequest('كلمة المرور الحالية غير صحيحة');
    }

    const hashedPassword = await hashPassword(dto.newPassword);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    await this.log(userId, 'PASSWORD_CHANGED', 'تم تغيير كلمة المرور');
    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }

  private async log(userId: string, action: string, message: string, meta?: RequestMeta) {
    try {
      await prisma.log.create({
        data: {
          userId,
          action,
          message,
          level: action.includes('FAILED') ? 'WARN' : 'INFO',
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
      });
    } catch (err) {
      logger.error('فشل تسجيل السجل (Log)', { error: (err as Error).message });
    }
  }
}

export const authService = new AuthService();
