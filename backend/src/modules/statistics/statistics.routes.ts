import { Router } from 'express';
import { statisticsController } from './statistics.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { authGuard } from '../../common/middlewares/authGuard';

const router = Router({ mergeParams: true });
router.use(authGuard);

router.get('/', asyncHandler(statisticsController.getStatistics));
router.get('/equity-curve', asyncHandler(statisticsController.getEquityCurve));
router.get('/daily-profit', asyncHandler(statisticsController.getDailyProfit));
router.get('/weekly-profit', asyncHandler(statisticsController.getWeeklyProfit));
router.get('/monthly-profit', asyncHandler(statisticsController.getMonthlyProfit));
router.get('/distributions', asyncHandler(statisticsController.getDistributions));
router.post('/recalculate', asyncHandler(statisticsController.recalculate));

export default router;
