import { Router } from 'express';
import { authController } from './auth.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateBody } from '../../common/middlewares/validate';
import { authGuard } from '../../common/middlewares/authGuard';
import { authRateLimiter } from '../../common/middlewares/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
} from './auth.dto';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), asyncHandler(authController.register));
router.post('/verify-email', validateBody(verifyEmailSchema), asyncHandler(authController.verifyEmail));
router.post('/login', authRateLimiter, validateBody(loginSchema), asyncHandler(authController.login));
router.post('/refresh', validateBody(refreshTokenSchema), asyncHandler(authController.refresh));
router.post('/logout', validateBody(refreshTokenSchema), asyncHandler(authController.logout));
router.post('/logout-all', authGuard, asyncHandler(authController.logoutAll));
router.post(
  '/forgot-password',
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(authController.resetPassword));
router.post(
  '/change-password',
  authGuard,
  validateBody(changePasswordSchema),
  asyncHandler(authController.changePassword),
);
router.get('/me', authGuard, asyncHandler(authController.me));

export default router;
