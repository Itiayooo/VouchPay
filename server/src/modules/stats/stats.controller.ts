import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './stats.service';

export const vendor = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await service.vendorStats(req.vendor!.id) });
});

export const admin = asyncHandler(async (_req, res) => {
    res.json({ success: true, data: await service.adminStats() });
});