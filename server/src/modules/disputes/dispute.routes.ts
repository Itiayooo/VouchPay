import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as controller from './dispute.controller';
import { raiseDisputeSchema, resolveDisputeSchema, respondDisputeSchema } from './dispute.schema';

const router = Router();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts, try again later' },
});

// Buyer (no login; proves identity with the x-buyer-token header)
router.post('/buyer/:reference', limiter, validate(raiseDisputeSchema), controller.raise);
router.post('/buyer/:reference/upload-signature', limiter, controller.buyerUploadSignature);

// Everything below needs a login
router.use(authenticate);
router.post('/:id/respond', validate(respondDisputeSchema), controller.respond);
router.post('/:id/upload-signature', controller.vendorUploadSignature);
router.get('/', requireRole('admin'), controller.list);
router.post('/:id/resolve', requireRole('admin'), validate(resolveDisputeSchema), controller.resolve);

export default router;