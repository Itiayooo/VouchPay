import { asyncHandler } from '../../utils/asyncHandler';
import { tokenFrom } from '../handover/buyer.auth';
import * as service from './dispute.service';

export const raise = asyncHandler(async (req, res) => {
    const data = await service.raiseDispute(String(req.params.reference), tokenFrom(req), req.body);
    res.status(201).json({ success: true, data });
});

export const respond = asyncHandler(async (req, res) => {
    const transaction = await service.respondToDispute(String(req.params.id), req.vendor!.id, req.body);
    res.json({ success: true, data: { transaction } });
});

export const list = asyncHandler(async (req, res) => {
    const status = req.query.status === 'resolved' ? 'resolved' : 'open';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    res.json({ success: true, data: await service.listDisputes(status, page, limit) });
});

export const resolve = asyncHandler(async (req, res) => {
    const transaction = await service.resolveDispute(String(req.params.id), req.vendor!.id, req.body);
    res.json({ success: true, data: { transaction } });
});

export const buyerUploadSignature = asyncHandler(async (req, res) => {
    const data = await service.buyerUploadSignature(String(req.params.reference), tokenFrom(req));
    res.json({ success: true, data });
});

export const vendorUploadSignature = asyncHandler(async (req, res) => {
    const data = await service.vendorUploadSignature(String(req.params.id), req.vendor!.id);
    res.json({ success: true, data });
});