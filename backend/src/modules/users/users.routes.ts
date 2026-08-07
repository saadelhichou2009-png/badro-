import { Router } from 'express';
import { usersController } from './users.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateBody } from '../../common/middlewares/validate';
import { authGuard } from '../../common/middlewares/authGuard';
import { updateProfileSchema } from './users.dto';

const router = Router();

router.get('/me', authGuard, asyncHandler(usersController.getProfile));
router.patch('/me', authGuard, validateBody(updateProfileSchema), asyncHandler(usersController.updateProfile));
router.post('/me/deactivate', authGuard, asyncHandler(usersController.deactivate));

export default router;
