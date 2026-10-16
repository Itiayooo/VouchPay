import { asyncHandler } from '../../utils/asyncHandler';
import * as service from './transaction.service';

export const create = asyncHandler(async (req, res) => {
    const transaction = await service.createTransaction(req.vendor!.id, req.body);
    res.status(201).json({ success: true, data: { transaction } });
});

export const list = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

    const data = await service.listTransactions(req.vendor!.id, { page, limit, status, search });
    res.json({ success: true, data });
});

export const getOne = asyncHandler(async (req, res) => {
    const transaction = await service.getTransaction(String(req.params.id), {
        id: req.vendor!.id,
        role: req.vendor!.role,
    });
    res.json({ success: true, data: { transaction } });
});

export const getByReference = asyncHandler(async (req, res) => {
    const transaction = await service.getPublicByReference(String(req.params.reference));
    res.json({ success: true, data: { transaction } });
});

export const cancel = asyncHandler(async (req, res) => {
    const transaction = await service.cancelUnpaid(String(req.params.id), req.vendor!.id);
    res.json({ success: true, data: { transaction } });
});