import { Router } from 'express';
import { ingestController } from './ingest.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateBody } from '../../common/middlewares/validate';
import { apiKeyGuard } from '../../common/middlewares/authGuard';
import { eaIngestRateLimiter } from '../../common/middlewares/rateLimiter';
import { accountInfoSchema, tradesBatchSchema, singleTradeSchema } from './ingest.dto';

const router = Router();

// كل هذه المسارات تُستدعى من الـ Expert Advisor مباشرة (وليس من المتصفح)
// المصادقة تتم عبر هيدر X-API-Key وليس JWT
router.use(apiKeyGuard, eaIngestRateLimiter);

router.get('/ping', asyncHandler(ingestController.ping));
router.post('/account-info', validateBody(accountInfoSchema), asyncHandler(ingestController.accountInfo));
router.post('/trades', validateBody(tradesBatchSchema), asyncHandler(ingestController.tradesBatch));
router.post('/trade', validateBody(singleTradeSchema), asyncHandler(ingestController.singleTrade));

export default router;
