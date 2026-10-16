import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import * as controller from './refund.controller';

const router = Router();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts, try again later' },
});

// Buyer (no login; proves identity with the x-buyer-token header)
router.post('/buyer/:reference/cancel', limiter, controller.buyerCancel);

router.use(authenticate);
router.post('/:id/vendor-cancel', controller.vendorCancel);
router.post('/:id/retry', requireRole('admin'), controller.retry);

export default router;