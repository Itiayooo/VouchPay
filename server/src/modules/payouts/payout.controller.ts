import { asyncHandler } from '../../utils/asyncHandler';
import * as bank from './bank.service';

export const banks = asyncHandler(async (_req, res) => {
    res.json({ success: true, data: { banks: await bank.getBanks() } });
});

export const resolve = asyncHandler(async (req, res) => {
    const data = await bank.resolveAccount(req.body.accountNumber, req.body.bankCode);
    res.json({ success: true, data });
});

export const saveBank = asyncHandler(async (req, res) => {
    const vendor = await bank.saveBankAccount(req.vendor!.id, req.body);
    res.json({ success: true, data: { vendor } });
});