import { isValidObjectId } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { findOrderForBuyer } from '../handover/buyer.auth';
import { notifyEscalation } from '../notifications/notification.service';
import { processRelease } from '../payouts/payout.service';
import { issueRefund } from '../refunds/refund.service';
import { toKobo } from '../transactions/transaction.fees';
import { Transaction } from '../transactions/transaction.model';
import { getTransaction, transitionStatus } from '../transactions/transaction.service';
import type { TransactionStatus } from '../transactions/transaction.states';
import { signUpload } from '../uploads/upload.service';
import { DisputeNote } from './dispute.note.model';

export async function raiseDispute(
    reference: string,
    buyerToken: string,
    input: { reason: string; description: string; evidence: string[] }
) {
    const txn = await findOrderForBuyer(reference, buyerToken);
    if (!['in_transit', 'delivered'].includes(txn.status)) {
        throw new AppError(400, 'A dispute can only be opened on an order that has shipped and is not yet confirmed', 'NOT_DISPUTABLE');
    }
    const updated = await transitionStatus(txn.id, txn.status as TransactionStatus, 'disputed', 'Dispute opened by buyer', {
        'dispute.raisedAt': new Date(),
        'dispute.reason': input.reason,
        'dispute.description': input.description,
        'dispute.evidence': input.evidence,
        'dispute.status': 'open',
    });
    return { status: updated.status };
}

export async function respondToDispute(
    id: string,
    vendorId: string,
    input: { response: string; evidence: string[] }
) {
    const txn = await getTransaction(id, { id: vendorId, role: 'vendor' });
    if (txn.status !== 'disputed' || txn.dispute?.status !== 'open') {
        throw new AppError(400, 'There is no open dispute on this order', 'NO_OPEN_DISPUTE');
    }
    return Transaction.findOneAndUpdate(
        { _id: txn._id, status: 'disputed' },
        { $set: { 'dispute.vendorResponse': input.response, 'dispute.vendorEvidence': input.evidence } },
        { new: true }
    );
}

