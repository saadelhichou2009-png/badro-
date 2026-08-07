import { Router } from 'express';
import { tradesController } from './trades.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateQuery } from '../../common/middlewares/validate';
import { authGuard } from '../../common/middlewares/authGuard';
import { listTradesQuerySchema } from './trades.dto';

// mergeParams يسمح بقراءة :accountId من الراوتر الأب (accounts.routes.ts)
const router = Router({ mergeParams: true });

router.use(authGuard);

router.get('/', validateQuery(listTradesQuerySchema), asyncHandler(tradesController.findAll));
router.get('/symbols', asyncHandler(tradesController.symbols));
router.get('/:tradeId', asyncHandler(tradesController.findOne));

export default router;
