import { isValidObjectId } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { findOrderForBuyer } from '../handover/buyer.auth';
import { notifyDisputeMessage } from '../notifications/notification.service';
import { Transaction, type ITransactionDocument } from '../transactions/transaction.model';
import { getTransaction } from '../transactions/transaction.service';
import { DisputeMessage } from './dispute.message.model';

type Role = 'buyer' | 'vendor' | 'admin';
interface Input {
    text: string;
    evidence: string[];
    isQuestion?: boolean;
}

const MAX_PER_WINDOW = 10;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TOTAL = 200;

function assertDispute(txn: ITransactionDocument) {
    if (!txn.dispute?.status) throw new AppError(404, 'There is no dispute on this order', 'NO_DISPUTE');
}

const list = (id: string) => DisputeMessage.find({ transaction: id }).sort({ createdAt: 1 });

async function loadFor(id: string, requester: { id: string; role: string }) {
    if (!isValidObjectId(id)) throw new AppError(404, 'Transaction not found');
    if (requester.role === 'admin') {
        const txn = await Transaction.findById(id);
        if (!txn) throw new AppError(404, 'Transaction not found');
        return txn;
    }
    return getTransaction(id, requester); // sellers can only reach their own orders
}

async function post(txn: ITransactionDocument, role: Role, authorId: string | undefined, input: Input) {
    assertDispute(txn);
    if (txn.status !== 'disputed' || txn.dispute?.status !== 'open') {
        throw new AppError(400, 'This dispute is closed, so the conversation is locked', 'THREAD_LOCKED');
    }

    const [recent, total] = await Promise.all([
        DisputeMessage.countDocuments({
            transaction: txn._id,
            authorRole: role,
            createdAt: { $gt: new Date(Date.now() - WINDOW_MS) },
        }),
        DisputeMessage.countDocuments({ transaction: txn._id }),
    ]);
    if (recent >= MAX_PER_WINDOW) {
        throw new AppError(429, 'You are sending messages too quickly. Wait a few minutes and try again.', 'TOO_MANY');
    }
    if (total >= MAX_TOTAL) {
        throw new AppError(429, 'This conversation is full. Please wait for the mediator.', 'THREAD_FULL');
    }

    const msg = await DisputeMessage.create({
        transaction: txn._id,
        authorRole: role,
        author: authorId,
        text: input.text,
        evidence: input.evidence,
        isQuestion: role === 'admin' && Boolean(input.isQuestion),
    });
    void notifyDisputeMessage(txn, msg).catch((err) => console.error('[notify] dispute message failed', err));
    return msg;
}

export async function buyerMessages(reference: string, buyerToken: string) {
    const txn = await findOrderForBuyer(reference, buyerToken);
    assertDispute(txn);
    return list(txn.id);
}

export async function buyerPost(reference: string, buyerToken: string, input: Input) {
    const txn = await findOrderForBuyer(reference, buyerToken);
    return post(txn, 'buyer', undefined, input);
}

export async function partyMessages(id: string, requester: { id: string; role: string }) {
    const txn = await loadFor(id, requester);
    assertDispute(txn);
    return list(txn.id);
}

export async function partyPost(id: string, requester: { id: string; role: string }, input: Input) {
    const txn = await loadFor(id, requester);
    return post(txn, requester.role === 'admin' ? 'admin' : 'vendor', requester.id, input);
}