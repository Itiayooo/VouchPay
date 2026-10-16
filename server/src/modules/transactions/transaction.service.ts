import { isValidObjectId } from 'mongoose';
import { AppError } from '../../utils/AppError';
import { calculateAmounts, toKobo } from './transaction.fees';
import { Transaction, generateReference } from './transaction.model';
import { TRANSACTION_STATUSES, TransactionStatus, canTransition } from './transaction.states';
import { CreateTransactionInput } from './transaction.schema';
import { Vendor } from '../vendors/vendor.model';

export async function createTransaction(vendorId: string, input: CreateTransactionInput) {

    const vendor = await Vendor.findById(vendorId);
    if (!vendor?.paystackRecipientCode) {
        throw new AppError(400, 'Add your bank account before creating escrow links', 'NO_BANK_ACCOUNT');
    }

    const itemAmount = toKobo(input.itemAmount);
    const deliveryFee = toKobo(input.deliveryFee);
    const amounts = calculateAmounts(itemAmount, deliveryFee);
    const now = new Date();

    for (let attempt = 0; attempt < 3; attempt++) {
        const reference = generateReference();
        try {
            return await Transaction.create({
                reference,
                vendor: vendorId,
                payoutRecipientCode: vendor.paystackRecipientCode,
                buyer: input.buyer,
                itemDescription: input.itemDescription,
                itemAmount,
                deliveryFee,
                ...amounts,
                deliveryType: input.deliveryType,
                dispatchWindowDays: input.dispatchWindowDays,
                autoReleaseHours: input.deliveryType === 'local' ? 72 : 120,
                escrowLink: `${process.env.CLIENT_URL}/pay/${reference}`,
                notes: input.notes,
                paymentExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
                statusHistory: [{ status: 'pending_payment', at: now }],
            });
        } catch (err: any) {
            if (err?.code !== 11000) throw err; // only retry on a duplicate reference
        }
    }
    throw new AppError(500, 'Could not generate a unique reference, try again');
}

export async function listTransactions(
    vendorId: string,
    opts: { page: number; limit: number; status?: string; search?: string }
) {
    const filter: Record<string, any> = { vendor: vendorId };
    if (opts.status && (TRANSACTION_STATUSES as readonly string[]).includes(opts.status)) {
        filter.status = opts.status;
    }
    if (opts.search) {
        const rx = new RegExp(opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ reference: rx }, { 'buyer.name': rx }, { itemDescription: rx }];
    }

    const [items, total] = await Promise.all([
        Transaction.find(filter)
            .sort({ createdAt: -1 })
            .skip((opts.page - 1) * opts.limit)
            .limit(opts.limit),
        Transaction.countDocuments(filter),
    ]);

    return { items, page: opts.page, limit: opts.limit, total, totalPages: Math.ceil(total / opts.limit) };
}

export async function getTransaction(id: string, requester: { id: string; role: string }) {
    if (!isValidObjectId(id)) throw new AppError(404, 'Transaction not found');
    const txn = await Transaction.findById(id);
    const isOwner = txn && String(txn.vendor) === requester.id;
    if (!txn || (!isOwner && requester.role !== 'admin')) {
        throw new AppError(404, 'Transaction not found');
    }
    return txn;
}

// What the buyer is allowed to see (no fees or payout figures)
export async function getPublicByReference(reference: string) {
    const txn = await Transaction.findOne({ reference: reference.toUpperCase() })
        .populate('vendor', 'businessName verified rating instagramHandle')
        .select('-statusHistory -platformFee -vendorPayout -notes -payoutRecipientCode -payoutReference -payoutFailureReason -transferCode');
    if (!txn) throw new AppError(404, 'Transaction not found');
    return txn;
}

export async function cancelUnpaid(id: string, vendorId: string) {
    const txn = await getTransaction(id, { id: vendorId, role: 'vendor' });
    if (txn.status !== 'pending_payment') {
        throw new AppError(
            400,
            'Only unpaid transactions can be cancelled here. Paid orders are refunded through the refund flow.',
            'NOT_CANCELLABLE'
        );
    }
    return transitionStatus(txn.id, 'pending_payment', 'cancelled', 'Cancelled by vendor', {
        cancelledAt: new Date(),
    });
}

// The only place status should ever change. The "from" check makes it
// safe against double clicks, retries and webhook races.
export async function transitionStatus(
    id: string,
    from: TransactionStatus,
    to: TransactionStatus,
    note?: string,
    extra: Record<string, unknown> = {},
    unset: Record<string, 1> = {}
) {
    if (!canTransition(from, to)) {
        throw new AppError(409, `Cannot move from ${from} to ${to}`, 'INVALID_TRANSITION');
    }
    const update: Record<string, unknown> = {
        $set: { status: to, ...extra },
        $push: { statusHistory: { status: to, at: new Date(), note } },
    };
    if (Object.keys(unset).length) update.$unset = unset;

    const updated = await Transaction.findOneAndUpdate({ _id: id, status: from }, update, { new: true });
    if (!updated) {
        throw new AppError(409, 'This transaction was just updated. Refresh and try again.', 'STATE_CONFLICT');
    }
    return updated;
}