export async function listDisputes(status: 'open' | 'resolved', page: number, limit: number) {
    const filter = { 'dispute.status': status };
    const [items, total] = await Promise.all([
        Transaction.find(filter)
            .sort({ 'dispute.raisedAt': 1 }) // oldest first
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('vendor', 'name businessName phone'),
        Transaction.countDocuments(filter),
    ]);
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function resolveDispute(
    id: string,
    adminId: string,
    input: {
        resolution: 'refund_full' | 'refund_keep_delivery' | 'release_full' | 'split';
        vendorAmount?: number;
        mediatorNotes: string;
        confirmedLegalOutcome?: boolean;
    }
) {
    const txn = await Transaction.findById(id);
    if (!txn || txn.status !== 'disputed' || txn.dispute?.status !== 'open') {
        throw new AppError(400, 'There is no open dispute on this order', 'NO_OPEN_DISPUTE');
    }

    if (txn.dispute?.escalated && !input.confirmedLegalOutcome) {
        throw new AppError(
            400,
            'This dispute is on legal hold. Confirm you have the legal outcome before applying a decision.',
            'LEGAL_HOLD'
        );
    }

    // vendorShare = the part of the buyer's payment the vendor gets (before our fee)
    let vendorShare: number;
    if (input.resolution === 'release_full') vendorShare = txn.totalAmount;
    else if (input.resolution === 'refund_full') vendorShare = 0;
    else if (input.resolution === 'refund_keep_delivery') vendorShare = txn.deliveryFee;
    else vendorShare = toKobo(input.vendorAmount as number);

    if (vendorShare < 0 || vendorShare > txn.totalAmount) {
        throw new AppError(400, 'The vendor amount cannot be more than what the buyer paid', 'BAD_AMOUNT');
    }
    if (input.resolution === 'split' && (vendorShare === 0 || vendorShare === txn.totalAmount)) {
        throw new AppError(400, 'A split must give both sides something. Use refund_full or release_full instead.', 'BAD_SPLIT');
    }

    const buyerRefund = txn.totalAmount - vendorShare;
    // Our fee is scaled to the vendor's share, so it is never charged on money that goes back to the buyer
    const platformFee =
        vendorShare === 0 ? 0 : vendorShare === txn.totalAmount ? txn.platformFee : Math.round((txn.platformFee * vendorShare) / txn.totalAmount);
    const vendorPayout = vendorShare - platformFee;

    const disputeFields = {
        'dispute.status': 'resolved',
        'dispute.resolution': input.resolution,
        'dispute.mediatorNotes': input.mediatorNotes,
        'dispute.resolvedAt': new Date(),
        'dispute.resolvedBy': adminId,
    };
    const note = `Dispute resolved: ${input.resolution}`;

    if (buyerRefund === 0) {
        await transitionStatus(txn.id, 'disputed', 'release_pending', note, disputeFields);
        try {
            await processRelease(txn.id);
        } catch (err) {
            console.error(`Release failed for ${txn.reference}`, err); // the retry endpoint recovers it
        }
    } else {
        await transitionStatus(txn.id, 'disputed', 'refund_pending', note, {
            ...disputeFields,
            refundAmount: buyerRefund,
            platformFee,
            vendorPayout,
            refundThenRelease: vendorShare > 0,
        });
        await issueRefund(txn.id);
    }
    return Transaction.findById(txn.id);
}

export async function buyerUploadSignature(reference: string, buyerToken: string) {
    const txn = await findOrderForBuyer(reference, buyerToken);
    if (!['in_transit', 'delivered'].includes(txn.status)) {
        throw new AppError(400, 'Photos can only be added when opening a dispute', 'NOT_DISPUTABLE');
    }
    return signUpload(txn.reference);
}

export async function vendorUploadSignature(id: string, vendorId: string) {
    const txn = await getTransaction(id, { id: vendorId, role: 'vendor' });
    if (txn.status !== 'disputed' || txn.dispute?.status !== 'open') {
        throw new AppError(400, 'There is no open dispute on this order', 'NO_OPEN_DISPUTE');
    }
    return signUpload(txn.reference);
}

async function findOpenDispute(id: string) {
    if (!isValidObjectId(id)) throw new AppError(404, 'Transaction not found');
    const txn = await Transaction.findById(id);
    if (!txn) throw new AppError(404, 'Transaction not found');
    if (txn.status !== 'disputed' || txn.dispute?.status !== 'open') {
        throw new AppError(400, 'There is no open dispute on this order', 'NO_OPEN_DISPUTE');
    }
    return txn;
}

export async function listNotes(id: string) {
    if (!isValidObjectId(id)) throw new AppError(404, 'Transaction not found');
    return DisputeNote.find({ transaction: id }).sort({ createdAt: 1 }).populate('author', 'name');
}

export async function addNote(id: string, adminId: string, text: string) {
    const txn = await findOpenDispute(id);
    return DisputeNote.create({ transaction: txn._id, author: adminId, kind: 'note', text });
}

export async function escalate(id: string, adminId: string, reason: string) {
    const txn = await findOpenDispute(id);
    if (txn.dispute?.escalated) throw new AppError(400, 'This dispute is already escalated', 'ALREADY_ESCALATED');

    const updated = await Transaction.findOneAndUpdate(
        { _id: txn._id, status: 'disputed', 'dispute.escalated': { $ne: true } },
        { $set: { 'dispute.escalated': true, 'dispute.escalatedAt': new Date() } },
        { new: true }
    );
    if (!updated) throw new AppError(409, 'This dispute was just updated. Refresh and try again.', 'STATE_CONFLICT');

    await DisputeNote.create({ transaction: txn._id, author: adminId, kind: 'escalated', text: reason });
    void notifyEscalation(updated).catch((err) => console.error('[notify] escalation failed', err));
    return updated;
}

export async function deescalate(id: string, adminId: string, reason: string) {
    const txn = await findOpenDispute(id);
    if (!txn.dispute?.escalated) throw new AppError(400, 'This dispute is not escalated', 'NOT_ESCALATED');

    const updated = await Transaction.findOneAndUpdate(
        { _id: txn._id, status: 'disputed', 'dispute.escalated': true },
        { $set: { 'dispute.escalated': false }, $unset: { 'dispute.escalatedAt': 1 } },
        { new: true }
    );
    if (!updated) throw new AppError(409, 'This dispute was just updated. Refresh and try again.', 'STATE_CONFLICT');

    await DisputeNote.create({ transaction: txn._id, author: adminId, kind: 'deescalated', text: reason });
    return updated;
}

// What a buyer may see about their own dispute (never the admin's internal notes)
export async function buyerDisputeView(reference: string, buyerToken: string) {
    const txn = await findOrderForBuyer(reference, buyerToken);
    const d = txn.dispute;
    if (!d?.status) throw new AppError(404, 'There is no dispute on this order', 'NO_DISPUTE');
    return {
        status: d.status,
        reason: d.reason,
        description: d.description,
        evidence: d.evidence ?? [],
        raisedAt: d.raisedAt,
        vendorResponse: d.vendorResponse ?? null,
        vendorEvidence: d.vendorEvidence ?? [],
        escalated: Boolean(d.escalated),
        resolution: d.resolution ?? null,
        mediatorNotes: d.mediatorNotes ?? null,
        resolvedAt: d.resolvedAt ?? null,
        refundAmount: txn.refundAmount ?? 0,
    };
}