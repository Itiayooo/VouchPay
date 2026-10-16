import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as controller from './auth.controller';
import { loginSchema, refreshSchema, registerSchema, updateProfileSchema } from './auth.schema';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts, try again later' },
});

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/refresh', authLimiter, validate(refreshSchema), controller.refresh);
router.get('/me', authenticate, controller.me);
router.put('/profile', authenticate, validate(updateProfileSchema), controller.updateProfile);
router.post('/logout', authenticate, controller.logout);

export default router;