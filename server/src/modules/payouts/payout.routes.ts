import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as controller from './payout.controller';
import { resolveAccountSchema, saveBankAccountSchema } from './payout.schema';

const router = Router();

const bankLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts, try again later' },
});

router.use(authenticate);
router.get('/banks', controller.banks);
router.post('/resolve', bankLimiter, validate(resolveAccountSchema), controller.resolve);
router.put('/bank-account', bankLimiter, validate(saveBankAccountSchema), controller.saveBank);
app.use('/api/payouts', payoutRoutes);

export default router;