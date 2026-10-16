import { asyncHandler } from '../../utils/asyncHandler';
import { tokenFrom } from '../handover/buyer.auth';
import * as service from './refund.service';

export const buyerCancel = asyncHandler(async (req, res) => {
    const transaction = await service.buyerCancel(String(req.params.reference), tokenFrom(req));
    res.json({ success: true, data: { status: transaction?.status } });
});

export const vendorCancel = asyncHandler(async (req, res) => {
    const transaction = await service.vendorCancel(String(req.params.id), req.vendor!.id);
    res.json({ success: true, data: { transaction } });
});

export const retry = asyncHandler(async (req, res) => {
    const transaction = await service.retryRefund(String(req.params.id));
    res.json({ success: true, data: { transaction } });
});