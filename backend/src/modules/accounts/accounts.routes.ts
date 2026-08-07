import { Router } from 'express';
import { accountsController } from './accounts.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateBody, validateQuery } from '../../common/middlewares/validate';
import { authGuard } from '../../common/middlewares/authGuard';
import { createAccountSchema, updateAccountSchema, listAccountsQuerySchema } from './accounts.dto';

const router = Router();

router.use(authGuard); // كل مسارات الحسابات تتطلب تسجيل دخول

router.post('/', validateBody(createAccountSchema), asyncHandler(accountsController.create));
router.get('/', validateQuery(listAccountsQuerySchema), asyncHandler(accountsController.findAll));
router.get('/:id', asyncHandler(accountsController.findOne));
router.patch('/:id', validateBody(updateAccountSchema), asyncHandler(accountsController.update));
router.delete('/:id', asyncHandler(accountsController.remove));
router.post('/:id/regenerate-key', asyncHandler(accountsController.regenerateApiKey));

export default router;
