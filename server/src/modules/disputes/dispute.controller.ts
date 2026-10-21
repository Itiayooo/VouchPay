import { asyncHandler } from '../../utils/asyncHandler';
import { tokenFrom } from '../handover/buyer.auth';
import * as service from './dispute.service';
import * as thread from './dispute.thread.service';

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

export const buyerView = asyncHandler(async (req, res) => {
    const data = await service.buyerDisputeView(String(req.params.reference), tokenFrom(req));
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data });
});

export const notes = asyncHandler(async (req, res) => {
    res.json({ success: true, data: { notes: await service.listNotes(String(req.params.id)) } });
});

export const addNote = asyncHandler(async (req, res) => {
    await service.addNote(String(req.params.id), req.vendor!.id, req.body.text);
    res.status(201).json({ success: true });
});

export const escalate = asyncHandler(async (req, res) => {
    await service.escalate(String(req.params.id), req.vendor!.id, req.body.reason);
    res.json({ success: true });
});

export const deescalate = asyncHandler(async (req, res) => {
    await service.deescalate(String(req.params.id), req.vendor!.id, req.body.text);
    res.json({ success: true });
});

export const buyerMessages = asyncHandler(async (req, res) => {
    const messages = await thread.buyerMessages(String(req.params.reference), tokenFrom(req));
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: { messages } });
});

export const buyerPostMessage = asyncHandler(async (req, res) => {
    await thread.buyerPost(String(req.params.reference), tokenFrom(req), req.body);
    res.status(201).json({ success: true });
});

export const messages = asyncHandler(async (req, res) => {
    const list = await thread.partyMessages(String(req.params.id), { id: req.vendor!.id, role: req.vendor!.role });
    res.json({ success: true, data: { messages: list } });
});

export const postMessage = asyncHandler(async (req, res) => {
    await thread.partyPost(String(req.params.id), { id: req.vendor!.id, role: req.vendor!.role }, req.body);
    res.status(201).json({ success: true });
});