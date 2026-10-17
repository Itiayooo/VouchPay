import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import * as controller from './stats.controller';

const router = Router();

router.use(authenticate);
router.get('/vendor', controller.vendor);
router.get('/admin', requireRole('admin'), controller.admin);

export default router;