import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.middleware';
import * as controller from './payment.controller';
import { initializePaymentSchema } from './payment.schema';

const router = Router();

const initLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts, try again later' },
});

router.post('/initialize', initLimiter, validate(initializePaymentSchema), controller.initialize);
router.get('/verify/:reference', controller.verify);
router.post('/webhook', controller.webhook);

export default router;