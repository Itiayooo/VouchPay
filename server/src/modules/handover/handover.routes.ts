import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.middleware';
import * as controller from './handover.controller';
import { confirmHandoverSchema } from './handover.schema';

const router = Router();

const scanLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts, slow down' },
});

router.get('/buyer/:reference', controller.buyerView);
router.post('/:scanToken/confirm', scanLimiter, validate(confirmHandoverSchema), controller.confirm);
router.post('/buyer/:reference/confirm', scanLimiter, controller.buyerConfirm);

export default router;