import { Response } from 'express';
import { Router } from 'express';
import { dashboardService } from './dashboard.service';
import { AuthenticatedRequest, authGuard } from '../../common/middlewares/authGuard';
import { AppError } from '../../common/errors/AppError';
import { asyncHandler } from '../../utils/asyncHandler';

class DashboardController {
  async overview(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const data = await dashboardService.getOverviewDashboard(req.user.id);
    return res.status(200).json({ success: true, data });
  }

  async byAccount(req: AuthenticatedRequest, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    const data = await dashboardService.getAccountDashboard(req.user.id, req.params.accountId);
    return res.status(200).json({ success: true, data });
  }
}

const dashboardController = new DashboardController();

const router = Router();
router.use(authGuard);
router.get('/', asyncHandler(dashboardController.overview));
router.get('/:accountId', asyncHandler(dashboardController.byAccount));

export default router;
