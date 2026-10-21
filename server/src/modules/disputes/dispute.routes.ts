import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as controller from './dispute.controller';
import {
    escalateSchema,
    messageSchema,
    noteSchema,
    raiseDisputeSchema,
    resolveDisputeSchema,
    respondDisputeSchema,
} from './dispute.schema';

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
router.get('/buyer/:reference', controller.buyerView);
router.post('/buyer/:reference/upload-signature', limiter, controller.buyerUploadSignature);
router.get('/buyer/:reference/messages', controller.buyerMessages);
router.post('/buyer/:reference/messages', limiter, validate(messageSchema), controller.buyerPostMessage);

// Everything below needs a login
router.use(authenticate);
router.post('/:id/respond', validate(respondDisputeSchema), controller.respond);
router.post('/:id/upload-signature', controller.vendorUploadSignature);
router.get('/:id/messages', controller.messages);
router.post('/:id/messages', validate(messageSchema), controller.postMessage);
router.get('/', requireRole('admin'), controller.list);
router.post('/:id/resolve', requireRole('admin'), validate(resolveDisputeSchema), controller.resolve);
router.get('/:id/notes', requireRole('admin'), controller.notes);
router.post('/:id/notes', requireRole('admin'), validate(noteSchema), controller.addNote);
router.post('/:id/escalate', requireRole('admin'), validate(escalateSchema), controller.escalate);
router.post('/:id/deescalate', requireRole('admin'), validate(noteSchema), controller.deescalate);

export default router;