import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as controller from './transaction.controller';
import { createTransactionSchema } from './transaction.schema';
import * as handover from '../handover/handover.controller';

const router = Router();

// Public: the buyer's payment page looks the order up by reference
router.get('/ref/:reference', controller.getByReference);

router.use(authenticate);
router.post('/', validate(createTransactionSchema), controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.put('/:id/cancel', controller.cancel);
router.put('/:id/ship', handover.ship);
router.post('/:id/handover-link', handover.regenerateLink);

export default router;