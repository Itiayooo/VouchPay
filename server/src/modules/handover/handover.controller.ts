import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './handover.service';

export const ship = asyncHandler(async (req, res) => {
    const data = await service.shipOrder(String(req.params.id), req.vendor!.id);
    res.json({ success: true, data });
});

export const regenerateLink = asyncHandler(async (req, res) => {
    const data = await service.regenerateLink(String(req.params.id), req.vendor!.id);
    res.json({ success: true, data });
});

export const buyerView = asyncHandler(async (req, res) => {
    const token = req.headers['x-buyer-token'];
    const data = await service.getBuyerHandover(String(req.params.reference), typeof token === 'string' ? token : '');
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data });
});

export const confirm = asyncHandler(async (req, res) => {
    const data = await service.confirmHandover(String(req.params.scanToken), req.body);
    res.json({ success: true, data });
});