import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './payment.service';
import { isValidSignature } from './paystack.service';
import { handleTransferWebhook } from '../payouts/payout.service';

export const initialize = asyncHandler(async (req, res) => {
    const data = await service.initializePayment(req.body.reference, req.body.email);
    res.json({ success: true, data });
});

export const verify = asyncHandler(async (req, res) => {
    const data = await service.verifyPayment(String(req.params.reference));
    res.json({ success: true, data });
});

export const webhook = asyncHandler(async (req, res) => {
    const signature = req.headers['x-paystack-signature'];
    if (!req.rawBody || !isValidSignature(req.rawBody, typeof signature === 'string' ? signature : undefined)) {
        throw new AppError(401, 'Invalid signature');
    }
    const event = req.body;
    if (event.event === 'charge.success') {
        await service.confirmFunding(event.data);
    }
    if (typeof event.event === 'string' && event.event.startsWith('transfer.')) {
        await handleTransferWebhook(event.event, event.data);
    }
    res.sendStatus(200);
});